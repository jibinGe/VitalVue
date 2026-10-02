"""Simulate a Wonlex or CLOC BPW8 4G watch against the device-gateway.

    python -m simulators.tcp_watch_sim --type wonlex --imei 352273017386001
    python -m simulators.tcp_watch_sim --type bpw8 --imei 867956070000018 --scenario sos

Scenarios:
  normal   identify, heartbeat, then a reading of each vital every --every seconds (values in
           the NEWS2 normal range, so the patient stays Stable)
  sos      identify, one reading, then an SOS (and for Wonlex a fall)
  removed  identify, one reading, then "watch taken off"
  resend   identify, then the same upload twice (the server must store it once)
With --extras the watch also sends its non-vital data once (respiratory rate, glucose or RR
intervals, steps, sleep, a GPS position). Everything the server sends back is printed. The simulator answers measure-now requests
with a reading, like a real watch.
"""
import argparse
import asyncio
import json
import random
import struct
import time

WONLEX_MAGIC = b"\xfc\xaf"


def now_ms() -> int:
    return int(time.time() * 1000)


class Wonlex:
    def __init__(self, imei: str):
        self.imei = imei
        self.buf = bytearray()

    def _msg(self, type_: str, **fields) -> bytes:
        msg = {"type": type_, "ident": random.randint(100000, 999999), "ref": "w:update", "imei": self.imei,
               "deviceModel": "SIM-W", "timestamp": now_ms(), **fields}
        body = json.dumps(msg).encode()
        return WONLEX_MAGIC + struct.pack(">H", len(body)) + body

    def hello(self):
        return [self._msg("login", platform="ASR", iccId="89860121801575995911", batteryLevel=88, Version="SIM-1.0")]

    def heartbeat(self):
        return [self._msg("heartbeat", batteryLevel=87, batteryState=0)]

    def reading(self, vital: str, trigger: int = 0):
        if vital == "hr":
            return [self._msg("upHeartRate", data=str(random.randint(68, 92)), testType=trigger)]
        if vital == "spo2":
            return [self._msg("upBO", data=str(random.randint(96, 99)), testType=trigger)]
        if vital == "bp":
            return [self._msg("upBP", data=f"{random.randint(112, 128)}/{random.randint(72, 84)}/{random.randint(68, 90)}",
                              testType=trigger)]
        if vital == "temp":
            return [self._msg("upBodyTemperature", data=f"36.6/{random.uniform(32.5, 34.0):.1f}/27.0", testType=trigger)]
        return []

    def sos(self):
        gps = {"lon": "76.2673", "lat": "9.9312", "height": 10, "satelliteNum": 6, "Type": 0}
        return [self._msg("upLocation", positionDataType="sos", baseStationType=0, gps=gps),
                self._msg("upLocation", positionDataType="fall", baseStationType=0, gps=gps)]

    def removed(self):
        return []                                    # the Wonlex protocol has no wear event

    def extras(self):
        """Respiratory rate, glucose, today's steps and last night's sleep."""
        end = now_ms()
        start = end - 7 * 3600 * 1000
        segs = [{"startTime": start, "endTime": start + 90 * 60000, "duration": 90, "sleepType": "deepSleep"},
                {"startTime": start + 90 * 60000, "endTime": start + 330 * 60000, "duration": 240, "sleepType": "lightSleep"},
                {"startTime": start + 330 * 60000, "endTime": start + 400 * 60000, "duration": 70, "sleepType": "rem"},
                {"startTime": start + 400 * 60000, "endTime": end, "duration": 20, "sleepType": "sober"}]
        return [self._msg("upBreathe", data="16"), self._msg("upBS", data="6.1"),
                self._msg("upTodayActivity", step=3200, exerciseTime=1800),
                self._msg("upSleep", IsAccumulative=1, startTime=start, endTime=end, dateTime=segs)]

    def replies_to(self, frame: dict) -> list[bytes]:
        type_ = frame.get("type", "")
        ref = frame.get("ref")
        vital = {"dnHeartRate": "hr", "dnBO": "spo2", "dnBP": "bp", "dnTemperature": "temp"}.get(type_)
        if ref == "s:down":                           # answer every command, as the watch does
            ack = {"type": type_, "ident": frame.get("ident"), "ref": "w:reply", "imei": self.imei,
                   "timestamp": now_ms()}
            body = json.dumps(ack).encode()
            out = [WONLEX_MAGIC + struct.pack(">H", len(body)) + body]
            if vital:
                out += self.reading(vital, trigger=2)
            return out
        return []

    def frames(self, data: bytes) -> list:
        self.buf += data
        out = []
        while True:
            i = self.buf.find(WONLEX_MAGIC)
            if i < 0 or len(self.buf) < i + 4:
                return out
            (n,) = struct.unpack(">H", bytes(self.buf[i + 2:i + 4]))
            if len(self.buf) < i + 4 + n:
                return out
            out.append(json.loads(bytes(self.buf[i + 4:i + 4 + n])))
            del self.buf[:i + 4 + n]


class Bpw8:
    def __init__(self, imei: str):
        self.imei = imei
        self.buf = bytearray()

    def _f(self, content: str) -> bytes:
        body = content.encode()
        return f"[CS*{self.imei}*{len(body):04x}*".encode() + body + b"]"

    def hello(self):
        return [self._f(f"VER,{int(time.time())},BPW8_SIM0.01")]

    def heartbeat(self):
        return [self._f(f"LK,{int(time.time())},1200,0,86")]

    def reading(self, vital: str, trigger: int = 0):
        t = int(time.time())
        if vital == "hr":
            return [self._f(f"HEART,{t},{random.randint(68, 92)}")]
        if vital == "spo2":
            return [self._f(f"SPO2,{t},{random.randint(96, 99)}")]
        if vital == "bp":
            return [self._f(f"BPUP,{t},{random.randint(68, 90)},{random.randint(112, 128)},{random.randint(72, 84)}")]
        if vital == "temp":
            return [self._f(f"TEMP,{t},{random.uniform(33.0, 35.5):.1f},26.0")]
        return []

    def sos(self):
        stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
        return [self._f(f"SOS,3,{stamp},106,0E76.267300N9.931200T{stamp}@404!45!9231!2351@wifi!AC:BC:32:78:A2:5F!-70")]

    def removed(self):
        return [self._f(f"WEAR,{int(time.time())},0")]

    def extras(self):
        """Respiratory rate, raw RR intervals, sleep summary and a GPS position."""
        t = int(time.time())
        rr = ",".join(str(800 + random.randint(-25, 25)) for _ in range(40))
        return [self._f(f"BREATH,{t},17"), self._f(f"HRV_RRI,{t},{rr}"), self._f(f"SLEEP,{t},95,250"),
                self._f(f"UD,3,{t},152,1N9.931200E76.267300@404!45!9231!2351!60@wifi0!04:6b:25:f1:0e:b1!-40")]

    def replies_to(self, frame: str) -> list[bytes]:
        content = frame[1:-1].split("*", 3)[-1]
        if content.startswith("STATUS,"):
            vital = {"5": "hr", "6": "bp", "7": "spo2", "10": "temp"}.get(content.split(",")[1])
            return self.reading(vital) if vital else []
        return []

    def frames(self, data: bytes) -> list:
        self.buf += data
        out = []
        while (end := self.buf.find(b"]")) >= 0:
            start = self.buf.find(b"[")
            if 0 <= start < end:
                out.append(bytes(self.buf[start:end + 1]).decode())
            del self.buf[:end + 1]
        return out


async def run(args) -> None:
    watch = Wonlex(args.imei) if args.type == "wonlex" else Bpw8(args.imei)
    reader, writer = await asyncio.open_connection(args.host, args.port)
    print(f"connected to {args.host}:{args.port} as {args.type} {args.imei}")

    async def send(chunks):
        for c in chunks:
            writer.write(c)
            print(">>", c[4:].decode() if args.type == "wonlex" else c.decode())
        await writer.drain()

    async def listen():
        while data := await reader.read(4096):
            for frame in watch.frames(data):
                print("<<", json.dumps(frame) if isinstance(frame, dict) else frame)
                await send(watch.replies_to(frame))
        print("server closed the connection")

    listener = asyncio.create_task(listen())
    await send(watch.hello())
    await asyncio.sleep(0.5)
    await send(watch.heartbeat())
    if args.scenario == "resend":
        frame = watch.reading("spo2")
        await send(frame)
        await asyncio.sleep(0.5)
        await send(frame)                               # identical upload again
    else:
        for vital in ("hr", "spo2", "bp", "temp"):
            await send(watch.reading(vital))
            await asyncio.sleep(0.3)
    if args.extras:
        await send(watch.extras())
    if args.scenario == "sos":
        await send(watch.sos())
    elif args.scenario == "removed":
        await send(watch.removed())
    if args.scenario == "normal" and args.every:
        try:
            while True:
                await asyncio.sleep(args.every)
                await send(watch.heartbeat())
                for vital in ("hr", "spo2"):
                    await send(watch.reading(vital))
        except asyncio.CancelledError:
            pass
    else:
        await asyncio.sleep(args.linger)
    listener.cancel()
    writer.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--type", choices=("wonlex", "bpw8"), required=True)
    ap.add_argument("--imei", required=True)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int)
    ap.add_argument("--scenario", choices=("normal", "sos", "removed", "resend"), default="normal")
    ap.add_argument("--every", type=float, default=0, help="normal: keep sending every N seconds (0 = once)")
    ap.add_argument("--linger", type=float, default=3, help="seconds to stay connected at the end")
    ap.add_argument("--extras", action="store_true",
                    help="also send respiratory rate, glucose/RR intervals, steps, sleep and a GPS position once")
    args = ap.parse_args()
    args.port = args.port or (7700 if args.type == "wonlex" else 7701)
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
