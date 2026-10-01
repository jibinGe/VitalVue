"""Wonlex 4G health watch, TCP mode (Wonlex Health Watch Integration Protocol V1.1, 2026.06.18).

Frame:   FC AF | length (uint16, big-endian) | JSON (UTF-8)
Message: {"type", "ident", "ref", "imei", "timestamp" (ms), ...fields}. The document shows the
         fields both flat and nested under "data", and spells the value field "data" or "date";
         both forms are accepted, and replies mirror the style the watch itself uses.
Acks:    every upload must be answered with the same type + ident and ref "s:reply", or the
         watch caches it and resends it 5–15 minutes later (hence dedupe keys).

Items marked CONFIRM are guesses from an ambiguous document, to be checked against real frames.
"""
import hashlib
import json
import random
import struct
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.devices import events as ev
from app.devices.adapters.base import Codec, Decoded, epoch_ms, from_epoch, to_float, to_int
from app.models.device import DEVICE_WONLEX

MAGIC = b"\xfc\xaf"
HEADER = 4

# Uplink value types → how to read them. Shared by single uploads and upBatch.
VITAL_TYPES = {"upHeartRate", "upBP", "upBO", "upBodyTemperature", "upHRV"}
METRIC_TYPES = {  # type → (metric kind, unit)
    "upBreathe": ("resp_rate", "/min"), "upBS": ("glucose", "mmol/L"), "upBF": ("lipids", "mmol/L"),
    "upUA": ("uric_acid", "umol/L"), "upKcal": ("kcal", "kcal"),
}
TEST_TYPE = {0: "scheduled", 1: "manual", 2: "requested"}
BATTERY_REASON = {0: "on", 1: "off", 2: "scheduled", 3: "low"}
SCHEDULE_KEYS = {"hr": "upHeartRate", "bp": "upBP", "spo2": "upBO", "temp": "upBodyTemperature"}
MEASURE_TYPES = {"hr": "dnHeartRate", "bp": "dnBP", "spo2": "dnBO", "temp": "dnTemperature", "hrv": "dnHRV"}


# ── signature (encryptionCode) ──────────────────────────────────────────────────────────
# Port of the document's Python example: keys sorted, "key:value:" joined, nested objects and
# arrays flattened the same way, then MD5(joined + key) in uppercase. CONFIRM: the Java and
# Python examples render booleans/floats differently, so this runs in warn mode until real
# frames verify.

def _dict_sort_string(data: dict) -> str:
    out = ""
    for key in sorted(data):
        value = data[key]
        if value is None:
            continue
        if isinstance(value, dict):
            value = _dict_sort_string(value)
        elif isinstance(value, list):
            value = _list_sort_string(value)
        out += f"{key}:{value}:"
    return out


def _list_sort_string(items: list) -> str:
    out = ""
    for value in items:
        if value is None:
            continue
        if isinstance(value, dict):
            value = _dict_sort_string(value)
        elif isinstance(value, list):
            value = _list_sort_string(value)
        out += f"{value}:"
    return out


def sign(message: dict, key: str) -> str:
    body = {k: v for k, v in message.items() if k != "encryptionCode"}
    return hashlib.md5((_dict_sort_string(body) + key).encode("utf-8")).hexdigest().upper()


# ── helpers ─────────────────────────────────────────────────────────────────────────────

def _value(fields: dict) -> Optional[str]:
    """The reading itself: "data" in most examples, "date" in others (a typo in the document)."""
    for k in ("data", "date", "value"):
        v = fields.get(k)
        if isinstance(v, (str, int, float)) and not isinstance(v, bool):
            return str(v).strip()
    return None


def _slash(value: Optional[str]) -> list[Optional[float]]:
    return [to_float(p) for p in (value or "").split("/")] if value else []


def _vital_or_metric(kind: str, value: Optional[str], at: Optional[datetime], trigger: str) -> list:
    """Events for one value of one type (single upload or one item of an upBatch)."""
    if value is None or value == "":
        return []
    if kind == "upHeartRate":
        return [ev.VitalSample(at, heart_rate=to_int(value), trigger=trigger)]
    if kind == "upBO":
        return [ev.VitalSample(at, spo2=to_float(value), trigger=trigger)]
    if kind == "upHRV":
        return [ev.VitalSample(at, hrv_ms=to_int(value), trigger=trigger)]
    if kind == "upBP":                    # "systolic/diastolic[/pulse]"
        p = _slash(value)
        s = ev.VitalSample(at, bp_sys=to_int(p[0]) if p else None,
                           bp_dia=to_int(p[1]) if len(p) > 1 else None, trigger=trigger)
        if len(p) > 2 and p[2]:
            s.heart_rate = to_int(p[2])
        return [s]
    if kind == "upBodyTemperature":
        # CONFIRM order. Document: "body temperature (body surface / environmental)":
        # 3 values = body / skin / ambient, 2 = skin / ambient, 1 = skin.
        p = _slash(value)
        out = []
        if len(p) >= 3:
            out.append(ev.VitalSample(at, body_temp=p[0], skin_temp=p[1], trigger=trigger))
            out.append(ev.Metric("ambient_temp", at, value=p[2], unit="°C"))
        elif len(p) == 2:
            out.append(ev.VitalSample(at, skin_temp=p[0], trigger=trigger))
            out.append(ev.Metric("ambient_temp", at, value=p[1], unit="°C"))
        elif p:
            out.append(ev.VitalSample(at, skin_temp=p[0], trigger=trigger))
        return out
    if kind in METRIC_TYPES:
        metric, unit = METRIC_TYPES[kind]
        return [ev.Metric(metric, at, value=to_float(value), text=value, unit=unit)]
    return []


def _location(fields: dict, at: Optional[datetime], reason: str) -> ev.Location:
    gps = fields.get("gps") if isinstance(fields.get("gps"), dict) else {}
    lat, lon = to_float(gps.get("lat")), to_float(gps.get("lon"))
    if lat == 0 and lon == 0:
        lat = lon = None
    source = "gps" if lat is not None else ("wifi" if fields.get("wifi") else ("cell" if fields.get("baseStation") else "unknown"))
    raw = {k: fields[k] for k in ("gps", "wifi", "baseStation", "baseStationType") if k in fields}
    return ev.Location(at, lat=lat, lon=lon, source=source, reason=reason, raw=raw)


class WonlexCodec(Codec):
    device_type = DEVICE_WONLEX

    def __init__(self) -> None:
        super().__init__()
        self.nested = False               # the watch puts its fields under "data"

    # ── framing ──────────────────────────────────────────────────────────────────────

    def _frames(self) -> list[bytes]:
        frames = []
        buf = self.buffer
        while True:
            start = buf.find(MAGIC)
            if start < 0:
                keep = 1 if buf[-1:] == MAGIC[:1] else 0      # a magic split across two reads
                self.dropped_bytes += len(buf) - keep
                del buf[:len(buf) - keep]
                return frames
            if start:
                self.dropped_bytes += start
                del buf[:start]
            if len(buf) < HEADER:
                return frames
            (length,) = struct.unpack(">H", bytes(buf[2:4]))
            if len(buf) < HEADER + length:
                return frames
            frames.append(bytes(buf[HEADER:HEADER + length]))
            del buf[:HEADER + length]

    @staticmethod
    def frame(payload: dict) -> bytes:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        return MAGIC + struct.pack(">H", len(body)) + body

    # ── decoding ─────────────────────────────────────────────────────────────────────

    def decode(self, frame: bytes, now: datetime) -> Decoded:
        try:
            msg = json.loads(frame.decode("utf-8", errors="replace"))
        except ValueError:
            return Decoded(imei=None, name="invalid", error="not JSON")
        if not isinstance(msg, dict) or not msg.get("type"):
            return Decoded(imei=None, name="invalid", error="no message type")

        name = str(msg["type"])
        fields = dict(msg)
        if isinstance(msg.get("data"), dict):
            self.nested = True
            fields = {**msg["data"], **{k: v for k, v in msg.items() if k != "data"}}
        imei = str(fields.get("imei") or "").strip() or None
        ref = str(msg.get("ref") or "")
        at = from_epoch(fields.get("timestamp"), "ms")
        dec = Decoded(imei=imei, name=name, raw={"ident": msg.get("ident"), "type": name, "ref": ref})

        if settings.WONLEX_SIGNATURE != "off" and settings.WONLEX_SIGN_KEY:
            code = msg.get("encryptionCode")
            dec.signature_ok = None if not code else sign(msg, settings.WONLEX_SIGN_KEY) == str(code).upper()

        if ref == "w:reply":              # the watch answering one of our commands
            dec.is_reply = True
            dec.events.append(ev.Ack(command=name, ok=True, ref=str(msg.get("ident"))))
            return dec

        trigger = TEST_TYPE.get(to_int(fields.get("testType")), "scheduled")
        events = dec.events
        if name == "login":
            events.append(ev.Hello(
                model=fields.get("deviceModel"), firmware=fields.get("Version") or fields.get("firmware_v"),
                iccid=fields.get("iccId"), sim_phone=fields.get("Phone") or fields.get("phone"),
                battery=to_int(fields.get("batteryLevel")),
                extra={k: fields[k] for k in ("platform", "mac", "SN", "OS", "software_v", "dateProduction", "cpuModel",
                                              "networkType", "deviceVendor", "deviceBrand") if k in fields},
            ))
        elif name == "heartbeat":
            state = to_int(fields.get("batteryState"))
            events.append(ev.Heartbeat(battery=to_int(fields.get("batteryLevel")),
                                       charging=None if state is None else state == 1))
        elif name in VITAL_TYPES or name in METRIC_TYPES:
            events.extend(_vital_or_metric(name, _value(fields), at, trigger))
        elif name == "upBatch":
            kind = str(fields.get("dataType") or "")
            values = [v.strip() for v in str(fields.get("data") or "").split(",")]
            times = [t.strip() for t in str(fields.get("dataTime") or "").split(",")]
            for i, value in enumerate(values):
                t = from_epoch(times[i], "ms") if i < len(times) else at
                events.extend(_vital_or_metric(kind, value, t, trigger))
        elif name == "upTodayActivity":
            events.append(ev.Metric("steps", at, value=to_float(fields.get("step")), unit="steps"))
        elif name == "upLocation":
            kind = str(fields.get("positionDataType") or "0").lower()
            reason = {"0": "scheduled", "1": "query", "sos": "sos", "fall": "fall"}.get(kind, "scheduled")
            loc = _location(fields, at, reason)
            events.append(loc)
            if reason in ("sos", "fall"):
                events.append(ev.Alarm(reason, at, loc))
        elif name == "upBattery":
            reason = BATTERY_REASON.get(to_int(fields.get("batteryType")))
            state = to_int(fields.get("batteryState"))
            events.append(ev.Battery(to_int(fields.get("batteryLevel")), None if state is None else state == 1, reason))
            if reason == "low":
                events.append(ev.Alarm("low_battery", at))
        elif name == "upShutdown":
            events.append(ev.Alarm("power_off", at))
        elif name == "upGetDevConfig":
            events.append(ev.ConfigRequest())
        elif name == "upGetDevBindStatus":
            events.append(ev.BindStatusRequest())
        elif name == "upDeviceConfig":
            events.append(ev.ReportedConfig(fields.get("configs") if isinstance(fields.get("configs"), dict) else {}))
        else:
            events.append(ev.Unhandled(name))

        if any(isinstance(e, (ev.VitalSample, ev.Metric, ev.Alarm, ev.Location)) for e in events):
            content = {k: v for k, v in fields.items() if k not in ("ident", "encryptionCode", "ref")}
            dec.dedupe_key = hashlib.sha256(
                json.dumps(content, sort_keys=True, default=str).encode()).hexdigest()[:40]
        return dec

    # ── encoding ─────────────────────────────────────────────────────────────────────

    def _message(self, type_: str, imei: str, now: datetime, ident=None, ref: str = "s:down", **fields) -> bytes:
        ts = epoch_ms(now)
        ident = ident if ident is not None else random.randint(100000, 999999)
        msg = {"type": type_, "ident": ident, "ref": ref, "imei": imei, "timestamp": ts}
        if self.nested:
            msg["data"] = {"type": type_, "imei": imei, "timestamp": ts, **fields}
        else:
            msg.update(fields)
        if settings.WONLEX_SIGNATURE != "off" and settings.WONLEX_SIGN_KEY:
            msg["encryptionCode"] = sign(msg, settings.WONLEX_SIGN_KEY)
        return self.frame(msg)

    def reply(self, decoded: Decoded, bound: bool, now: datetime) -> Optional[bytes]:
        if decoded.error or decoded.is_reply or not decoded.imei:
            return None
        fields = {"bindStatus": 1 if bound else 0} if decoded.name == "login" else {}
        return self._message(decoded.name, decoded.imei, now, ident=decoded.raw.get("ident"), ref="s:reply", **fields)

    def encode(self, imei: str, command, now: datetime) -> list[bytes]:
        if isinstance(command, ev.ApplySchedule):
            # CONFIRM: "0" switches a vital off (the document only says so for locationInterval).
            configs = {}
            for vital, key in SCHEDULE_KEYS.items():
                entry = command.plan.get(vital) or {}
                interval = entry.get("interval") if entry.get("mode") == "native" else 0
                configs[key] = {"interval": str(int(interval or 0))}
            return [self._message("deviceMeasuringFrequency", imei, now, configs=configs)]
        if isinstance(command, ev.MeasureNow):
            type_ = MEASURE_TYPES.get(command.vital)
            return [self._message(type_, imei, now)] if type_ else []
        if isinstance(command, ev.SetBound):
            return [self._message("dnDevBindStatus", imei, now, status=1 if command.bound else 0)]
        if isinstance(command, ev.SetAlarmSwitches):
            configs = {"FallWarnSwitch": {"switchState": 1 if command.fall else 0}}
            if command.low_battery_pct:
                configs["LowPower"] = {"Battery": int(command.low_battery_pct)}
            return [self._message("deviceConfig", imei, now, configs=configs)]
        if isinstance(command, ev.Locate):
            return [self._message("dnLocation", imei, now)]
        if isinstance(command, ev.Reboot):
            return [self._message("restart", imei, now)]
        if isinstance(command, ev.PowerOff):
            return [self._message("powerOff", imei, now)]
        return []
