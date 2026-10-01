"""DeviceCore: what VitalVue does with canonical device events, whatever the watch.

Vitals go through the shared ingest pipeline (app.services.ingest), so NEWS2, alerts, the
live stream, push and the online heartbeat behave as for BLE bands and Veepoo watches. Alarms
(SOS, fall, low battery, power off) are raised here for every 4G watch type.
"""
import asyncio
import json
import logging
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.devices import events as ev
from app.devices.registry import DeviceType
from app.models.clinical import Alert
from app.models.device import Device, DeviceMessageKey
from app.models.organization import Bed, Room
from app.models.user import Patient
from app.schemas.vitals import VitalIngestSchema
from app.services.ingest import ingest_readings
from app.services.push import send_critical_push, staff_tokens_for_patient

log = logging.getLogger("devices.core")

# Alarm kind → alert shown through the normal (station-routed) alert path.
EVENT_ALERTS = {
    "fall": ("Fall", "Fall detected", "critical"),
    "sos": ("SOS", "SOS pressed", "critical"),
    "low_battery": ("Band Battery", "Battery low", "medium"),
    "power_off": ("Band Status", "Watch switched off", "high"),
}

# Readings outside these ranges are sensor errors, not patients (value None = dropped).
PLAUSIBLE = {
    "heart_rate": (20, 250), "spo2": (50, 100), "bp_sys": (50, 260), "bp_dia": (20, 180),
    "skin_temp": (20.0, 45.0), "hrv_ms": (1, 400),
}
EARLIEST_CLOCK = datetime(2024, 1, 1)
MAX_CLOCK_AHEAD = timedelta(minutes=10)
DATA_EVENTS = (ev.VitalSample, ev.Metric, ev.Alarm, ev.Location, ev.Wear)


@dataclass
class Outcome:
    send_config: bool = False          # push the schedule + alarm switches to the watch
    send_bind: bool = False            # tell the watch whether it's linked (Wonlex)
    acks: list = field(default_factory=list)
    duplicate: bool = False            # an upload we already processed (watch resent it)
    rejected: list = field(default_factory=list)   # implausible values dropped
    clock_fallback: bool = False       # the watch's time was unusable; receive time used
    readings: int = 0


def clean_time(at: Optional[datetime], received: datetime) -> tuple[datetime, bool]:
    """The measurement time, or the receive time when the watch's clock is clearly wrong."""
    if at is None or at < EARLIEST_CLOCK or at > received + MAX_CLOCK_AHEAD:
        return received, at is not None
    return at, False


def plausible(sample: ev.VitalSample) -> tuple[ev.VitalSample, list[str]]:
    rejected, values = [], {}
    for name, (lo, hi) in PLAUSIBLE.items():
        v = getattr(sample, name)
        if v is not None and not (lo <= v <= hi):
            rejected.append(f"{name}={v}")
            values[name] = None
    # A blood pressure is only useful as a pair.
    if (values.get("bp_sys", sample.bp_sys) is None) != (values.get("bp_dia", sample.bp_dia) is None):
        values["bp_sys"] = values["bp_dia"] = None
    return replace(sample, **values), rejected


def to_reading(patient_id: int, device: Device, s: Optional[ev.VitalSample], removed: bool = False) -> VitalIngestSchema:
    """A VitalIngestSchema for the shared pipeline: 0 = not measured (the pipeline ignores it)."""
    s = s or ev.VitalSample(None)
    return VitalIngestSchema(
        patient_id=patient_id, device_id=device.client_id,
        heart_rate=s.heart_rate or 0, spo2=float(s.spo2 or 0), temp=float(s.skin_temp or 0),
        bp_systolic=s.bp_sys or 0, bp_diastolic=s.bp_dia or 0,
        hrv_score=s.hrv_ms or 0, stress_level="N/A", movement=0, sleep_pattern="N/A",
        battery_percent=device.battery_percent or 0, phone_battery=None,
        is_connected=True, is_removed=removed,
    )


async def _ward_id(db, patient: Optional[Patient]) -> Optional[int]:
    if patient is None:
        return None
    if patient.bed_id:
        bed = await db.get(Bed, patient.bed_id)
        if bed:
            return bed.ward_id
    if patient.room_id:
        room = await db.get(Room, patient.room_id)
        if room:
            return room.ward_id
    return None


async def raise_alarm(db, redis, patient_id: int, kind: str, at: Optional[datetime] = None,
                      location: Optional[ev.Location] = None) -> Optional[dict]:
    """Create the alert for a watch alarm and send it live + by push (critical only)."""
    alert_kind = EVENT_ALERTS.get(kind)
    if alert_kind is None:
        return None
    vital_type, text, severity = alert_kind
    if location is not None and location.lat is not None:
        text = f"{text} near {location.lat:.5f}, {location.lon:.5f}"
    patient = await db.get(Patient, patient_id)
    alert = Alert(patient_id=patient_id, ward_id=await _ward_id(db, patient), vital_type=vital_type,
                  triggered_value=text, severity=severity)
    db.add(alert)
    await db.flush()
    alert_data = {"id": alert.id, "alert_id": alert.id, "patient_id": patient_id,
                  "vital_type": vital_type, "triggered_value": text, "severity": severity,
                  "phone_number": patient.phone_number if patient else None,
                  "timestamp": (at or datetime.utcnow()).isoformat()}
    if location is not None and location.lat is not None:
        alert_data["location"] = {"lat": location.lat, "lon": location.lon, "source": location.source}
    await redis.publish(f"patient:{patient_id}:alerts", json.dumps(alert_data))
    if severity == "critical":
        tokens = await staff_tokens_for_patient(db, patient_id)
        if tokens:
            asyncio.create_task(asyncio.to_thread(send_critical_push, tokens, alert_data))
    return alert_data


def active_ttl() -> int:
    """How long a TCP-watch patient counts as online after any frame: a live connection sends
    something at least every idle timeout (heartbeats), plus the usual grace."""
    return int(settings.GATEWAY_IDLE_TIMEOUT_S + settings.MQTT_UPLOAD_GRACE_MIN * 60)


class DeviceCore:
    def __init__(self, redis):
        self.redis = redis

    async def _seen_before(self, db, device: Device, key: str) -> bool:
        new = (await db.execute(
            pg_insert(DeviceMessageKey).values(device_id=device.id, dedupe_key=key, created_at=datetime.utcnow())
            .on_conflict_do_nothing().returning(DeviceMessageKey.device_id)
        )).scalar_one_or_none()
        return new is None

    async def handle(self, db, device: Device, dtype: DeviceType, events: list, dedupe_key: Optional[str],
                     received_at: datetime) -> Outcome:
        """Apply one frame's events. The caller commits (ingest_readings commits on its own)."""
        out = Outcome()
        patient_id = device.patient_id

        if dedupe_key and any(isinstance(e, DATA_EVENTS) for e in events):
            if await self._seen_before(db, device, dedupe_key):
                out.duplicate = True
                events = [e for e in events if not isinstance(e, DATA_EVENTS)]

        readings, times = [], []
        for e in events:
            if isinstance(e, ev.Hello):
                device.model = (e.model or device.model or "")[:40] or None
                device.firmware = (e.firmware or device.firmware or "")[:20] or None
                device.iccid = e.iccid or device.iccid
                device.sim_phone = (e.sim_phone or device.sim_phone or "")[:20] or None
                if e.battery is not None:
                    device.battery_percent = e.battery
                out.send_config = out.send_bind = True
            elif isinstance(e, ev.Heartbeat):
                if e.battery is not None:
                    device.battery_percent = e.battery
                if e.charging is not None:
                    device.battery_state = "charging" if e.charging else "discharging"
            elif isinstance(e, ev.Battery):
                if e.percent is not None:
                    device.battery_percent = e.percent
                if e.charging is not None:
                    device.battery_state = "charging" if e.charging else "discharging"
            elif isinstance(e, ev.VitalSample) and patient_id is not None:
                sample, rejected = plausible(e)
                out.rejected += rejected
                if sample.has_vitals():
                    at, fallback = clean_time(sample.measured_at, received_at)
                    out.clock_fallback |= fallback
                    readings.append(to_reading(patient_id, device, sample))
                    times.append(at)
            elif isinstance(e, ev.Wear) and patient_id is not None and not e.worn:
                at, fallback = clean_time(e.at, received_at)
                out.clock_fallback |= fallback
                readings.append(to_reading(patient_id, device, None, removed=True))
                times.append(at)
            elif isinstance(e, ev.Alarm) and patient_id is not None:
                at, _ = clean_time(e.at, received_at)
                await raise_alarm(db, self.redis, patient_id, e.kind, at, e.location)
            elif isinstance(e, ev.ConfigRequest):
                out.send_config = True
            elif isinstance(e, ev.BindStatusRequest):
                out.send_bind = True
            elif isinstance(e, ev.ReportedConfig):
                device.reported_config = {**(device.reported_config or {}), **e.configs}
            elif isinstance(e, ev.Ack):
                out.acks.append(e)
            # Metric, Location, Sleep, Unhandled: kept in the raw log (stored in phase 5).

        if patient_id is not None:
            # Any frame from a linked watch keeps the patient online between measurements.
            await self.redis.setex(f"patient_active:{patient_id}", active_ttl(), "online")
        if readings:
            await ingest_readings(db, self.redis, readings, source=dtype.source, measured_at=times,
                                  active_ttl=active_ttl())
            out.readings = len(readings)
        return out
