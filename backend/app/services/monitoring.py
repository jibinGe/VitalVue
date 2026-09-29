"""Measurement schedules for 4G watches: one default for every patient, optional per-patient
overrides (set by a doctor or admin), converted into Veepoo CB / CA commands."""
import hashlib
import json
import math
from datetime import datetime
from typing import Optional

from sqlalchemy import select

from app.models.device import Device, DeviceConfigState, MonitoringProfile
from app.mqtt.protocol import AutoMeasureRecord

# Schedule field → Veepoo CB function
VITAL_FIELDS = {
    "hr": "hr_interval_min",
    "bp": "bp_interval_min",
    "spo2": "spo2_interval_min",
    "temp": "temp_interval_min",
    "hrv": "hrv_interval_min",
    "stress": "stress_interval_min",
}
PROFILE_FIELDS = list(VITAL_FIELDS.values()) + ["upload_interval_min", "window_start", "window_end"]
MIN_INTERVAL, MAX_INTERVAL = 1, 1440
COMMAND_QUEUE = "mqtt:commands"      # Redis list the mqtt-worker consumes


def profile_dict(p: MonitoringProfile) -> dict:
    return {f: getattr(p, f) for f in PROFILE_FIELDS}


def validate_profile(data: dict) -> dict:
    """Clean a submitted schedule. Raises ValueError with a readable message."""
    out = {}
    for vital, f in VITAL_FIELDS.items():
        v = data.get(f)
        if v in (None, "", 0):
            out[f] = None           # off
            continue
        v = int(v)
        if not MIN_INTERVAL <= v <= MAX_INTERVAL:
            raise ValueError(f"{vital} interval must be {MIN_INTERVAL}–{MAX_INTERVAL} minutes, or off")
        out[f] = v
    up = int(data.get("upload_interval_min") or 5)
    if not 1 <= up <= 255:
        raise ValueError("upload interval must be 1–255 minutes")
    out["upload_interval_min"] = up
    for f in ("window_start", "window_end"):
        v = data.get(f) or None
        if v is not None:
            h, m = (int(x) for x in str(v).split(":"))
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise ValueError(f"{f} must be HH:MM")
            v = f"{h:02d}:{m:02d}"
        out[f] = v
    if bool(out["window_start"]) != bool(out["window_end"]):
        raise ValueError("set both window start and end, or neither")
    return out


async def get_default_profile(db) -> MonitoringProfile:
    p = (await db.execute(select(MonitoringProfile).where(MonitoringProfile.patient_id.is_(None)))).scalar_one_or_none()
    if p is None:  # defensive: the migration seeds one
        p = MonitoringProfile(patient_id=None, hr_interval_min=5, bp_interval_min=60, spo2_interval_min=5,
                              temp_interval_min=30, hrv_interval_min=30, stress_interval_min=30, upload_interval_min=5)
        db.add(p)
        await db.flush()
    return p


async def get_patient_override(db, patient_id: int) -> Optional[MonitoringProfile]:
    return (await db.execute(select(MonitoringProfile).where(MonitoringProfile.patient_id == patient_id))).scalar_one_or_none()


async def effective_profile(db, patient_id: Optional[int]) -> tuple[dict, bool]:
    """(schedule, is_override) for a patient; the default when no override exists."""
    if patient_id is not None:
        override = await get_patient_override(db, patient_id)
        if override:
            return profile_dict(override), True
    return profile_dict(await get_default_profile(db)), False


def profile_hash(profile: dict) -> str:
    return hashlib.sha256(json.dumps(profile, sort_keys=True).encode()).hexdigest()


def _hm(value: Optional[str], fallback: tuple[int, int]) -> tuple[int, int]:
    if not value:
        return fallback
    h, m = value.split(":")
    return int(h), int(m)


def to_auto_measure_records(profile: dict, device_limits: Optional[dict] = None) -> list[AutoMeasureRecord]:
    """One CB record per vital. Intervals are rounded UP to the watch's minimum step (read back
    from the watch via E7); vitals the watch reported as unsupported are skipped."""
    limits = device_limits or {}
    start, end = _hm(profile.get("window_start"), (0, 0)), _hm(profile.get("window_end"), (23, 59))
    records = []
    for vital, f in VITAL_FIELDS.items():
        lim = limits.get(vital, {})
        if limits and not lim:
            continue                        # the watch didn't report this function
        interval = profile.get(f)
        step = max(1, int(lim.get("step_min") or 1))
        enabled = interval is not None
        interval = interval or lim.get("interval_min") or 30
        interval = max(step, math.ceil(interval / step) * step)
        records.append(AutoMeasureRecord(
            function=vital, enabled=enabled, interval_min=interval, step_min=step,
            window_start=start, window_end=end,
            supported_start=tuple(lim.get("supported_start", (0, 0))),
            supported_end=tuple(lim.get("supported_end", (23, 59))),
        ))
    return records


def limits_from_records(records) -> dict:
    """E7 read-back → {vital: {step_min, interval_min, enabled, supported_start/end, modifiable}}."""
    return {
        r.function: {
            "step_min": r.step_min, "interval_min": r.interval_min, "enabled": r.enabled,
            "supported_start": list(r.supported_start), "supported_end": list(r.supported_end),
            "slot_modifiable": r.slot_modifiable, "interval_modifiable": r.interval_modifiable,
        }
        for r in records if r.function in VITAL_FIELDS
    }


async def mark_pending(db, patient_id: Optional[int] = None) -> list[int]:
    """Flag the watches whose schedule changed (one patient, or everyone on the default).
    Returns their device ids — call notify_worker() with them AFTER committing."""
    stmt = select(Device).where(Device.is_active.is_(True), Device.patient_id.isnot(None))
    if patient_id is not None:
        stmt = stmt.where(Device.patient_id == patient_id)
    devices = (await db.execute(stmt)).scalars().all()
    if patient_id is None:
        overridden = set((await db.execute(
            select(MonitoringProfile.patient_id).where(MonitoringProfile.patient_id.isnot(None))
        )).scalars().all())
        devices = [d for d in devices if d.patient_id not in overridden]
    for d in devices:
        state = await db.get(DeviceConfigState, d.id)
        if state is None:
            state = DeviceConfigState(device_id=d.id)
            db.add(state)
        state.status, state.attempts, state.last_error = "pending", 0, None
        state.updated_at = datetime.utcnow()
    await db.flush()
    return [d.id for d in devices]


async def notify_worker(redis, device_ids: list[int]) -> None:
    """Ask the mqtt-worker to push the new schedule now (it also retries on its own)."""
    for device_id in device_ids:
        await redis.rpush(COMMAND_QUEUE, json.dumps({"type": "apply_config", "device_id": device_id}))
