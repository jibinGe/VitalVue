"""CLOC BPW8 health watch (BPW8 Watch TCP protocol, TECH-2025-006).

Frame:  [CS*<IMEI>*<LEN>*<CMD>,<arg>,<arg>…]   LEN = 4 hex digits, byte length of what follows
        the third "*". The document's own examples get LEN wrong and add stray spaces, so frames
        are cut on the brackets and LEN is only checked loosely.
Acks:   the server echoes [CS*<IMEI>*<LEN>*<CMD>].
Time:   epoch seconds (SOS also uses YYYYMMDDhhmmss). CONFIRM whether these are UTC.

The watch has no login secret and never acknowledges settings (SET_HZ). It has no fall event.
"""
import hashlib
import re
from datetime import datetime
from typing import Optional

from app.devices import events as ev
from app.devices.adapters.base import Codec, Decoded, from_epoch, to_float, to_int
from app.models.device import DEVICE_BPW8

MAX_FRAME = 8 * 1024
# Uplinks we acknowledge with a bare echo. WEATHER would want a weather report back; CONFIRM
# with CLOC what minimum reply keeps the watch happy.
ECHOED = {"VER", "LK", "UD", "SOS", "WEATHER", "BATTERY", "TEMP", "HEART", "BPUP", "SPO2", "SLEEP",
          "WSLEEP", "HRV", "HRV_RRI", "BREATH", "SET_PROFILE", "WEAR", "REMIND"}
MEASURE_STATUS = {"hr": 5, "bp": 6, "spo2": 7, "temp": 10}
SET_HZ = {"hr": 1, "spo2": 2}              # SET_HZ,<type>,<minutes>; BP (3) has time windows
BATTERY_REASON = {0: "on", 1: "off", 2: "scheduled", 3: "low"}
_COORD = re.compile(r"([NSEW])(-?\d+(?:\.\d+)?)")


def frame(imei: str, content: str) -> bytes:
    body = content.encode("utf-8")
    return f"[CS*{imei}*{len(body):04x}*".encode("ascii") + body + b"]"


def parse_time(value) -> Optional[datetime]:
    s = str(value or "").strip()
    if len(s) == 14 and s.isdigit():
        try:
            return datetime.strptime(s, "%Y%m%d%H%M%S")
        except ValueError:
            return None
    return from_epoch(s, "s") if s.isdigit() else None


def parse_location(args: list[str], reason: str) -> ev.Location:
    """UD / SOS / WEATHER: <n>,<time>,<n>,<gps>@<cell>@<wifi list> — best effort (the document
    doesn't describe the leading fields)."""
    at = parse_time(args[1]) if len(args) > 1 else None
    rest = ",".join(args[3:]) if len(args) > 3 else ",".join(args)
    parts = rest.split("@")
    lat = lon = None
    for axis, num in _COORD.findall(parts[0] if parts else ""):
        v = to_float(num)
        if axis in "NS":
            lat = -v if axis == "S" and v else v
        else:
            lon = -v if axis == "W" and v else v
    if not lat and not lon:
        lat = lon = None
    cell = parts[1].split("!") if len(parts) > 1 else []
    wifi = []
    for item in (parts[2].split("#") if len(parts) > 2 else []):
        bits = item.split("!")
        if len(bits) >= 3:
            wifi.append({"mac": bits[1], "rssi": to_int(bits[2])})
    source = "gps" if lat is not None else ("wifi" if wifi else ("cell" if cell else "unknown"))
    raw = {"gps": parts[0] if parts else "", "cell": cell, "wifi": wifi}
    return ev.Location(at, lat=lat, lon=lon, source=source, reason=reason, raw=raw)


class Bpw8Codec(Codec):
    device_type = DEVICE_BPW8

    # ── framing ──────────────────────────────────────────────────────────────────────

    def _frames(self) -> list[bytes]:
        frames = []
        buf = self.buffer
        while True:
            start = buf.find(b"[")
            if start < 0:
                self.dropped_bytes += len(buf)
                buf.clear()
                return frames
            if start:
                self.dropped_bytes += start
                del buf[:start]
            end = buf.find(b"]")
            if end < 0:
                if len(buf) > MAX_FRAME:
                    self.dropped_bytes += len(buf)
                    buf.clear()
                return frames
            nested = buf.find(b"[", 1, end)     # an unterminated frame followed by a new one
            if nested > 0:
                self.dropped_bytes += nested
                del buf[:nested]
                continue
            frames.append(bytes(buf[:end + 1]))
            del buf[:end + 1]

    # ── decoding ─────────────────────────────────────────────────────────────────────

    def decode(self, frame: bytes, now: datetime) -> Decoded:
        text = frame.decode("utf-8", errors="replace").strip()
        if not (text.startswith("[") and text.endswith("]")):
            return Decoded(imei=None, name="invalid", error="not a [CS*…] frame")
        parts = text[1:-1].split("*", 3)
        if len(parts) < 4 or parts[0].strip().upper() != "CS":
            return Decoded(imei=None, name="invalid", error="not a [CS*…] frame")
        imei = parts[1].strip()
        if not imei.isdigit():
            return Decoded(imei=None, name="invalid", error="IMEI is not numeric")
        content = parts[3].strip()
        cmd, _, argstr = content.partition(",")
        cmd = cmd.strip().upper()
        args = [a.strip() for a in argstr.split(",")] if argstr else []
        dec = Decoded(imei=imei, name=cmd or "invalid", raw={"cmd": cmd, "len": parts[2].strip()})
        if not cmd:
            dec.error = "empty command"
            return dec

        ts = parse_time(args[0]) if args else None
        events = dec.events
        n = lambda i: args[i] if len(args) > i else None   # noqa: E731
        if cmd == "VER":
            version = n(1) or n(0)
            events.append(ev.Hello(model=(version or "").split("_")[0] or None, firmware=version))
        elif cmd == "LK":
            # Example: LK,<time>,<steps>,<roll count>,<battery>; older form without the time.
            if len(args) >= 4:
                events.append(ev.Heartbeat(battery=to_int(args[3]), steps=to_int(args[1])))
            elif len(args) == 3:
                events.append(ev.Heartbeat(battery=to_int(args[2]), steps=to_int(args[0])))
            else:
                events.append(ev.Heartbeat())
        elif cmd == "HEART":
            events.append(ev.VitalSample(ts, heart_rate=to_int(n(1))))
        elif cmd == "BPUP":                                   # time, heart rate, systolic, diastolic
            events.append(ev.VitalSample(ts, heart_rate=to_int(n(1)), bp_sys=to_int(n(2)), bp_dia=to_int(n(3))))
        elif cmd == "SPO2":
            events.append(ev.VitalSample(ts, spo2=to_float(n(1))))
        elif cmd == "TEMP":
            # CONFIRM: in the example "internal" (35.6) looks like the skin-side sensor and
            # "surface" (24.5) like the watch's outer face.
            events.append(ev.VitalSample(ts, skin_temp=to_float(n(1))))
            if n(2):
                events.append(ev.Metric("surface_temp", ts, value=to_float(n(2)), unit="°C"))
        elif cmd == "HRV":
            events.append(ev.VitalSample(ts, hrv_ms=to_int(n(1))))
        elif cmd == "BREATH":
            events.append(ev.Metric("resp_rate", ts, value=to_float(n(1)), unit="/min"))
        elif cmd == "HRV_RRI":
            events.append(ev.Metric("rri", ts, text=",".join(args[1:]), unit="ms"))
        elif cmd == "WEAR":
            events.append(ev.Wear(worn=n(1) == "1", at=ts))
        elif cmd == "BATTERY":                                # level, charging (0/1), status
            reason = BATTERY_REASON.get(to_int(n(2)))
            charging = to_int(n(1))
            events.append(ev.Battery(to_int(n(0)), None if charging is None else charging == 1, reason))
            if reason == "low":
                events.append(ev.Alarm("low_battery", None))
            elif reason == "off":
                events.append(ev.Alarm("power_off", None))
        elif cmd == "SOS":
            try:
                loc = parse_location(args, "sos")
            except Exception:                                 # never lose an SOS to a parse error
                loc = None
            events.append(ev.Alarm("sos", loc.at if loc else None, loc))
            if loc:
                events.append(loc)
        elif cmd in ("UD", "WEATHER"):
            try:
                events.append(parse_location(args, "scheduled"))
            except Exception:
                events.append(ev.Unhandled(cmd))
        else:
            events.append(ev.Unhandled(cmd))

        if any(isinstance(e, (ev.VitalSample, ev.Metric, ev.Alarm, ev.Location)) for e in events):
            dec.dedupe_key = hashlib.sha256(f"{cmd}|{argstr}".encode()).hexdigest()[:40]
        return dec

    # ── encoding ─────────────────────────────────────────────────────────────────────

    def reply(self, decoded: Decoded, bound: bool, now: datetime) -> Optional[bytes]:
        if decoded.error or not decoded.imei or decoded.name not in ECHOED:
            return None
        return frame(decoded.imei, decoded.name)

    def encode(self, imei: str, command, now: datetime) -> list[bytes]:
        if isinstance(command, ev.ApplySchedule):
            out = []
            for vital, code in SET_HZ.items():
                entry = command.plan.get(vital) or {}
                if entry.get("mode") == "native":
                    out.append(frame(imei, f"SET_HZ,{code},{max(10, int(entry['interval']))}"))
            bp = command.plan.get("bp") or {}
            if bp.get("mode") == "native":
                start, end = 0, 1440
                window = command.plan.get("window")
                if window:
                    start = int(window[0][:2]) * 60 + int(window[0][3:])
                    end = int(window[1][:2]) * 60 + int(window[1][3:])
                out.append(frame(imei, f"SET_HZ,3,{start},{end},1,{max(10, int(bp['interval']))}"))
            return out
        if isinstance(command, ev.MeasureNow):
            status = MEASURE_STATUS.get(command.vital)
            return [frame(imei, f"STATUS,{status}")] if status else []
        if isinstance(command, ev.Locate):
            return [frame(imei, "STATUS,1")]
        if isinstance(command, ev.Reboot):
            return [frame(imei, "STATUS,2")]
        if isinstance(command, ev.PowerOff):
            return [frame(imei, "STATUS,3")]
        return []                         # SetBound / SetAlarmSwitches: nothing on this watch
