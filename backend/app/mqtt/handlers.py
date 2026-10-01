"""Handlers for messages from Veepoo 4G watches. Every packet is stored raw first, then parsed;
vitals go through the same shared ingest pipeline as BLE bands (app.services.ingest)."""
import json
import logging
from datetime import datetime, timedelta
from typing import Awaitable, Callable, Optional

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.devices import event_log
from app.devices.core import raise_alarm
from app.models.device import Device, DeviceConfigState, DeviceDataBlock, MqttRawMessage
from app.mqtt import protocol as p
from app.schemas.vitals import VitalIngestSchema
from app.services.ingest import ingest_readings
from app.services.monitoring import effective_profile, limits_from_records, profile_hash, to_auto_measure_records

log = logging.getLogger("mqtt.handlers")

Publish = Callable[[str, bytes], Awaitable[None]]
ENVELOPE_TOPICS = {"device_info_report", "daily_data_report"}
MAX_CONFIG_ATTEMPTS = 3
CONFIG_RETRY_AFTER = timedelta(minutes=2)
AWAITING_LIMITS = "waiting for the watch to report its schedule limits"



def _reading(patient_id: int, device: Device, *, hr=0, spo2=0.0, sbp=0, dbp=0, temp=0.0,
             removed=False) -> VitalIngestSchema:
    """A VitalIngestSchema from 4G data. 0 = "not measured" (the pipeline ignores zeros);
    movement stays unmapped for now (decision 2), stress/HRV aren't parsed from daily blocks yet."""
    return VitalIngestSchema(
        patient_id=patient_id, device_id=device.client_id,
        heart_rate=int(hr or 0), spo2=float(spo2 or 0), temp=float(temp or 0),
        bp_systolic=int(sbp or 0), bp_diastolic=int(dbp or 0),
        hrv_score=0, stress_level="N/A", movement=0, sleep_pattern="N/A",
        battery_percent=device.battery_percent or 0, phone_battery=None,
        is_connected=True, is_removed=removed,
    )


class Handlers:
    def __init__(self, session_factory, redis, publish: Publish):
        self.session_factory = session_factory
        self.redis = redis
        self.publish = publish
        self.fragments = p.FragmentBuffer()

    # ── entry point ──────────────────────────────────────────────────────────────

    async def on_message(self, topic: str, payload: bytes) -> None:
        if topic.startswith("$SYS/"):
            await self.on_sys_event(topic, payload)
            return
        parsed = p.split_device_topic(topic)
        if not parsed:
            return
        client_id, name = parsed
        received_at = datetime.utcnow()
        head = payload[0] if payload else None
        error = None
        async with self.session_factory() as db:
            device = (await db.execute(select(Device).where(Device.client_id == client_id))).scalar_one_or_none()
            patient_id = device.patient_id if device else None
            if device is None or not device.is_active:
                db.add(MqttRawMessage(client_id=client_id, patient_id=patient_id, topic=topic, head=head,
                                      payload=payload, received_at=received_at, parse_status="unknown_device"))
                await db.commit()
                event_log.frame("IN", "mqtt", client_id, patient_id, name, payload, status="refused",
                                note="not registered" if device is None else "disabled")
                return
            handler = getattr(self, f"h_{name}", None)
            status = "parsed" if handler else "stored"      # no handler yet: kept for later (sleep, ECG…)
            try:
                device.last_seen_at = received_at
                db.add(MqttRawMessage(client_id=client_id, patient_id=patient_id, topic=topic, head=head,
                                      payload=payload, received_at=received_at, parse_status=status))
                event_log.frame("IN", "mqtt", client_id, patient_id, name, payload, status=status,
                                note="Veepoo binary message; readings from it are logged as STORED blocks" if handler else "")
                if handler:
                    await handler(db, device, payload)
                await db.commit()
                return
            except Exception as e:  # never let one bad packet stop the worker
                log.exception("failed to handle %s from %s", name, client_id)
                error = str(e)[:250]
                await db.rollback()
        # Keep the raw packet (with the error) in a fresh transaction so it can be re-parsed later.
        async with self.session_factory() as db:
            db.add(MqttRawMessage(client_id=client_id, patient_id=patient_id, topic=topic, head=head,
                                  payload=payload, received_at=received_at, parse_status="error", parse_error=error))
            await db.commit()
        event_log.frame("IN", "mqtt", client_id, patient_id, name, payload, status="error", note=error or "")

    async def _content(self, device: Device, name: str, payload: bytes) -> Optional[bytes]:
        env = p.parse_envelope(payload)
        return self.fragments.add((device.client_id, name, env.head), env)

    # ── device info / time / config ──────────────────────────────────────────────

    async def h_device_info_report(self, db, device: Device, payload: bytes):
        content = await self._content(device, "device_info_report", payload)
        if content is None:
            return
        info = p.parse_device_info(content)
        device.mac, device.device_number = info["mac"], info["device_number"]
        device.firmware, device.hardware = info["firmware"], info.get("hardware")
        device.iccid, device.timezone_minutes = info.get("iccid"), info["timezone_minutes"]
        device.capabilities = info["capabilities"]
        # Learn the watch's schedule limits (E7 reply), then push time.
        await self.publish(p.cmd_topic(device.client_id), p.build_read_auto_measure())
        await self.send_time(device)

    async def send_time(self, device: Device):
        await self.publish(p.time_topic(device.client_id),
                           p.build_time(datetime.utcnow(), settings.MQTT_DEFAULT_TZ_MINUTES))

    async def apply_config(self, db, device: Device, force: bool = False) -> None:
        """Send the patient's effective schedule (CB) and upload interval (CA) if it changed or
        is still unacknowledged."""
        state = await db.get(DeviceConfigState, device.id) or DeviceConfigState(device_id=device.id)
        if state not in db:
            db.add(state)
        if device.capabilities.get("auto_measure_config") == 0:
            state.status, state.last_error = "unsupported", "watch reports no auto-measure config support"
            return
        profile, _ = await effective_profile(db, device.patient_id)
        h = profile_hash(profile)
        if not force and state.profile_hash == h and state.status == "applied":
            return
        # Limits (minimum step per vital) unknown yet: ask first (CB read → E7), send the schedule
        # when they arrive. If the watch never answers, the next retry sends it without them.
        if not state.device_limits and state.last_error != AWAITING_LIMITS:
            await self.publish(p.cmd_topic(device.client_id), p.build_read_auto_measure())
            state.status, state.last_error = "pending", AWAITING_LIMITS
            state.last_sent_at = state.updated_at = datetime.utcnow()
            return
        if state.profile_hash != h:
            state.attempts = 0
        if state.attempts >= MAX_CONFIG_ATTEMPTS:
            state.status = "failed"
            state.last_error = state.last_error or "no acknowledgement from the watch"
            return
        records = to_auto_measure_records(profile, state.device_limits)
        if state.last_error == AWAITING_LIMITS:
            state.last_error = None
        await self.publish(p.cmd_topic(device.client_id), p.build_set_auto_measure(records))
        await self.publish(p.cmd_topic(device.client_id), p.build_set_upload_interval(profile["upload_interval_min"]))
        state.profile_hash, state.status = h, "sent"
        state.attempts += 1
        state.last_sent_at = state.updated_at = datetime.utcnow()

    async def h_device_auto_measure_info_report(self, db, device: Device, payload: bytes):
        ack = p.parse_auto_measure_ack(payload)
        state = await db.get(DeviceConfigState, device.id)
        if state is None:
            state = DeviceConfigState(device_id=device.id, status="pending")
            db.add(state)
        if ack["records"]:
            state.device_limits = limits_from_records(ack["records"])
        if ack["con"] == 0x01:                     # reply to our CB set
            state.status = "applied" if ack["ok"] else "failed"
            state.applied_at = datetime.utcnow() if ack["ok"] else state.applied_at
            state.last_error = None if ack["ok"] else "watch rejected the schedule"
        elif ack["con"] in (0x02, 0x03) and state.status != "applied":
            state.last_error = None
            await self.apply_config(db, device, force=True)   # limits known now → send the schedule
        state.updated_at = datetime.utcnow()

    async def h_device_server_state_report(self, db, device: Device, payload: bytes):
        ack = p.parse_server_state_ack(payload)
        if ack["con"] == 0x01 and not ack["ok"]:
            state = await db.get(DeviceConfigState, device.id)
            if state:
                state.last_error = "watch rejected the upload interval (CA) — vendor firmware needed?"

    # ── data ──────────────────────────────────────────────────────────────────────

    async def h_prepare_data(self, db, device: Device, payload: bytes):
        pd = p.parse_prepare_data(payload)
        if pd.read_type == 0xC1:
            await self.publish(p.cmd_topic(device.client_id), p.build_read_daily(1, 0))
        elif pd.read_type == 0xC0:
            await self.publish(p.cmd_topic(device.client_id), p.build_read_sleep(0))  # stored raw for now

    def _active_ttl(self, upload_interval_min: int) -> int:
        return int((upload_interval_min + settings.MQTT_UPLOAD_GRACE_MIN) * 60)

    async def h_daily_data_report(self, db, device: Device, payload: bytes):
        content = await self._content(device, "daily_data_report", payload)
        if content is None or device.patient_id is None:
            return
        _, blocks = p.parse_daily_content(content)
        tz = timedelta(minutes=device.timezone_minutes if device.timezone_minutes is not None
                       else settings.MQTT_DEFAULT_TZ_MINUTES)
        today_local = datetime.utcnow() + tz
        readings, times = [], []
        for block in blocks:
            v = block.values
            if not block.crc_ok or "hour" not in v:
                continue
            try:
                # CONFIRM with vendor: block time is the watch's local time (hence the tz shift).
                local = datetime(today_local.year, v["month"], v["day"], v["hour"], v["minute"])
            except ValueError:
                continue
            if local > today_local + timedelta(days=1):
                local = local.replace(year=local.year - 1)     # block from last December
            new = (await db.execute(
                pg_insert(DeviceDataBlock).values(
                    device_id=device.id, day=local.date().isoformat(), block_no=block.block_no, crc=block.crc,
                    measured_at=local - tz, created_at=datetime.utcnow(),
                ).on_conflict_do_nothing(constraint="uq_device_data_blocks").returning(DeviceDataBlock.id)
            )).scalar_one_or_none()
            if new is None:
                continue                                        # re-sent block: already ingested
            start_utc = local - tz
            removed = v.get("wear", 0) not in (p.WEAR_WORN, 7)  # 7 = power-saving, still worn
            hrs, spo2s = v.get("pulse_rate", []), v.get("spo2", [])
            for i in range(max(len(hrs), len(spo2s), 1)):
                readings.append(_reading(
                    device.patient_id, device,
                    hr=hrs[i] if i < len(hrs) else 0, spo2=spo2s[i] if i < len(spo2s) else 0,
                    sbp=v.get("bp_systolic", 0) if i == 0 else 0, dbp=v.get("bp_diastolic", 0) if i == 0 else 0,
                    removed=removed,
                ))
                times.append(start_utc + timedelta(minutes=i))
        if readings:
            profile, _ = await effective_profile(db, device.patient_id)
            await ingest_readings(db, self.redis, readings, source="mqtt", measured_at=times,
                                  active_ttl=self._active_ttl(profile["upload_interval_min"]))

    async def h_manual_measure(self, db, device: Device, payload: bytes):
        if not payload or payload[0] != 0xC3 or device.patient_id is None:
            return                                   # C9 (WiFi / cell location) stored raw only
        r = p.parse_realtime(payload)
        profile, _ = await effective_profile(db, device.patient_id)
        await ingest_readings(db, self.redis, [_reading(device.patient_id, device, hr=r["heart_rate"],
                                                        spo2=r["spo2"], temp=r["temp"])],
                              source="mqtt", active_ttl=self._active_ttl(profile["upload_interval_min"]))

    async def h_device_status_report(self, db, device: Device, payload: bytes):
        s = p.parse_device_status(payload)
        device.battery_percent, device.battery_state = s.get("battery_percent"), s.get("battery_state")

    async def h_device_event_report(self, db, device: Device, payload: bytes):
        ev = p.parse_device_event(payload)
        if device.patient_id is None:
            return
        # Shared with the TCP watches: Alert row, live alert, push for critical ones.
        await raise_alarm(db, self.redis, device.patient_id, ev["event"], ev["triggered_at"])

    # ── broker events ($SYS) ──────────────────────────────────────────────────────

    async def on_sys_event(self, topic: str, payload: bytes) -> None:
        # $SYS/brokers/<node>/clients/<clientid>/connected|disconnected
        parts = topic.split("/")
        if len(parts) < 6 or parts[3] != "clients":
            return
        client_id, event = parts[4], parts[5]
        try:
            info = json.loads(payload or b"{}")
        except ValueError:
            info = {}
        async with self.session_factory() as db:
            device = (await db.execute(select(Device).where(Device.client_id == client_id))).scalar_one_or_none()
            if device is None:
                return
            now = datetime.utcnow()
            if event == "connected":
                device.is_online, device.last_connected_at, device.last_seen_at = True, now, now
                await self.send_time(device)
                if device.patient_id is not None:
                    await self.apply_config(db, device)
            elif event == "disconnected":
                device.is_online = False
                # The broker kicks the older session when a second one logs in with the same clientId.
                if info.get("reason") in ("takenover", "discarded"):
                    device.duplicate_login_at = now
            await db.commit()

    # ── periodic ──────────────────────────────────────────────────────────────────

    async def retry_configs(self) -> None:
        """Every minute: resend schedules that are pending, or sent but unacknowledged for 2 min."""
        async with self.session_factory() as db:
            rows = (await db.execute(
                select(Device, DeviceConfigState).join(DeviceConfigState, DeviceConfigState.device_id == Device.id)
                .where(Device.is_online.is_(True), Device.is_active.is_(True), Device.patient_id.isnot(None),
                       Device.transport == "mqtt",                  # TCP watches belong to the device-gateway
                       DeviceConfigState.status.in_(("pending", "sent")))
            )).all()
            now = datetime.utcnow()
            for device, state in rows:
                if state.last_sent_at and now - state.last_sent_at < CONFIG_RETRY_AFTER:
                    continue                            # give the watch time to answer
                await self.apply_config(db, device, force=state.status == "sent")
            await db.commit()

    async def purge_raw(self, keep_days: int = 30) -> None:
        from sqlalchemy import delete
        async with self.session_factory() as db:
            await db.execute(delete(MqttRawMessage).where(
                MqttRawMessage.received_at < datetime.utcnow() - timedelta(days=keep_days)))
            await db.commit()
