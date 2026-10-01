"""4G watches (Veepoo over MQTT; Wonlex and CLOC BPW8 over TCP): registration, patient
assignment, monitoring schedules, live mode.

Schedules: one default for every patient (admins), optional per-patient override (doctors and
admins; nurses can view). Changes are delivered to the watch by the mqtt-worker (Veepoo) or the
device-gateway (TCP watches).
"""
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import allow_admins, get_current_user
from app.core.config import settings
from app.core.security import get_password_hash
from app.database import get_db, get_redis
from app.devices.registry import TYPES, get_type
from app.models.device import (
    DEVICE_4G, DEVICE_BPW8, Device, DeviceAssignment, DeviceConfigState, MonitoringProfile, MqttRawMessage,
)
from app.models.user import Patient, User, UserRole
from app.services.access import can_view_patient
from app.services.monitoring import (
    COMMAND_QUEUE, default_for_hospital, effective_profile_level, get_default_profile, get_hospital_default,
    get_patient_override, mark_pending, notify_worker, profile_dict, send_command, validate_profile,
)

router = APIRouter()

ADMIN_ROLES = (UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN)
SCHEDULE_EDITORS = ADMIN_ROLES + (UserRole.DOCTOR,)


MEASURE_EVERY_S = 120          # one measure-now per vital per watch every 2 minutes (battery)


def _device_row(d: Device, state: Optional[DeviceConfigState] = None) -> dict:
    dtype = TYPES.get(d.type)
    return {
        "id": d.id, "type": d.type, "type_label": dtype.label if dtype else d.type,
        "transport": d.transport, "client_id": d.client_id, "mac": d.mac, "device_number": d.device_number,
        "model": d.model, "sim_phone": d.sim_phone, "last_ip": d.last_ip,
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


def _tcp_setup(d: Device) -> dict:
    """How to point a TCP watch at the device-gateway (no password: these protocols have none)."""
    dtype = get_type(d.type)
    port = getattr(settings, dtype.port_setting)
    setup = {"type": d.type, "imei": d.client_id, "host": settings.GATEWAY_PUBLIC_HOST,
             "ip": settings.GATEWAY_PUBLIC_IP, "port": port}
    if d.type == DEVICE_BPW8:
        ip = settings.GATEWAY_PUBLIC_IP or "<server IP>"
        setup["sms"] = f"BY,SSAR,{ip},{port}"   # text this to the watch's SIM
    return setup


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
    type: str = DEVICE_4G                 # veepoo_4g | wonlex_4g | bpw8_4g
    client_id: Optional[str] = None       # Veepoo: MAC_DeviceNumber, e.g. F1F2F3F4F5F6_9999
    mac: Optional[str] = None             # or MAC + device number (Veepoo)
    device_number: Optional[int] = None
    imei: Optional[str] = None            # Wonlex / BPW8 (client_id is accepted too)
    organization_id: Optional[int] = None


@router.get("/types")
async def device_types(user: User = Depends(get_current_user)):
    """Every supported watch type and what it can do — drives the registration and schedule UI."""
    return [t.public() for t in TYPES.values()]


@router.post("", status_code=201, dependencies=[Depends(allow_admins)])
async def register_device(body: DeviceIn, db: AsyncSession = Depends(get_db)):
    try:
        dtype = get_type(body.type)
        raw = body.imei or body.client_id
        if dtype.key == DEVICE_4G and not raw and body.mac and body.device_number is not None:
            raw = f"{body.mac.replace(':', '').upper()}_{body.device_number}"
        client_id = dtype.validate_id(raw or "")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if (await db.execute(select(Device).where(Device.client_id == client_id))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"A watch with this {dtype.id_label} is already registered")

    if dtype.transport == "mqtt":
        mac_hex, number = client_id.split("_")
        password = secrets.token_urlsafe(18)
        device = Device(type=dtype.key, transport=dtype.transport, client_id=client_id, mac=":".join(mac_hex[i:i + 2] for i in range(0, 12, 2)),
                        device_number=int(number), mqtt_password_hash=get_password_hash(password),
                        organization_id=body.organization_id, capabilities={})
    else:
        device = Device(type=dtype.key, transport=dtype.transport, client_id=client_id,
                        organization_id=body.organization_id, capabilities={})
    db.add(device)
    await db.commit()
    await db.refresh(device)
    if dtype.transport == "mqtt":
        return {"device": _device_row(device), "credentials": _credentials(device, password)}
    return {"device": _device_row(device), "setup": _tcp_setup(device)}


@router.get("", dependencies=[Depends(allow_admins)])
async def list_devices(organization_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Device, DeviceConfigState).outerjoin(DeviceConfigState, DeviceConfigState.device_id == Device.id)
    if organization_id is not None:
        stmt = stmt.where(Device.organization_id == organization_id)
    rows = (await db.execute(stmt.order_by(Device.id))).all()
    # Frames refused or failing to parse in the last 24 h, per watch (one grouped query).
    problems = dict((await db.execute(
        select(MqttRawMessage.client_id, func.count())
        .where(MqttRawMessage.received_at >= datetime.utcnow() - timedelta(hours=24),
               MqttRawMessage.parse_status.in_(("rejected", "error")),
               MqttRawMessage.client_id.in_([d.client_id for d, _ in rows] or [""]))
        .group_by(MqttRawMessage.client_id)
    )).all())
    return [{**_device_row(d, s), "problem_frames_24h": problems.get(d.client_id, 0)} for d, s in rows]


@router.post("/{device_id}/reset-password", dependencies=[Depends(allow_admins)])
async def reset_device_password(device_id: int, db: AsyncSession = Depends(get_db)):
    device = await db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Watch not found")
    if get_type(device.type).transport != "mqtt":
        raise HTTPException(status_code=409, detail="This watch type has no password; it is identified by its IMEI")
    password = secrets.token_urlsafe(18)
    device.mqtt_password_hash = get_password_hash(password)
    await db.commit()
    return {"credentials": _credentials(device, password)}


@router.patch("/{device_id}/status", dependencies=[Depends(allow_admins)])
async def set_device_status(device_id: int, is_active: bool = Body(..., embed=True), db: AsyncSession = Depends(get_db),
                            redis=Depends(get_redis)):
    device = await db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Watch not found")
    device.is_active = is_active    # an inactive watch is refused at its next login
    await db.commit()
    if not is_active and device.transport == "tcp":
        await send_command(redis, device, {"type": "kick"})   # and a TCP watch is disconnected now
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
async def unassign_device(device_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
                          redis=Depends(get_redis)):
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
    if device.transport == "tcp":
        # The gateway stops its server-requested measurements and tells a Wonlex it's unbound.
        await send_command(redis, device, {"type": "apply_config"})
    return _device_row(device)


# ── Default schedules (admin): one per hospital, plus the global one ────────────────

def _default_target(user: User, organization_id: Optional[int]) -> Optional[int]:
    """Which default this admin is working on: an org admin only ever their own hospital's;
    a master admin the global one (None) or any hospital's."""
    if user.role == UserRole.ORG_ADMIN:
        if organization_id not in (None, user.organization_id):
            raise HTTPException(status_code=403, detail="You can only change your own hospital's schedule")
        if user.organization_id is None:
            raise HTTPException(status_code=403, detail="Your account isn't attached to a hospital")
        return user.organization_id
    return organization_id


async def _defaults_response(db, organization_id: Optional[int]) -> dict:
    profile, level = await default_for_hospital(db, organization_id)
    return {**profile_dict(profile), "organization_id": organization_id, "level": level,
            "inherited": organization_id is not None and level == "global",
            "global": profile_dict(await get_default_profile(db))}


@router.get("/monitoring/defaults")
async def get_monitoring_defaults(organization_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                                  user: User = Depends(allow_admins)):
    """The default schedule for a hospital (its own, or the global one it inherits), or the
    global default when no hospital is given (master admin)."""
    return await _defaults_response(db, _default_target(user, organization_id))


@router.put("/monitoring/defaults")
async def set_monitoring_defaults(body: dict, organization_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                                  user: User = Depends(allow_admins), redis=Depends(get_redis)):
    target = _default_target(user, organization_id)
    try:
        clean = validate_profile(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if target is None:
        row = await get_default_profile(db)
    else:
        row = await get_hospital_default(db, target)
        if row is None:
            row = MonitoringProfile(patient_id=None, organization_id=target)
            db.add(row)
    for k, v in clean.items():
        setattr(row, k, v)
    row.updated_by, row.updated_at = user.id, datetime.utcnow()
    await db.flush()
    targets = await mark_pending(db, organization_id=target, scope="global" if target is None else "hospital")
    await db.commit()
    await notify_worker(redis, targets)
    return {**await _defaults_response(db, target), "watches_updating": len(targets)}


@router.delete("/monitoring/defaults")
async def reset_monitoring_defaults(organization_id: Optional[int] = None, db: AsyncSession = Depends(get_db),
                                    user: User = Depends(allow_admins), redis=Depends(get_redis)):
    """Back to the global default for this hospital."""
    target = _default_target(user, organization_id)
    if target is None:
        raise HTTPException(status_code=422, detail="Choose a hospital; the global default can't be removed")
    row = await get_hospital_default(db, target)
    if row:
        await db.delete(row)
        await db.flush()
    targets = await mark_pending(db, organization_id=target, scope="hospital")
    await db.commit()
    await notify_worker(redis, targets)
    return {**await _defaults_response(db, target), "watches_updating": len(targets)}


# ── Per-patient schedule (doctor or admin can change; nurse can view) ───────────────

async def _patient_schedule_response(db, patient_id: int) -> dict:
    profile, level = await effective_profile_level(db, patient_id)
    patient = await db.get(Patient, patient_id)
    default, default_level = await default_for_hospital(db, patient.organization_id if patient else None)
    device = (await db.execute(select(Device).where(Device.patient_id == patient_id))).scalar_one_or_none()
    state = await db.get(DeviceConfigState, device.id) if device else None
    return {"patient_id": patient_id, "schedule": profile, "is_override": level == "patient", "level": level,
            "default": profile_dict(default), "default_level": default_level,
            "device": _device_row(device, state) if device else None,
            "device_type": TYPES[device.type].public() if device and device.type in TYPES else None}


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
    if not get_type(device.type).live_mode:
        raise HTTPException(status_code=409, detail="This watch can't stream live; use Measure now instead")
    await redis.rpush(COMMAND_QUEUE, json.dumps({"type": "realtime", "device_id": device.id, "on": on}))
    return {"patient_id": patient_id, "live": on, "device_online": device.is_online}


# ── Measure now and admin commands (TCP watches) ────────────────────────────────────

@router.post("/{device_id}/measure")
async def measure_now(device_id: int, vital: str = Body(..., embed=True), db: AsyncSession = Depends(get_db),
                      user: User = Depends(get_current_user), redis=Depends(get_redis)):
    """Ask the watch to take one reading now (doctor, nurse or admin with access to the patient)."""
    device = await db.get(Device, device_id)
    if not device or not device.is_active:
        raise HTTPException(status_code=404, detail="Watch not found")
    if device.patient_id is None:
        raise HTTPException(status_code=409, detail="Link the watch to a patient first")
    await _require_patient_access(db, user, await _patient_or_404(db, device.patient_id))
    dtype = get_type(device.type)
    if not dtype.limit(vital).requestable:
        can = ", ".join(v for v in dtype.public()["measure_now"]) or "nothing"
        raise HTTPException(status_code=422, detail=f"{dtype.label} can measure on request: {can}")
    if not device.is_online:
        raise HTTPException(status_code=409, detail="The watch is offline; it can't measure now")
    if not await redis.set(f"measure_lock:{device.id}:{vital}", "1", ex=MEASURE_EVERY_S, nx=True):
        raise HTTPException(status_code=429, detail="A measurement was just requested; try again in 2 minutes")
    await send_command(redis, device, {"type": "measure", "vital": vital})
    return {"device_id": device.id, "vital": vital, "requested": True}


@router.post("/{device_id}/command", dependencies=[Depends(allow_admins)])
async def device_command(device_id: int, action: str = Body(..., embed=True), db: AsyncSession = Depends(get_db),
                         redis=Depends(get_redis)):
    """Admin actions on a TCP watch: locate, reboot, or disconnect (it reconnects by itself)."""
    device = await db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Watch not found")
    if device.transport != "tcp":
        raise HTTPException(status_code=409, detail="These actions are for Wonlex and BPW8 watches")
    if action not in ("locate", "reboot", "disconnect"):
        raise HTTPException(status_code=422, detail="action must be locate, reboot or disconnect")
    if not device.is_online:
        raise HTTPException(status_code=409, detail="The watch is offline")
    await send_command(redis, device, {"type": "kick" if action == "disconnect" else action})
    return {"device_id": device.id, "action": action, "sent": True}
