"""Load test for the device-gateway: many simulated Wonlex + BPW8 watches at once.

    DATABASE_URL=postgresql://… REDIS_URL=redis://… python -m simulators.load_test --watches 500 --rounds 3

Registers N watches (half Wonlex, half BPW8) linked to N test patients, runs the gateway
in-process, connects every watch at the same moment, then runs R rounds in which each watch
sends a heartbeat and two readings (with a little jitter). Reports how many connections were
admitted, ack latency (send → server's reply), how many readings were stored against how
many were sent, and gateway errors. Removes its test data afterwards. NEVER run against
production: it writes and deletes rows.
"""
import argparse
import asyncio
import os
import random
import sys
import time

os.environ["MSG91_AUTH_KEY"] = "load-test-disabled"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/nonexistent/load-test-disabled.json"
os.environ.setdefault("GATEWAY_WONLEX_PORT", "17710")
os.environ.setdefault("GATEWAY_BPW8_PORT", "17711")

import logging  # noqa: E402

from sqlalchemy import delete, func, select  # noqa: E402

import app.services.ingest as ingest_module  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.database import SessionLocal, get_redis  # noqa: E402
from app.gateway.server import Gateway  # noqa: E402
from app.models.clinical import Alert  # noqa: E402
from app.models.device import (  # noqa: E402
    DEVICE_BPW8, DEVICE_WONLEX, Device, DeviceConfigState, DeviceMessageKey, MqttRawMessage,
)
from app.models.organization import Organization  # noqa: E402
from app.models.user import Patient, User, UserRole  # noqa: E402
from app.models.vitals import Vitals  # noqa: E402
from simulators.tcp_watch_sim import Bpw8, Wonlex  # noqa: E402


async def _no_whatsapp(**_):
    return None


ingest_module.send_critical_alert = _no_whatsapp


def luhn_imei(n: int) -> str:
    body = f"99{n:012d}"                       # 99… prefix: never a real TAC
    total = 0
    for i, ch in enumerate(reversed(body)):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return body + str((10 - total % 10) % 10)


class Watch:
    def __init__(self, sim, port):
        self.sim, self.port = sim, port
        self.latencies: list[float] = []
        self.pending: list[float] = []         # send times of uplinks awaiting their reply
        self.admitted = False
        self.sent_readings = 0

    async def connect(self):
        self.reader, self.writer = await asyncio.open_connection("127.0.0.1", self.port)
        self.task = asyncio.create_task(self._listen())

    async def _listen(self):
        try:
            while data := await self.reader.read(8192):
                for frame in self.sim.frames(data):
                    is_reply = (frame.get("ref") == "s:reply") if isinstance(frame, dict) else (
                        frame.split("*")[-1][:-1] in ("VER", "LK", "HEART", "SPO2", "BPUP", "TEMP"))
                    if is_reply and self.pending:
                        self.latencies.append(time.perf_counter() - self.pending.pop(0))
                        self.admitted = True
                    replies = self.sim.replies_to(frame)
                    if replies:
                        self.writer.write(b"".join(replies))
        except (ConnectionError, OSError):
            pass

    async def send(self, chunks, readings=0):
        for c in chunks:
            self.pending.append(time.perf_counter())
            self.writer.write(c)
        self.sent_readings += readings
        await self.writer.drain()


async def main(n: int, rounds: int, every: float) -> int:
    logging.getLogger("gateway").setLevel(logging.ERROR)
    errors = []

    class Catch(logging.Handler):
        def emit(self, record):
            if record.levelno >= logging.ERROR:
                errors.append(record.getMessage())
    logging.getLogger("gateway").addHandler(Catch())

    redis = await get_redis()
    imeis = [luhn_imei(i) for i in range(n)]
    async with SessionLocal() as db:
        org = Organization(name="Load Test Hospital", country="IN", state="KL", city="Kochi")
        db.add(org)
        await db.flush()
        patients = [Patient(user_id=f"load-{i}", phone_number=f"+9188{i:08d}", full_name=f"Load Patient {i}",
                            role=UserRole.PATIENT, organization_id=org.id, age=60, gender="F", blood_group="O+")
                    for i in range(n)]
        db.add_all(patients)
        await db.flush()
        db.add_all([Device(type=DEVICE_WONLEX if i % 2 == 0 else DEVICE_BPW8, transport="tcp", client_id=imei,
                           organization_id=org.id, patient_id=patients[i].id) for i, imei in enumerate(imeis)])
        await db.commit()
        org_id, patient_ids = org.id, [p.id for p in patients]

    gateway = Gateway(SessionLocal, redis)
    await gateway.start()
    cmd = asyncio.create_task(gateway.command_loop())
    watches = [Watch(Wonlex(imei) if i % 2 == 0 else Bpw8(imei),
                     settings.GATEWAY_WONLEX_PORT if i % 2 == 0 else settings.GATEWAY_BPW8_PORT)
               for i, imei in enumerate(imeis)]
    try:
        t0 = time.perf_counter()
        await asyncio.gather(*(w.connect() for w in watches))
        await asyncio.gather(*(w.send(w.sim.hello()) for w in watches))     # everyone at once
        await asyncio.sleep(2)
        connect_s = time.perf_counter() - t0

        async def round_for(w):
            await asyncio.sleep(random.uniform(0, every))
            await w.send(w.sim.heartbeat())
            await w.send(w.sim.reading("hr") + w.sim.reading("spo2"), readings=2)

        for r in range(rounds):
            t = time.perf_counter()
            await asyncio.gather(*(round_for(w) for w in watches))
            await asyncio.sleep(max(0.0, every - (time.perf_counter() - t)) + 1)
        # Wait until the gateway has worked through its backlog (stored count stops changing).
        drain_start, last, stable = time.perf_counter(), -1, 0
        while stable < 3 and time.perf_counter() - drain_start < 180:
            await asyncio.sleep(2)
            async with SessionLocal() as db:
                now_count = (await db.execute(select(func.count()).select_from(Vitals)
                                              .where(Vitals.patient_id.in_(patient_ids)))).scalar_one()
            stable = stable + 1 if now_count == last else 0
            last = now_count
        drain_s = time.perf_counter() - drain_start - 6

        admitted = sum(1 for w in watches if w.admitted)
        lat = sorted(x for w in watches for x in w.latencies)
        sent = sum(w.sent_readings for w in watches)
        async with SessionLocal() as db:
            stored = (await db.execute(select(func.count()).select_from(Vitals)
                                       .where(Vitals.patient_id.in_(patient_ids)))).scalar_one()
            parse_errors = (await db.execute(select(func.count()).select_from(MqttRawMessage).where(
                MqttRawMessage.client_id.in_(imeis), MqttRawMessage.parse_status == "error"))).scalar_one()
        p = lambda q: lat[min(len(lat) - 1, int(q * len(lat)))] * 1000 if lat else float("nan")   # noqa: E731
        print(f"watches            {n} ({n // 2 + n % 2} Wonlex, {n // 2} BPW8)")
        print(f"connected+admitted {admitted}/{n} in {connect_s:.1f}s; live sessions {len(gateway.sessions)}")
        print(f"ack latency        p50 {p(0.5):.0f} ms, p95 {p(0.95):.0f} ms, p99 {p(0.99):.0f} ms, max {p(1.0):.0f} ms "
              f"({len(lat)} acks)")
        print(f"readings           sent {sent}, stored {stored} (backlog drained {max(0.0, drain_s):.0f}s after the last send)")
        print(f"errors             gateway {len(errors)}, raw parse errors {parse_errors}")
        if errors:
            print("first errors:", *errors[:3], sep="\n  ")
        ok = admitted == n and stored == sent and not errors and not parse_errors
        print("RESULT", "PASS" if ok else "FAIL")
        return 0 if ok else 1
    finally:
        for w in watches:
            w.writer.close()
            w.task.cancel()
        cmd.cancel()
        await gateway.stop()
        await asyncio.sleep(1)
        async with SessionLocal() as db:
            dev_ids = (await db.execute(select(Device.id).where(Device.client_id.in_(imeis)))).scalars().all()
            for model, col in ((DeviceMessageKey, DeviceMessageKey.device_id), (DeviceConfigState, DeviceConfigState.device_id)):
                await db.execute(delete(model).where(col.in_(dev_ids)))
            await db.execute(delete(MqttRawMessage).where(MqttRawMessage.client_id.in_(imeis)))
            await db.execute(delete(Device).where(Device.id.in_(dev_ids)))
            await db.execute(delete(Vitals).where(Vitals.patient_id.in_(patient_ids)))
            await db.execute(delete(Alert).where(Alert.patient_id.in_(patient_ids)))
            await db.execute(delete(Patient).where(Patient.id.in_(patient_ids)))
            await db.execute(delete(User).where(User.id.in_(patient_ids)))
            await db.execute(delete(Organization).where(Organization.id == org_id))
            await db.commit()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--watches", type=int, default=500)
    ap.add_argument("--rounds", type=int, default=3)
    ap.add_argument("--every", type=float, default=10.0, help="seconds per round (sends are spread across it)")
    a = ap.parse_args()
    sys.exit(asyncio.run(main(a.watches, a.rounds, a.every)))
