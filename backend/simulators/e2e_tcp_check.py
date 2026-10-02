"""End-to-end check of the TCP watch path: API → device-gateway → watch → database → live stream.

    DATABASE_URL=postgresql://… REDIS_URL=redis://… python -m simulators.e2e_tcp_check

Creates two test hospitals with an org admin each, a master admin, a doctor and two patients.
Then, through the real API as those users, it registers a Wonlex and a BPW8 watch and links
them. It runs the device-gateway in-process on spare ports, drives both simulated watches
through their scenarios, and changes schedules, measures on demand, unlinks and disables via
the API, checking what reaches the watch, the database, the live Redis stream and the alerts.
Removes its test data at the end. NEVER point it at production: it writes and deletes rows.
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta

# Never reach real messaging services from a test, whatever .env holds: a Critical reading here
# would otherwise send a real WhatsApp (MSG91) or push (FCM).
os.environ["MSG91_AUTH_KEY"] = "e2e-disabled"
os.environ["MSG91_INTEGRATED_NUMBER"] = "0"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/nonexistent/e2e-disabled.json"
os.environ.setdefault("GATEWAY_WONLEX_PORT", "17700")
os.environ.setdefault("GATEWAY_BPW8_PORT", "17701")
os.environ.setdefault("GATEWAY_FIRST_FRAME_S", "3")
os.environ.setdefault("GATEWAY_PUBLIC_IP", "203.0.113.10")
os.environ.setdefault("RUN_BACKGROUND_JOBS", "false")

import httpx  # noqa: E402
from sqlalchemy import delete, or_, select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.database import SessionLocal, get_redis  # noqa: E402
from app.gateway.server import Gateway  # noqa: E402
from app.main import app  # noqa: E402
from app.models.clinical import Alert  # noqa: E402
from app.models.device import (  # noqa: E402
    Device, DeviceAssignment, DeviceConfigState, DeviceMessageKey, MonitoringProfile, MqttRawMessage,
)
from app.models.organization import Organization  # noqa: E402
from app.models.user import Doctor, MasterAdmin, OrgAdmin, Patient, User, UserRole  # noqa: E402
from app.models.vitals import Vitals  # noqa: E402
from app.models.watch_data import DeviceLocation, PatientMetric, SleepSession  # noqa: E402
from simulators.tcp_watch_sim import Bpw8, Wonlex  # noqa: E402
import app.services.ingest as ingest_module  # noqa: E402

WHATSAPP_SENT: list[dict] = []


async def _record_whatsapp(**kwargs):
    WHATSAPP_SENT.append(kwargs)


ingest_module.send_critical_alert = _record_whatsapp      # no network call to MSG91 from a test

W_IMEI, B_IMEI = "352273017386001", "867956070000018"
UNKNOWN_IMEI, DISABLED_IMEI = "490154203237518", "356938035643809"
RESULTS: list[tuple[bool, str]] = []


def check(ok: bool, what: str) -> None:
    RESULTS.append((bool(ok), what))
    print(("PASS " if ok else "FAIL ") + what)


class Client:
    """A simulated watch connection that records what the server sends and answers commands."""

    def __init__(self, watch, port: int):
        self.watch, self.port = watch, port
        self.received: list = []
        self.closed = asyncio.Event()

    async def connect(self):
        self.reader, self.writer = await asyncio.open_connection("127.0.0.1", self.port)
        self.task = asyncio.create_task(self._listen())
        return self

    async def _listen(self):
        try:
            while data := await self.reader.read(4096):
                for frame in self.watch.frames(data):
                    self.received.append(frame)
                    await self.send(self.watch.replies_to(frame))
        except (ConnectionError, OSError):
            pass
        self.closed.set()

    async def send(self, chunks):
        for c in chunks:
            self.writer.write(c)
        await self.writer.drain()

    def got(self, pred) -> list:
        return [f for f in self.received if pred(f)]

    def mark(self) -> int:
        return len(self.received)

    def since(self, mark: int, pred) -> list:
        return [f for f in self.received[mark:] if pred(f)]

    async def close(self):
        self.writer.close()
        self.task.cancel()


class Api:
    """The real FastAPI app, called in-process as a given user."""

    def __init__(self):
        self.http = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")

    def as_(self, user_id: str) -> dict:
        return {"Authorization": f"Bearer {create_access_token({'sub': user_id})}"}

    async def call(self, method: str, path: str, user: str, **kw):
        return await self.http.request(method, "/api/v1/devices" + path, headers=self.as_(user), **kw)


async def settle(seconds: float = 0.6):
    await asyncio.sleep(seconds)


async def count(db, model, *where) -> int:
    return len((await db.execute(select(model).where(*where))).scalars().all())


async def device_by_imei(imei: str) -> Device:
    async with SessionLocal() as db:
        return (await db.execute(select(Device).where(Device.client_id == imei))).scalar_one()


async def cleanup(org_ids, user_ids, patient_ids, imeis):
    async with SessionLocal() as db:
        devs = (await db.execute(select(Device.id).where(Device.client_id.in_(imeis)))).scalars().all()
        await db.execute(delete(DeviceMessageKey).where(DeviceMessageKey.device_id.in_(devs)))
        await db.execute(delete(DeviceConfigState).where(DeviceConfigState.device_id.in_(devs)))
        await db.execute(delete(DeviceAssignment).where(DeviceAssignment.device_id.in_(devs)))
        await db.execute(delete(DeviceLocation).where(DeviceLocation.device_id.in_(devs)))
        await db.execute(delete(PatientMetric).where(PatientMetric.patient_id.in_(patient_ids)))
        await db.execute(delete(SleepSession).where(SleepSession.patient_id.in_(patient_ids)))
        await db.execute(delete(MqttRawMessage).where(MqttRawMessage.client_id.in_(imeis)))
        await db.execute(delete(Device).where(Device.id.in_(devs)))
        await db.execute(delete(MonitoringProfile).where(or_(MonitoringProfile.patient_id.in_(patient_ids),
                                                              MonitoringProfile.organization_id.in_(org_ids))))
        await db.execute(delete(Vitals).where(Vitals.patient_id.in_(patient_ids)))
        await db.execute(delete(Alert).where(Alert.patient_id.in_(patient_ids)))
        for model in (Patient, Doctor, OrgAdmin, MasterAdmin):
            await db.execute(delete(model).where(model.id.in_(user_ids)))
        await db.execute(delete(User).where(User.id.in_(user_ids)))
        await db.execute(delete(Organization).where(Organization.id.in_(org_ids)))
        await db.commit()


async def main() -> int:
    redis = await get_redis()
    api = Api()
    imeis = [W_IMEI, B_IMEI, UNKNOWN_IMEI, DISABLED_IMEI]
    async with SessionLocal() as db:
        h1 = Organization(name="E2E Hospital One", country="IN", state="KL", city="Kochi")
        h2 = Organization(name="E2E Hospital Two", country="IN", state="KL", city="Kochi")
        db.add_all([h1, h2])
        await db.flush()
        master = MasterAdmin(user_id="e2e-master", phone_number="+910000000900", full_name="E2E Master",
                             role=UserRole.MASTER_ADMIN)
        admin1 = OrgAdmin(user_id="e2e-admin1", phone_number="+910000000903", full_name="E2E Admin One",
                          role=UserRole.ORG_ADMIN, organization_id=h1.id, organization_name=h1.name)
        admin2 = OrgAdmin(user_id="e2e-admin2", phone_number="+910000000904", full_name="E2E Admin Two",
                          role=UserRole.ORG_ADMIN, organization_id=h2.id, organization_name=h2.name)
        doctor = Doctor(user_id="e2e-doctor", phone_number="+910000000905", full_name="E2E Doctor",
                        role=UserRole.DOCTOR, organization_id=h1.id, specialization="Medicine")
        db.add_all([master, admin1, admin2, doctor])
        await db.flush()
        pw = Patient(user_id="e2e-wonlex", phone_number="+910000000901", full_name="E2E Wonlex Patient",
                     role=UserRole.PATIENT, organization_id=h1.id, age=64, gender="F", blood_group="O+",
                     doctor_id=doctor.id)
        pb = Patient(user_id="e2e-bpw8", phone_number="+910000000902", full_name="E2E BPW8 Patient",
                     role=UserRole.PATIENT, organization_id=h1.id, age=71, gender="M", blood_group="B+",
                     doctor_id=doctor.id)
        db.add_all([pw, pb])
        await db.commit()
        org_ids = [h1.id, h2.id]
        pw_id, pb_id = pw.id, pb.id
        user_ids = [master.id, admin1.id, admin2.id, doctor.id, pw_id, pb_id]

    gateway = Gateway(SessionLocal, redis)
    pubsub = redis.pubsub()
    cmd_task = None
    try:
        # ── API: register and link (as the hospital's admin and the patients' doctor) ─────
        r = await api.call("GET", "/types", "e2e-doctor")
        check(r.status_code == 200 and {t["key"] for t in r.json()} == {"veepoo_4g", "wonlex_4g", "bpw8_4g"},
              "GET /devices/types lists Veepoo, Wonlex and BPW8")
        r = await api.call("POST", "", "e2e-admin1", json={"type": "wonlex_4g", "imei": W_IMEI, "organization_id": org_ids[0]})
        check(r.status_code == 201 and "credentials" not in r.json() and r.json()["setup"]["port"] == 17700,
              "admin registers the Wonlex by IMEI; gets setup steps, no password")
        wdev_id = r.json()["device"]["id"]
        r = await api.call("POST", "", "e2e-admin1", json={"type": "bpw8_4g", "imei": B_IMEI, "organization_id": org_ids[0]})
        check(r.status_code == 201 and r.json()["setup"]["sms"] == "BY,SSAR,203.0.113.10,17701",
              f"admin registers the BPW8; setup includes the SMS to send ({r.json().get('setup', {}).get('sms')})")
        bdev_id = r.json()["device"]["id"]
        r = await api.call("POST", "", "e2e-admin1", json={"type": "bpw8_4g", "imei": "352273017386002"})
        check(r.status_code == 422, "an IMEI with a wrong check digit is refused")
        r = await api.call("POST", "", "e2e-admin1", json={"type": "bpw8_4g", "imei": B_IMEI})
        check(r.status_code == 409, "registering the same IMEI twice is refused")
        r = await api.call("POST", f"/{bdev_id}/reset-password", "e2e-admin1")
        check(r.status_code == 409, "TCP watches have no password to reset")
        r = await api.call("POST", "", "e2e-admin1", json={"type": "bpw8_4g", "imei": DISABLED_IMEI, "organization_id": org_ids[0]})
        r = await api.call("PATCH", f"/{r.json()['device']['id']}/status", "e2e-admin1", json={"is_active": False})
        check(r.status_code == 200 and r.json()["is_active"] is False, "admin can disable a watch")
        for dev_id, pid in ((wdev_id, pw_id), (bdev_id, pb_id)):
            r = await api.call("POST", f"/{dev_id}/assign", "e2e-doctor", json={"patient_id": pid})
            check(r.status_code == 200 and r.json()["patient_id"] == pid, f"doctor links watch {dev_id} to their patient")

        await pubsub.subscribe(f"patient:{pw_id}:stream", f"patient:{pb_id}:stream",
                               f"patient:{pw_id}:alerts", f"patient:{pb_id}:alerts")
        await gateway.start()
        cmd_task = asyncio.create_task(gateway.command_loop())
        wport, bport = settings.GATEWAY_WONLEX_PORT, settings.GATEWAY_BPW8_PORT

        # ── Wonlex ───────────────────────────────────────────────────────────────────
        w = await Client(Wonlex(W_IMEI), wport).connect()
        await w.send(w.watch.hello())
        await settle()
        login_reply = w.got(lambda f: f.get("type") == "login" and f.get("ref") == "s:reply")
        check(login_reply and login_reply[0].get("bindStatus") == 1, "Wonlex login is answered with bindStatus 1 (linked)")
        sched = w.got(lambda f: f.get("type") == "deviceMeasuringFrequency")
        check(sched and sched[0]["configs"]["upHeartRate"]["interval"] == "5",
              "Wonlex receives its schedule (HR every 5 min, from the global default)")
        check(w.got(lambda f: f.get("type") == "dnDevBindStatus" and f.get("status") == 1),
              "Wonlex is told it is bound to a patient")
        await w.send(w.watch.heartbeat())
        for vital in ("hr", "spo2", "bp", "temp"):
            await w.send(w.watch.reading(vital))
        await settle(1.0)
        async with SessionLocal() as db:
            n = await count(db, Vitals, Vitals.patient_id == pw_id, Vitals.source == "wonlex")
            check(n == 4, f"4 Wonlex readings stored as vitals with source 'wonlex' (got {n})")
            state = await db.get(DeviceConfigState, wdev_id)
            check(state is not None and state.status == "applied", "Wonlex schedule acknowledged: config state 'applied'")
        dev = await device_by_imei(W_IMEI)
        check(dev.is_online and dev.model == "SIM-W" and dev.firmware == "SIM-1.0" and dev.last_ip == "127.0.0.1",
              "Wonlex device row: online, model, firmware and last IP recorded")
        check(await redis.get(f"patient_active:{pw_id}") is not None, "Wonlex patient marked online (patient_active)")

        frame = w.watch.reading("spo2")
        await w.send(frame)
        await settle()
        await w.send(frame)
        await settle()
        async with SessionLocal() as db:
            n = await count(db, Vitals, Vitals.patient_id == pw_id, Vitals.source == "wonlex")
            dups = await count(db, MqttRawMessage, MqttRawMessage.client_id == W_IMEI,
                               MqttRawMessage.parse_status == "duplicate")
            check(n == 5 and dups == 1, f"a resent upload is stored once (rows {n}, duplicates logged {dups})")

        await w.send(w.watch.sos())
        await settle()
        async with SessionLocal() as db:
            alerts = (await db.execute(select(Alert).where(Alert.patient_id == pw_id))).scalars().all()
            kinds = sorted(a.vital_type for a in alerts)
            check(kinds == ["Fall", "SOS"], f"Wonlex SOS and fall raise alerts ({kinds})")
            check(all("near 9.93120, 76.26730" in a.triggered_value for a in alerts), "alerts carry the GPS position")

        # ── BPW8 ─────────────────────────────────────────────────────────────────────
        b = await Client(Bpw8(B_IMEI), bport).connect()
        await b.send(b.watch.hello())
        await settle()
        check(b.got(lambda f: f.endswith("*VER]")), "BPW8 VER is echoed")
        set_hz = b.got(lambda f: "SET_HZ" in f)
        check(set_hz == [f"[CS*{B_IMEI}*0014*SET_HZ,3,0,1440,1,60]"],
              f"BPW8 gets only BP natively (60 min); HR/SpO2 every 5 min are below its 10-min minimum ({set_hz})")
        await b.send(b.watch.heartbeat())
        for vital in ("hr", "spo2", "bp", "temp"):
            await b.send(b.watch.reading(vital))
        await settle()
        async with SessionLocal() as db:
            n = await count(db, Vitals, Vitals.patient_id == pb_id, Vitals.source == "bpw8")
            check(n == 4, f"4 BPW8 readings stored with source 'bpw8' (got {n})")
            state = await db.get(DeviceConfigState, bdev_id)
            check(state and state.status == "sent" and state.device_limits["plan"]["hr"]["mode"] == "requested",
                  "BPW8 config state 'sent' (watch never confirms) with HR in server-requested mode")
        check((await device_by_imei(B_IMEI)).battery_percent == 86, "BPW8 battery from the heartbeat")
        r = await api.call("GET", "/watch-status", "e2e-doctor", params={"patient_ids": f"{pw_id},{pb_id},999999"})
        st = r.json() if r.status_code == 200 else {}
        check(r.status_code == 200 and st.get(str(pb_id), {}).get("type_label") == "CLOC BPW8"
              and st[str(pb_id)]["is_online"] is True and st[str(pb_id)]["battery_percent"] == 86
              and st.get(str(pw_id), {}).get("type_label") == "Wonlex 4G" and "999999" not in st,
              "dashboard watch status: type, online and battery for each 4G patient")
        r = await api.call("GET", "/watch-status", "e2e-admin2", params={"patient_ids": f"{pw_id},{pb_id}"})
        check(r.status_code == 200 and r.json() == {}, "another hospital's admin sees no watch status")

        # BPW8 timestamps are whole seconds: an identical reading within the same second is a
        # resend to dedupe, so let a second pass before the watch measures again.
        await asyncio.sleep(1.1)
        session = gateway.sessions[B_IMEI]
        session.next_due = {v: datetime.utcnow() - timedelta(seconds=1) for v in session.next_due}
        await gateway.poll_requested()
        await settle()
        statuses = sorted(f.split("*")[-1][:-1] for f in b.got(lambda f: "STATUS," in f))
        check(statuses == ["STATUS,10", "STATUS,5", "STATUS,7"],
              f"gateway asks the BPW8 for HR, SpO2 and temperature when due ({statuses})")
        async with SessionLocal() as db:
            n = await count(db, Vitals, Vitals.patient_id == pb_id, Vitals.source == "bpw8")
            check(n == 7, f"the 3 requested readings are stored (rows {n})")

        await b.send([b.watch._f("BPUP,1293874245,80,126,77"),
                      b.watch._f(f"HEART,{int(datetime.utcnow().timestamp())},400")])
        await settle()
        async with SessionLocal() as db:
            latest = (await db.execute(select(Vitals).where(Vitals.patient_id == pb_id)
                                       .order_by(Vitals.id.desc()).limit(1))).scalar_one()
            check(latest.bp_systolic == 126 and abs((latest.created_at - datetime.utcnow()).total_seconds()) < 60,
                  "a reading with a 2011 watch clock is stored at the receive time")
            rejected = (await db.execute(select(MqttRawMessage).where(
                MqttRawMessage.client_id == B_IMEI, MqttRawMessage.topic == "HEART",
                MqttRawMessage.parse_error.like("implausible%")))).scalars().all()
            check(len(rejected) == 1, "HR 400 is rejected as implausible and noted in the raw log")

        await b.send(b.watch.removed())
        await b.send(b.watch.sos())
        await settle()
        async with SessionLocal() as db:
            removed = await count(db, Vitals, Vitals.patient_id == pb_id, Vitals.is_removed.is_(True))
            check(removed == 1, "WEAR 0 stores a 'watch removed' reading")
            sos_count = await count(db, Alert, Alert.patient_id == pb_id, Alert.vital_type == "SOS")
            check(sos_count == 1, "BPW8 SOS raises an alert")
        removed_alerts = [m for m in WHATSAPP_SENT if m["patient_name"] == "E2E BPW8 Patient"
                          and m["hr_value"] == m["spo2_value"] == m["bp_value"] == "N/A"]
        check(len(removed_alerts) == 1,
              "watch removed makes the patient Critical: one WhatsApp to the doctor (recorded, not sent)")
        await b.send(b.watch.reading("hr"))                         # back on the wrist
        await settle()

        # ── phase 5: extra data ──────────────────────────────────────────────────────
        await w.send(w.watch.extras())
        await b.send(b.watch.extras())
        await b.send([b.watch._f(f"LK,{int(datetime.utcnow().timestamp())},1500,0,85")])   # steps 1200 → 1500
        await b.send([b.watch._f(f"LK,{int(datetime.utcnow().timestamp()) + 1},1500,0,85")])  # unchanged: not stored
        await b.send([b.watch._f(f"BREATH,{int(datetime.utcnow().timestamp())},99")])       # implausible
        await settle(1.0)
        async with SessionLocal() as db:
            def metric(pid, kind):
                return select(PatientMetric).where(PatientMetric.patient_id == pid, PatientMetric.kind == kind)
            w_rr = (await db.execute(metric(pw_id, "resp_rate"))).scalars().all()
            w_glu = (await db.execute(metric(pw_id, "glucose"))).scalars().all()
            w_steps = (await db.execute(metric(pw_id, "steps"))).scalars().all()
            check([m.value for m in w_rr] == [16] and [m.value for m in w_glu] == [6.1] and [m.value for m in w_steps] == [3200],
                  "Wonlex respiratory rate, glucose and steps are stored as patient metrics")
            b_rr = (await db.execute(metric(pb_id, "resp_rate"))).scalars().all()
            check([m.value for m in b_rr] == [17], f"BPW8 BREATH 17 stored; BREATH 99 rejected as implausible ({[m.value for m in b_rr]})")
            b_steps = (await db.execute(metric(pb_id, "steps"))).scalars().all()
            check(sorted(m.value for m in b_steps) == [1200, 1500],
                  f"BPW8 step count stored only when it changes ({sorted(m.value for m in b_steps)})")
            hrv = (await db.execute(select(Vitals).where(Vitals.patient_id == pb_id, Vitals.hrv_score > 0))).scalars().all()
            check(len(hrv) == 1 and 5 < hrv[0].hrv_score < 60,
                  f"HRV is computed from the BPW8's RR intervals (RMSSD {hrv[0].hrv_score if hrv else None} ms)")
            ws = (await db.execute(select(SleepSession).where(SleepSession.patient_id == pw_id))).scalars().all()
            check(len(ws) == 1 and (ws[0].deep_min, ws[0].light_min, ws[0].rem_min, ws[0].awake_min, ws[0].total_min)
                  == (90, 240, 70, 20, 400), "Wonlex sleep stored: deep 90, light 240, REM 70, awake 20 (total asleep 400 min)")
            bs = (await db.execute(select(SleepSession).where(SleepSession.patient_id == pb_id))).scalars().all()
            check(len(bs) == 1 and (bs[0].deep_min, bs[0].light_min) == (95, 250), "BPW8 sleep summary stored")
            locs = (await db.execute(select(DeviceLocation).where(DeviceLocation.patient_id == pb_id,
                                                                    DeviceLocation.reason == "scheduled"))).scalars().all()
            check(any(l.lat == 9.9312 and l.lon == 76.2673 for l in locs), "BPW8 GPS position stored")
        # the same night re-sent with more sleep replaces the row instead of adding one
        await b.send([b.watch._f(f"SLEEP,{int(datetime.utcnow().timestamp()) + 5},100,260")])
        await settle()
        async with SessionLocal() as db:
            bs = (await db.execute(select(SleepSession).where(SleepSession.patient_id == pb_id))).scalars().all()
            check(len(bs) == 1 and (bs[0].deep_min, bs[0].light_min) == (100, 260),
                  "a re-sent night updates the same sleep row")
        # an SOS without a GPS fix uses the last known position
        await b.send([b.watch._f("SOS")])
        await settle()
        async with SessionLocal() as db:
            sos = (await db.execute(select(Alert).where(Alert.patient_id == pb_id, Alert.vital_type == "SOS")
                                    .order_by(Alert.id.desc()))).scalars().first()
            check(sos is not None and "near 9.93120, 76.26730" in sos.triggered_value,
                  f"an SOS without GPS uses the last known position ({sos.triggered_value if sos else None})")
        r = await api.call("GET", f"/patients/{pb_id}/watch-data", "e2e-doctor")
        d = r.json() if r.status_code == 200 else {}
        check(r.status_code == 200 and d["latest"]["resp_rate"]["value"] == 17 and d["latest"]["steps"]["value"] == 1500
              and d["sleep"][0]["deep_min"] == 100 and d["location"]["lat"] == 9.9312
              and len(d["series"]["steps"]) == 2,
              "GET /patients/{id}/watch-data returns latest metrics, series, sleep and last location")
        r = await api.call("GET", f"/patients/{pb_id}/watch-data", "e2e-admin2")
        check(r.status_code == 403, "another hospital's admin can't read this patient's watch data")

        # get_message returns None for subscribe confirmations too, so drain for a fixed time.
        streamed = alerts_pub = 0
        loop = asyncio.get_running_loop()
        until = loop.time() + 1.5
        while loop.time() < until:
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
            if msg is None:
                continue
            if msg["channel"].decode().endswith(":stream"):
                streamed += 1
            else:
                alerts_pub += 1
        check(streamed >= 15, f"readings published to the live dashboard stream ({streamed})")
        check(alerts_pub >= 3, f"alarms published to the live alert channel ({alerts_pub})")

        # ── an unacknowledged Wonlex schedule is resent, then given up on ────────────
        async with SessionLocal() as db:
            state = await db.get(DeviceConfigState, wdev_id)
            state.status, state.attempts = "sent", 1
            state.last_sent_at = datetime.utcnow() - timedelta(minutes=3)
            await db.commit()
        mark = w.mark()
        await gateway.retry_configs()
        await settle()
        async with SessionLocal() as db:
            state = await db.get(DeviceConfigState, wdev_id)
        check(w.since(mark, lambda f: f.get("type") == "deviceMeasuringFrequency") and state.status == "applied",
              "an unacknowledged Wonlex schedule is resent after 2 minutes (and applied on the ack)")
        async with SessionLocal() as db:
            state = await db.get(DeviceConfigState, wdev_id)
            state.status, state.attempts = "sent", 3
            state.last_sent_at = datetime.utcnow() - timedelta(minutes=3)
            await db.commit()
        await gateway.retry_configs()
        async with SessionLocal() as db:
            state = await db.get(DeviceConfigState, wdev_id)
            check(state.status == "failed", "after 3 unacknowledged attempts the schedule is marked failed")
            state.status = "applied"
            await db.commit()

        # ── API while the watches are connected: schedules, measure now, commands ──────
        mark = w.mark()
        r = await api.call("PUT", f"/patients/{pw_id}/monitoring", "e2e-doctor",
                           json={"hr_interval_min": 15, "spo2_interval_min": 15, "bp_interval_min": 120,
                                 "temp_interval_min": 60, "upload_interval_min": 5})
        await settle(1.0)
        new = w.since(mark, lambda f: f.get("type") == "deviceMeasuringFrequency")
        check(r.status_code == 200 and r.json()["level"] == "patient" and new
              and new[-1]["configs"]["upHeartRate"]["interval"] == "15",
              "doctor sets a patient schedule (HR 15 min); the Wonlex receives it at once")

        # a daily window that is closed right now: the Wonlex has no window of its own, so the
        # gateway switches its measurements off until the window opens
        local = datetime.utcnow() + timedelta(minutes=settings.MQTT_DEFAULT_TZ_MINUTES)
        start, end = (local + timedelta(hours=2)).strftime("%H:%M"), (local + timedelta(hours=3)).strftime("%H:%M")
        mark = w.mark()
        r = await api.call("PUT", f"/patients/{pw_id}/monitoring", "e2e-doctor",
                           json={"hr_interval_min": 15, "spo2_interval_min": 15, "bp_interval_min": 120,
                                 "temp_interval_min": 60, "upload_interval_min": 5,
                                 "window_start": start, "window_end": end})
        await settle(1.0)
        new = w.since(mark, lambda f: f.get("type") == "deviceMeasuringFrequency")
        check(r.status_code == 200 and new and all(c["interval"] == "0" for c in new[-1]["configs"].values()),
              f"outside the patient's daily window ({start}-{end}) the Wonlex's measurements are switched off")
        r = await api.call("PUT", f"/patients/{pw_id}/monitoring", "e2e-doctor",
                           json={"hr_interval_min": 15, "spo2_interval_min": 15, "bp_interval_min": 120,
                                 "temp_interval_min": 60, "upload_interval_min": 5})
        await settle(1.0)

        r = await api.call("PUT", "/monitoring/defaults", "e2e-admin2",
                           params={"organization_id": org_ids[0]}, json={"hr_interval_min": 30})
        check(r.status_code == 403, "another hospital's admin can't change this hospital's default")
        r = await api.call("PUT", "/monitoring/defaults", "e2e-doctor", json={"hr_interval_min": 30})
        check(r.status_code == 403, "a doctor can't change hospital defaults")

        wmark, bmark = w.mark(), b.mark()
        r = await api.call("PUT", "/monitoring/defaults", "e2e-admin1",
                           json={"hr_interval_min": 20, "spo2_interval_min": 10, "bp_interval_min": 30,
                                 "temp_interval_min": 60, "upload_interval_min": 5})
        await settle(1.0)
        bnew = b.since(bmark, lambda f: "SET_HZ" in f)
        check(r.status_code == 200 and r.json()["level"] == "hospital" and r.json()["watches_updating"] == 1,
              "org admin sets their hospital's default; one watch (the BPW8 patient, no override) updates")
        check(sorted(bnew) == sorted([f"[CS*{B_IMEI}*000b*SET_HZ,1,20]", f"[CS*{B_IMEI}*000b*SET_HZ,2,10]",
                                      f"[CS*{B_IMEI}*0014*SET_HZ,3,0,1440,1,30]"]),
              f"the BPW8 receives the hospital schedule natively: HR 20, SpO2 10, BP 30 ({bnew})")
        check(not w.since(wmark, lambda f: f.get("type") == "deviceMeasuringFrequency"),
              "the Wonlex patient keeps their own override (no new schedule sent)")
        r = await api.call("GET", "/monitoring/defaults", "e2e-master")
        check(r.status_code == 200 and r.json()["level"] == "global" and r.json()["hr_interval_min"] == 5,
              "the global default is untouched")
        r = await api.call("GET", f"/patients/{pb_id}/monitoring", "e2e-doctor")
        check(r.status_code == 200 and r.json()["level"] == "hospital" and r.json()["device_type"]["key"] == "bpw8_4g",
              "the BPW8 patient's schedule shows it comes from the hospital default")

        bmark = b.mark()
        r = await api.call("POST", f"/{bdev_id}/measure", "e2e-doctor", json={"vital": "spo2"})
        await settle()
        check(r.status_code == 200 and b.since(bmark, lambda f: f.endswith("*STATUS,7]")),
              "doctor taps Measure now (SpO2); the BPW8 receives STATUS,7")
        r = await api.call("POST", f"/{bdev_id}/measure", "e2e-doctor", json={"vital": "spo2"})
        check(r.status_code == 429, "a second Measure now within 2 minutes is refused")
        r = await api.call("POST", f"/{bdev_id}/measure", "e2e-doctor", json={"vital": "stress"})
        check(r.status_code == 422, "Measure now for a vital the watch can't measure on request is refused")
        r = await api.call("POST", f"/patients/{pb_id}/live", "e2e-doctor", json={"on": True})
        check(r.status_code == 409, "live mode is refused for a watch that can't stream")

        wmark = w.mark()
        r = await api.call("POST", f"/{wdev_id}/command", "e2e-admin1", json={"action": "locate"})
        await settle()
        check(r.status_code == 200 and w.since(wmark, lambda f: f.get("type") == "dnLocation"),
              "admin asks the Wonlex for its location (dnLocation)")
        r = await api.call("POST", f"/{wdev_id}/command", "e2e-doctor", json={"action": "reboot"})
        check(r.status_code == 403, "a doctor can't reboot a watch")

        wmark = w.mark()
        r = await api.call("POST", f"/{wdev_id}/unassign", "e2e-doctor")
        await settle()
        check(r.status_code == 200 and w.since(wmark, lambda f: f.get("type") == "dnDevBindStatus" and f.get("status") == 0),
              "doctor unlinks the Wonlex; the watch is told it's unbound")
        before = 0
        async with SessionLocal() as db:
            before = await count(db, Vitals, Vitals.patient_id == pw_id)
        await w.send(w.watch.reading("hr"))
        await settle()
        async with SessionLocal() as db:
            after = await count(db, Vitals, Vitals.patient_id == pw_id)
        check(after == before, "readings from an unlinked watch are not added to anyone's chart")

        bmark = b.mark()
        r = await api.call("DELETE", "/monitoring/defaults", "e2e-admin1")
        await settle(1.0)
        check(r.status_code == 200 and r.json()["level"] == "global"
              and b.since(bmark, lambda f: f.endswith("*SET_HZ,3,0,1440,1,60]")),
              "org admin resets the hospital default; the BPW8 goes back to the global schedule")

        # ── connection checks ─────────────────────────────────────────────────────────
        u = await Client(Bpw8(UNKNOWN_IMEI), bport).connect()
        await u.send(u.watch.hello())
        await asyncio.wait_for(u.closed.wait(), 3)
        async with SessionLocal() as db:
            logged = await count(db, MqttRawMessage, MqttRawMessage.client_id == UNKNOWN_IMEI,
                                 MqttRawMessage.parse_status == "unknown_device")
        check(u.closed.is_set() and logged == 1, "an unregistered IMEI is disconnected and logged once")
        d = await Client(Bpw8(DISABLED_IMEI), bport).connect()
        await d.send(d.watch.hello())
        await asyncio.wait_for(d.closed.wait(), 3)
        check(d.closed.is_set(), "a disabled watch is disconnected")
        x = await Client(Wonlex(B_IMEI), wport).connect()            # a BPW8 IMEI on the Wonlex port
        await x.send(x.watch.hello())
        await asyncio.wait_for(x.closed.wait(), 3)
        check(x.closed.is_set(), "a watch connecting on the wrong type's port is disconnected")
        silent = await Client(Bpw8(B_IMEI), bport).connect()
        await asyncio.wait_for(silent.closed.wait(), settings.GATEWAY_FIRST_FRAME_S + 2)
        check(silent.closed.is_set(), "a connection that never identifies itself is closed")

        b2 = await Client(Bpw8(B_IMEI), bport).connect()             # same IMEI again
        await b2.send(b2.watch.hello())
        await asyncio.wait_for(b.closed.wait(), 3)
        await settle()                                              # the old socket closes before the commit
        check(b.closed.is_set() and (await device_by_imei(B_IMEI)).duplicate_login_at is not None,
              "a second connection for one IMEI replaces the first and is flagged")

        r = await api.call("PATCH", f"/{bdev_id}/status", "e2e-admin1", json={"is_active": False})
        await asyncio.wait_for(b2.closed.wait(), 3)
        await settle()
        check(r.status_code == 200 and b2.closed.is_set() and not (await device_by_imei(B_IMEI)).is_online,
              "admin disables the BPW8: it's disconnected at once and shows offline")
        r = await api.call("GET", "/watch-status", "e2e-doctor", params={"patient_ids": str(pb_id)})
        check(r.json().get(str(pb_id), {}).get("is_online") is False, "dashboard watch status shows the BPW8 offline")

        # ── archive and restore ────────────────────────────────────────────────────
        r = await api.call("POST", f"/{wdev_id}/assign", "e2e-doctor", json={"patient_id": pw_id})
        r = await api.call("POST", f"/{wdev_id}/archive", "e2e-doctor", json={"reason": "lost"})
        check(r.status_code == 403, "a doctor can't archive a watch")
        r = await api.call("POST", f"/{wdev_id}/archive", "e2e-admin1", json={"reason": "Lost on ward 3"})
        await asyncio.wait_for(w.closed.wait(), 7)
        await settle()
        check(r.status_code == 200 and r.json()["archived_at"] and r.json()["patient_id"] is None and w.closed.is_set(),
              "admin archives the connected Wonlex: it's unlinked and disconnected at once")
        async with SessionLocal() as db:
            open_links = await count(db, DeviceAssignment, DeviceAssignment.device_id == wdev_id,
                                     DeviceAssignment.unassigned_at.is_(None))
            kept = await count(db, Vitals, Vitals.patient_id == pw_id, Vitals.source == "wonlex")
        check(open_links == 0 and kept > 0, f"its link is closed and its {kept} readings are kept")
        in_use = [d["client_id"] for d in (await api.call("GET", "", "e2e-admin1")).json()]
        archived = (await api.call("GET", "", "e2e-admin1", params={"archived": "true"})).json()
        avail = [d["client_id"] for d in (await api.call("GET", "/available", "e2e-doctor")).json()]
        check(W_IMEI not in in_use and W_IMEI not in avail and [a["archive_reason"] for a in archived if a["client_id"] == W_IMEI] == ["Lost on ward 3"],
              "archived watch is hidden from the list and the bedside picker, and listed under archived with its reason")
        r = await api.call("PATCH", f"/{wdev_id}/status", "e2e-admin1", json={"is_active": True})
        check(r.status_code == 409, "an archived watch can't simply be re-enabled")
        r = await api.call("POST", f"/{wdev_id}/assign", "e2e-doctor", json={"patient_id": pw_id})
        check(r.status_code == 404, "an archived watch can't be linked to a patient")
        r = await api.call("POST", "", "e2e-admin1", json={"type": "wonlex_4g", "imei": W_IMEI})
        check(r.status_code == 409 and "archived" in r.json()["detail"], "re-registering its IMEI points to Restore")
        w2 = await Client(Wonlex(W_IMEI), wport).connect()
        await w2.send(w2.watch.hello())
        await asyncio.wait_for(w2.closed.wait(), 3)
        check(w2.closed.is_set(), "an archived watch is refused when it reconnects")
        r = await api.call("POST", f"/{wdev_id}/restore", "e2e-admin1")
        in_use = [d["client_id"] for d in (await api.call("GET", "", "e2e-admin1")).json()]
        check(r.status_code == 200 and r.json()["is_active"] and not r.json()["archived_at"] and W_IMEI in in_use,
              "restore brings it back: active, unlinked, in the list again")
        w = await Client(Wonlex(W_IMEI), wport).connect()
        await w.send(w.watch.hello())
        await settle()
        check(w.got(lambda f: f.get("type") == "login" and f.get("bindStatus") == 0) and not w.closed.is_set(),
              "the restored watch connects again (not linked yet)")

        await w.close()
        for c in (u, d, x, silent):
            await c.close()
    finally:
        if cmd_task:
            cmd_task.cancel()
        await gateway.stop()
        await pubsub.unsubscribe()
        await api.http.aclose()
        await cleanup(org_ids, user_ids, [pw_id, pb_id], imeis)

    failed = [what for ok, what in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
