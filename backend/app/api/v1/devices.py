"""Veepoo 4G watches: registration, patient assignment, monitoring schedules, live mode.

Schedules: one default for every patient (admins), optional per-patient override (doctors and
admins; nurses can view). Changes are delivered to the watch by the mqtt-worker.
"""
import json
import re
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import allow_admins, get_current_user
from app.core.config import settings
from app.core.security import get_password_hash
from app.database import get_db, get_redis
from app.models.device import DEVICE_4G, Device, DeviceAssignment, DeviceConfigState, MonitoringProfile
from app.models.user import Patient, User, UserRole
from app.services.access import can_view_patient
from app.services.monitoring import (
    COMMAND_QUEUE, PROFILE_FIELDS, effective_profile, get_default_profile, get_patient_override,
    mark_pending, notify_worker, profile_dict, validate_profile,
)

router = APIRouter()

ADMIN_ROLES = (UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN)
SCHEDULE_EDITORS = ADMIN_ROLES + (UserRole.DOCTOR,)
CLIENT_ID_RE = re.compile(r"^[0-9A-F]{12}_\d{1,5}$")


def _device_row(d: Device, state: Optional[DeviceConfigState] = None) -> dict:
    return {
        "id": d.id, "type": d.type, "client_id": d.client_id, "mac": d.mac, "device_number": d.device_number,
        "organization_id": d.organization_id, "patient_id": d.patient_id,
        "firmware": d.firmware, "hardware": d.hardware, "iccid": d.iccid, "capabilities": d.capabilities or {},
        "battery_percent": d.battery_percent, "battery_state": d.battery_state,
        "is_online": d.is_online, "last_seen_at": d.last_seen_at, "last_connected_at": d.last_connected_at,
        "duplicate_login_at": d.duplicate_login_at, "is_active": d.is_active,
        "config": {"status": state.status, "attempts": state.attempts, "last_sent_at": state.last_sent_at,
                   "applied_at": state.applied_at, "last_error": state.last_error,
                   "device_limits": state.device_limits or {}} if state else None,
    }


def _credentials(d: Device, password: str) -> dict:
    """Shown once — the watch is provisioned with these over BLE."""
    return {"host": settings.MQTT_PUBLIC_HOST, "port": settings.MQTT_PUBLIC_PORT, "tls": True,
            "client_id": d.client_id, "username": d.client_id, "password": password}


async def _patient_or_404(db, patient_id: int) -> Patient:
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


async def _require_patient_access(db, user: User, patient: Patient):
    if user.role in ADMIN_ROLES:
        if user.role == UserRole.ORG_ADMIN and patient.organization_id not in (None, user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized for this patient")
        return
    if user.role not in (UserRole.DOCTOR, UserRole.NURSE) or not await can_view_patient(db, user, patient):
        raise HTTPException(status_code=403, detail="Not authorized for this patient")


# ── Watches (admin) ─────────────────────────────────────────────────────────────────

class DeviceIn(BaseModel):
    client_id: Optional[str] = None       # MAC_DeviceNumber, e.g. F1F2F3F4F5F6_9999
    mac: Optional[str] = None             # or MAC + device number
    device_number: Optional[int] = None
    organization_id: Optional[int] = None


@router.post("", status_code=201, dependencies=[Depends(allow_admins)])
async def register_device(body: DeviceIn, db: AsyncSession = Depends(get_db)):
    client_id = body.client_id
    if not client_id and body.mac and body.device_number is not None:
        client_id = f"{body.mac.replace(':', '').upper()}_{body.device_number}"
    client_id = (client_id or "").upper()
    if not CLIENT_ID_RE.match(client_id):
        raise HTTPException(status_code=422, detail="client_id must be MAC_DeviceNumber, e.g. F1F2F3F4F5F6_9999")
    if (await db.execute(select(Device).where(Device.client_id == client_id))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A watch with this client_id is already registered")
    mac_hex, number = client_id.split("_")
    password = secrets.token_urlsafe(18)
    device = Device(type=DEVICE_4G, client_id=client_id, mac=":".join(mac_hex[i:i + 2] for i in range(0, 12, 2)),
                    device_number=int(number), mqtt_password_hash=get_password_hash(password),
                    organization_id=body.organization_id, capabilities={})
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return {"device": _device_row(device), "credentials": _credentials(device, password)}


@router.get("", dependencies=[Depends(allow_admins)])
async def list_devices(organization_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Device, DeviceConfigState).outerjoin(DeviceConfigState, DeviceConfigState.device_id == Device.id)
    if organization_id is not None:
        stmt = stmt.where(Device.organization_id == organization_id)
    rows = (await db.execute(stmt.order_by(Device.id))).all()
    return [_device_row(d, s) for d, s in rows]


@router.post("/{device_id}/reset-password", dependencies=[Depends(allow_admins)])
async def reset_device_password(device_id: int, db: AsyncSession = Depends(get_db)):
    device = await db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Watch not found")
    password = secrets.token_urlsafe(18)
    device.mqtt_password_hash = get_password_hash(password)
    await db.commit()
    return {"credentials": _credentials(device, password)}


@router.patch("/{device_id}/status", dependencies=[Depends(allow_admins)])
async def set_device_status(device_id: int, is_active: bool = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    device = await db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Watch not found")
    device.is_active = is_active    # an inactive watch is refused by the broker at next login
    await db.commit()
    return _device_row(device)


# ── Assignment (admin, doctor, nurse with access) ──────────────────────────────────

@router.get("/available")
async def available_devices(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Active 4G watches of the user's hospital that aren't worn by anyone (to link at the bedside)."""
    if user.role not in ADMIN_ROLES + (UserRole.DOCTOR, UserRole.NURSE):
        raise HTTPException(status_code=403, detail="Not authorized")
    stmt = select(Device).where(Device.is_active.is_(True), Device.patient_id.is_(None))
    if user.role != UserRole.MASTER_ADMIN:
        stmt = stmt.where(Device.organization_id == user.organization_id)
    return [_device_row(d) for d in (await db.execute(stmt.order_by(Device.client_id))).scalars()]


@router.post("/{device_id}/assign")
async def assign_device(device_id: int, patient_id: int = Body(..., embed=True),
                        db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
                        redis=Depends(get_redis)):
    device = await db.get(Device, device_id)
    if not device or not device.is_active:
        raise HTTPException(status_code=404, detail="Watch not found")
    patient = await _patient_or_404(db, patient_id)
    await _require_patient_access(db, user, patient)
    now = datetime.utcnow()
    # A watch is worn by one patient; a patient wears one 4G watch.
    for other in (await db.execute(select(Device).where(Device.patient_id == patient_id, Device.id != device.id))).scalars():
        other.patient_id = None
    open_rows = (await db.execute(select(DeviceAssignment).where(
        DeviceAssignment.unassigned_at.is_(None),
        (DeviceAssignment.device_id == device.id) | (DeviceAssignment.patient_id == patient_id)))).scalars().all()
    for row in open_rows:
        row.unassigned_at = now
    device.patient_id = patient_id
    db.add(DeviceAssignment(device_id=device.id, patient_id=patient_id, assigned_at=now, assigned_by=user.id))
    ids = await mark_pending(db, patient_id)          # push this patient's schedule to the watch
    await db.commit()
    await notify_worker(redis, ids)
    return _device_row(device)


@router.post("/{device_id}/unassign")
async def unassign_device(device_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    device = await db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Watch not found")
    if device.patient_id is not None:
        await _require_patient_access(db, user, await _patient_or_404(db, device.patient_id))
    for row in (await db.execute(select(DeviceAssignment).where(
            DeviceAssignment.device_id == device.id, DeviceAssignment.unassigned_at.is_(None)))).scalars():
        row.unassigned_at = datetime.utcnow()
    device.patient_id = None
    await db.commit()
    return _device_row(device)


# ── Default schedule (admin) ────────────────────────────────────────────────────────

@router.get("/monitoring/defaults", dependencies=[Depends(allow_admins)])
async def get_monitoring_defaults(db: AsyncSession = Depends(get_db)):
    return profile_dict(await get_default_profile(db))


@router.put("/monitoring/defaults")
async def set_monitoring_defaults(body: dict, db: AsyncSession = Depends(get_db),
                                  user: User = Depends(allow_admins), redis=Depends(get_redis)):
    try:
        clean = validate_profile(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    default = await get_default_profile(db)
    for k, v in clean.items():
        setattr(default, k, v)
    default.updated_by, default.updated_at = user.id, datetime.utcnow()
    ids = await mark_pending(db, None)                 # every patient without an override
    await db.commit()
    await notify_worker(redis, ids)
    return {**profile_dict(default), "watches_updating": len(ids)}


# ── Per-patient schedule (doctor or admin can change; nurse can view) ───────────────

async def _patient_schedule_response(db, patient_id: int) -> dict:
    profile, is_override = await effective_profile(db, patient_id)
    device = (await db.execute(select(Device).where(Device.patient_id == patient_id))).scalar_one_or_none()
    state = await db.get(DeviceConfigState, device.id) if device else None
    return {"patient_id": patient_id, "schedule": profile, "is_override": is_override,
            "default": profile_dict(await get_default_profile(db)),
            "device": _device_row(device, state) if device else None}


@router.get("/patients/{patient_id}/monitoring")
async def get_patient_monitoring(patient_id: int, db: AsyncSession = Depends(get_db),
                                 user: User = Depends(get_current_user)):
    await _require_patient_access(db, user, await _patient_or_404(db, patient_id))
    return await _patient_schedule_response(db, patient_id)


@router.put("/patients/{patient_id}/monitoring")
async def set_patient_monitoring(patient_id: int, body: dict, db: AsyncSession = Depends(get_db),
                                 user: User = Depends(get_current_user), redis=Depends(get_redis)):
    patient = await _patient_or_404(db, patient_id)
    await _require_patient_access(db, user, patient)
    if user.role not in SCHEDULE_EDITORS:
        raise HTTPException(status_code=403, detail="Only a doctor or an admin can change the schedule")
    try:
        clean = validate_profile(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    override = await get_patient_override(db, patient_id) or MonitoringProfile(patient_id=patient_id)
    if override.id is None:
        db.add(override)
    for k, v in clean.items():
        setattr(override, k, v)
    override.updated_by, override.updated_at = user.id, datetime.utcnow()
    ids = await mark_pending(db, patient_id)
    await db.commit()
    await notify_worker(redis, ids)
    return await _patient_schedule_response(db, patient_id)


@router.delete("/patients/{patient_id}/monitoring")
async def reset_patient_monitoring(patient_id: int, db: AsyncSession = Depends(get_db),
                                   user: User = Depends(get_current_user), redis=Depends(get_redis)):
    """Back to the default schedule."""
    patient = await _patient_or_404(db, patient_id)
    await _require_patient_access(db, user, patient)
    if user.role not in SCHEDULE_EDITORS:
        raise HTTPException(status_code=403, detail="Only a doctor or an admin can change the schedule")
    override = await get_patient_override(db, patient_id)
    if override:
        await db.delete(override)
    ids = await mark_pending(db, patient_id)
    await db.commit()
    await notify_worker(redis, ids)
    return await _patient_schedule_response(db, patient_id)


@router.post("/patients/{patient_id}/live")
async def set_patient_live_mode(patient_id: int, on: bool = Body(..., embed=True), db: AsyncSession = Depends(get_db),
                                user: User = Depends(get_current_user), redis=Depends(get_redis)):
    """C3 real-time mode: the watch streams HR, SpO₂ and temperature until switched off."""
    patient = await _patient_or_404(db, patient_id)
    await _require_patient_access(db, user, patient)
    if user.role not in SCHEDULE_EDITORS:
        raise HTTPException(status_code=403, detail="Only a doctor or an admin can start live mode")
    device = (await db.execute(select(Device).where(Device.patient_id == patient_id))).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="This patient has no 4G watch")
    await redis.rpush(COMMAND_QUEUE, json.dumps({"type": "realtime", "device_id": device.id, "on": on}))
    return {"patient_id": patient_id, "live": on, "device_online": device.is_online}
