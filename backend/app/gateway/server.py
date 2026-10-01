"""device-gateway: the single process that holds the TCP connections of Wonlex and BPW8 watches.

Run exactly one instance (`python -m app.gateway`), like the mqtt-worker. Per connection:
  bytes → codec frames → decode → (first frame) admit the IMEI → store the raw frame →
  write the ack → DeviceCore (vitals, alarms, online state) → schedule / bind replies.
The raw frame is committed before the ack, so an ack never confirms data we could lose: if
processing fails afterwards, the frame can be re-parsed from the raw log.

Commands from the API arrive on the Redis list gateway:commands.
"""
import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import delete, select

from app.core.config import settings
from app.devices import events as ev
from app.devices.adapters import new_codec
from app.devices.core import DeviceCore
from app.devices.registry import DeviceType, tcp_types
from app.devices.schedule import outside_window, plan_for, requested_vitals
from app.models.device import Device, DeviceConfigState, DeviceMessageKey, MqttRawMessage
from app.models.watch_data import DeviceLocation
from app.services.monitoring import GATEWAY_QUEUE, effective_profile, profile_hash

log = logging.getLogger("gateway")

COMMAND_QUEUE = GATEWAY_QUEUE
READ_SIZE = 4096
UNKNOWN_LOG_EVERY = timedelta(minutes=1)     # rate limit for frames from unregistered IMEIs
CONFIG_RETRY_AFTER = timedelta(minutes=2)
MAX_CONFIG_ATTEMPTS = 3
SCHEDULE_ACK_COMMANDS = {"deviceMeasuringFrequency"}


class Session:
    """One watch connection."""

    def __init__(self, dtype: DeviceType, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.dtype = dtype
        self.codec = new_codec(dtype.key)
        self.reader, self.writer = reader, writer
        peer = writer.get_extra_info("peername")
        self.peer = peer[0] if peer else None
        self.imei: Optional[str] = None
        self.device_id: Optional[int] = None
        self.lock = asyncio.Lock()
        self.closed = False
        self.worn = True
        self.plan: dict = {}
        self.next_due: dict = {}             # vital -> datetime of the next requested measurement
        self.window_open: Optional[bool] = None   # daily window state when the plan was last sent

    async def send(self, chunks: list[bytes]) -> None:
        if self.closed or not chunks:
            return
        async with self.lock:
            for chunk in chunks:
                self.writer.write(chunk)
            await self.writer.drain()

    def close(self) -> None:
        if not self.closed:
            self.closed = True
            self.writer.close()


class Gateway:
    def __init__(self, session_factory, redis):
        self.session_factory = session_factory
        self.redis = redis
        self.core = DeviceCore(redis)
        self.sessions: dict[str, Session] = {}      # imei -> live session
        self._unknown_logged: dict[str, datetime] = {}
        self.servers: list[asyncio.base_events.Server] = []

    # ── listeners ──────────────────────────────────────────────────────────────────────

    async def start(self) -> None:
        for dtype in tcp_types():
            port = int(getattr(settings, dtype.port_setting) or 0)
            if not port:
                continue
            server = await asyncio.start_server(
                lambda r, w, t=dtype: self.on_connect(t, r, w), host="0.0.0.0", port=port)
            self.servers.append(server)
            log.info("%s watches: listening on port %s", dtype.label, port)

    async def stop(self) -> None:
        for server in self.servers:
            server.close()
        for s in list(self.sessions.values()):
            s.close()

    def session_for_device(self, device_id: int) -> Optional[Session]:
        return next((s for s in self.sessions.values() if s.device_id == device_id), None)

    async def on_connect(self, dtype: DeviceType, reader, writer) -> None:
        s = Session(dtype, reader, writer)
        loop = asyncio.get_running_loop()
        deadline = loop.time() + settings.GATEWAY_FIRST_FRAME_S
        try:
            while not s.closed:
                timeout = settings.GATEWAY_IDLE_TIMEOUT_S if s.imei else deadline - loop.time()
                if timeout <= 0:
                    break                                  # never identified itself
                data = await asyncio.wait_for(reader.read(READ_SIZE), timeout)
                if not data:
                    break
                for frame in s.codec.feed(data):
                    await self.on_frame(s, frame)
                    if s.closed:
                        break
        except asyncio.TimeoutError:
            pass
        except (ConnectionError, OSError):
            pass
        except Exception:
            log.exception("connection from %s (%s) failed", s.peer, s.imei)
        finally:
            await self.on_close(s)

    async def on_close(self, s: Session) -> None:
        s.close()
        if s.imei and self.sessions.get(s.imei) is s:
            del self.sessions[s.imei]
            async with self.session_factory() as db:
                device = await db.get(Device, s.device_id)
                if device:
                    device.is_online = False
                    await db.commit()
            log.info("%s %s disconnected", s.dtype.label, s.imei)

    # ── frames ─────────────────────────────────────────────────────────────────────────

    async def _store_raw(self, imei: str, patient_id, name: str, frame: bytes, status: str,
                         error: Optional[str] = None) -> None:
        async with self.session_factory() as db:
            db.add(MqttRawMessage(client_id=imei[:64], patient_id=patient_id, transport="tcp", topic=name[:128],
                                  payload=frame, parse_status=status, parse_error=(error or None) and error[:255],
                                  received_at=datetime.utcnow()))
            await db.commit()

    async def _admit(self, s: Session, imei: str, name: str, frame: bytes) -> bool:
        """First frame of a connection: only a registered, active watch of this type gets in."""
        now = datetime.utcnow()
        async with self.session_factory() as db:
            device = (await db.execute(select(Device).where(Device.client_id == imei))).scalar_one_or_none()
            if device is None or not device.is_active or device.type != s.dtype.key:
                last = self._unknown_logged.get(imei)
                if last is None or now - last >= UNKNOWN_LOG_EVERY:
                    self._unknown_logged[imei] = now
                    reason = ("not registered" if device is None else
                              "disabled" if not device.is_active else f"registered as {device.type}")
                    db.add(MqttRawMessage(client_id=imei[:64], transport="tcp", topic=name[:128], payload=frame,
                                          parse_status="unknown_device", parse_error=f"{reason}; from {s.peer}",
                                          received_at=now))
                    await db.commit()
                    log.warning("refused %s %s from %s: %s", s.dtype.label, imei, s.peer, reason)
                return False
            other = self.sessions.get(imei)
            if other is not None and other is not s:
                device.duplicate_login_at = now      # a second connection for one IMEI: cloned or faked?
                other.close()
                log.warning("%s %s connected again from %s; closed the older session", s.dtype.label, imei, s.peer)
            self.sessions[imei] = s
            s.imei, s.device_id = imei, device.id
            device.is_online, device.last_connected_at, device.last_seen_at, device.last_ip = True, now, now, s.peer
            await db.commit()
        log.info("%s %s connected from %s", s.dtype.label, imei, s.peer)
        return True

    async def on_frame(self, s: Session, frame: bytes) -> None:
        now = datetime.utcnow()
        dec = s.codec.decode(frame, now)
        if dec.error or not dec.imei:
            if s.imei is None:
                log.info("closing %s connection from %s: %s", s.dtype.label, s.peer, dec.error)
                s.close()
            else:
                await self._store_raw(s.imei, None, dec.name, frame, "error", dec.error)
            return
        if s.imei is None:
            if not await self._admit(s, dec.imei, dec.name, frame):
                s.close()
                return
        elif dec.imei != s.imei:
            await self._store_raw(s.imei, None, dec.name, frame, "rejected", f"frame for another IMEI {dec.imei}")
            return
        # Wonlex encryptionCode: "warn" logs mismatches, "enforce" drops unsigned or wrongly signed frames.
        if dec.signature_ok is not True and s.dtype.key == "wonlex_4g" and settings.WONLEX_SIGN_KEY:
            if settings.WONLEX_SIGNATURE == "enforce":
                await self._store_raw(s.imei, None, dec.name, frame, "rejected", "bad or missing encryptionCode")
                return
            if dec.signature_ok is False:
                log.warning("%s: encryptionCode mismatch on %s (warn mode)", s.imei, dec.name)

        async with self.session_factory() as db:
            device = await db.get(Device, s.device_id)
            if device is None or not device.is_active:
                s.close()
                return
            raw = MqttRawMessage(client_id=s.imei, patient_id=device.patient_id, transport="tcp", topic=dec.name[:128],
                                 payload=frame, parse_status="received", received_at=now)
            db.add(raw)
            device.last_seen_at, device.is_online, device.last_ip = now, True, s.peer
            await db.commit()                                  # raw first, then the ack
            reply = s.codec.reply(dec, bound=device.patient_id is not None, now=now)
            if reply:
                await s.send([reply])
            try:
                out = await self.core.handle(db, device, s.dtype, dec.events, dec.dedupe_key, now)
                notes = []
                if out.rejected:
                    notes.append("implausible: " + ", ".join(out.rejected))
                if out.clock_fallback:
                    notes.append("watch clock unusable; receive time used")
                if dec.signature_ok is False:
                    notes.append("encryptionCode mismatch")
                raw.parse_status = "duplicate" if out.duplicate else (
                    "stored" if all(isinstance(e, ev.Unhandled) for e in dec.events) else "parsed")
                raw.parse_error = "; ".join(notes)[:255] or None
                for e in dec.events:
                    if isinstance(e, ev.Wear):
                        s.worn = e.worn
                    elif isinstance(e, ev.VitalSample) and e.has_vitals():
                        s.worn = True
                for ack in out.acks:
                    if ack.command in SCHEDULE_ACK_COMMANDS:
                        state = await db.get(DeviceConfigState, device.id)
                        if state and state.status == "sent":
                            state.status, state.applied_at, state.last_error = "applied", now, None
                            state.updated_at = now
                await db.commit()
            except Exception as e:
                log.exception("failed to handle %s from %s", dec.name, s.imei)
                await db.rollback()
                await self._store_raw(s.imei, device.patient_id, dec.name, frame, "error", str(e))
                return
            if out.send_bind and s.dtype.key == "wonlex_4g":
                await s.send(s.codec.encode(s.imei, ev.SetBound(device.patient_id is not None), now))
            if out.send_config:
                await self.apply_config(db, s, device)

    # ── schedules and commands ─────────────────────────────────────────────────────────

    async def apply_config(self, db, s: Session, device: Device) -> None:
        """Send the patient's effective schedule (and alarm switches) to the watch."""
        now = datetime.utcnow()
        if device.patient_id is None:
            s.plan, s.next_due = {}, {}
            return
        profile, _ = await effective_profile(db, device.patient_id)
        plan = plan_for(profile, s.dtype)
        s.plan = plan
        # Stagger the first requested measurement so many watches don't all measure at once.
        s.next_due = {v: now + timedelta(seconds=random.uniform(0, min(m, 5) * 60))
                      for v, m in requested_vitals(plan).items()}
        # A watch without its own daily window gets its measurements switched off while the
        # window is closed; poll_requested() resends the schedule at each window edge.
        s.window_open = self._in_window(plan, now)
        sent_plan = plan if s.window_open or s.dtype.schedule_window else outside_window(plan)
        chunks = (s.codec.encode(s.imei, ev.ApplySchedule(sent_plan), now)
                  + s.codec.encode(s.imei, ev.SetAlarmSwitches(), now))
        await s.send(chunks)
        state = await db.get(DeviceConfigState, device.id)
        if state is None:
            state = DeviceConfigState(device_id=device.id, attempts=0)
            db.add(state)
        h = profile_hash(plan)
        if state.profile_hash != h:
            state.attempts = 0
        state.profile_hash, state.status = h, "sent"
        state.attempts = (state.attempts or 0) + 1
        state.last_sent_at = state.updated_at = now
        state.last_error = None             # the UI explains when a watch type never confirms
        state.device_limits = {"plan": {k: (list(v) if isinstance(v, tuple) else v) for k, v in plan.items()}}
        await db.commit()

    async def run_command(self, cmd: dict) -> None:
        s = self.session_for_device(cmd.get("device_id"))
        kind = cmd.get("type")
        if s is None:
            return                                            # offline: schedules go out on reconnect
        now = datetime.utcnow()
        if kind == "kick":
            s.close()
            return
        async with self.session_factory() as db:
            device = await db.get(Device, s.device_id)
            if device is None:
                return
            if kind == "apply_config":
                await self.apply_config(db, s, device)
                if s.dtype.key == "wonlex_4g":
                    await s.send(s.codec.encode(s.imei, ev.SetBound(device.patient_id is not None), now))
            elif kind == "bind":
                await s.send(s.codec.encode(s.imei, ev.SetBound(device.patient_id is not None), now))
            elif kind == "measure":
                await s.send(s.codec.encode(s.imei, ev.MeasureNow(str(cmd.get("vital"))), now))
                interval = requested_vitals(s.plan).get(cmd.get("vital"))
                if interval:                                  # a manual reading restarts that timer
                    s.next_due[cmd["vital"]] = now + timedelta(minutes=interval)
            elif kind == "locate":
                await s.send(s.codec.encode(s.imei, ev.Locate(), now))
            elif kind == "reboot":
                await s.send(s.codec.encode(s.imei, ev.Reboot(), now))

    async def command_loop(self) -> None:
        while True:
            item = await self.redis.blpop(COMMAND_QUEUE, timeout=5)
            if not item:
                continue
            try:
                await self.run_command(json.loads(item[1]))
            except Exception:
                log.exception("command failed: %r", item)

    def _in_window(self, plan: dict, now: datetime) -> bool:
        window = plan.get("window")
        if not window:
            return True
        local = now + timedelta(minutes=settings.MQTT_DEFAULT_TZ_MINUTES)
        hm = local.strftime("%H:%M")
        start, end = window
        return start <= hm < end if start <= end else (hm >= start or hm < end)

    async def poll_requested(self) -> None:
        """Ask watches to measure the vitals their schedule runs in "requested" mode."""
        now = datetime.utcnow()
        for s in list(self.sessions.values()):
            if s.closed or not s.plan:
                continue
            open_now = self._in_window(s.plan, now)
            if s.plan.get("window") and not s.dtype.schedule_window and open_now != s.window_open:
                async with self.session_factory() as db:          # the window opened or closed
                    device = await db.get(Device, s.device_id)
                    if device:
                        await self.apply_config(db, s, device)
            if not s.worn or not open_now:
                continue
            for vital, minutes in requested_vitals(s.plan).items():
                if now >= s.next_due.get(vital, now):
                    s.next_due[vital] = now + timedelta(minutes=minutes)
                    try:
                        await s.send(s.codec.encode(s.imei, ev.MeasureNow(vital), now))
                    except (ConnectionError, OSError):
                        s.close()

    async def retry_configs(self) -> None:
        """Resend schedules a confirming watch (Wonlex) hasn't acknowledged within 2 minutes."""
        now = datetime.utcnow()
        async with self.session_factory() as db:
            for s in list(self.sessions.values()):
                if s.closed or not s.dtype.confirms_schedule:
                    continue
                state = await db.get(DeviceConfigState, s.device_id)
                if not state or state.status != "sent" or not state.last_sent_at:
                    continue
                if now - state.last_sent_at < CONFIG_RETRY_AFTER:
                    continue
                if (state.attempts or 0) >= MAX_CONFIG_ATTEMPTS:
                    state.status, state.last_error = "failed", "no acknowledgement from the watch"
                    state.updated_at = now
                    await db.commit()
                    continue
                device = await db.get(Device, s.device_id)
                if device:
                    await self.apply_config(db, s, device)

    async def purge_keys(self, keep_days: int = 30) -> None:
        """Daily: dedupe keys and locations older than 30 days (the raw log is purged by the
        mqtt-worker for both transports)."""
        cutoff = datetime.utcnow() - timedelta(days=keep_days)
        async with self.session_factory() as db:
            await db.execute(delete(DeviceMessageKey).where(DeviceMessageKey.created_at < cutoff))
            await db.execute(delete(DeviceLocation).where(DeviceLocation.recorded_at < cutoff))
            await db.commit()

    async def periodic_loop(self) -> None:
        ticks = 0
        while True:
            await asyncio.sleep(15)
            ticks += 1
            try:
                await self.poll_requested()
                if ticks % 4 == 0:
                    await self.retry_configs()
                if ticks % (4 * 60 * 24) == 0:
                    await self.purge_keys()
            except Exception:
                log.exception("periodic job failed")
