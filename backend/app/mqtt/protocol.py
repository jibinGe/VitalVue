"""Veepoo Smart Device MQTT protocol V1.16 — pure parsers and command builders (no I/O).

Byte order is little-endian unless noted (the spec's exceptions: CD targets and daily-data
steps/distance/calories are big-endian). Fields whose layout the spec leaves ambiguous are
marked CONFIRM; the worker keeps every raw packet so they can be re-parsed once the vendor
confirms them.
"""
from __future__ import annotations

import struct
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

MAX_PAYLOAD = 1500
COMMAND_SIZE = 20          # C0/C1/C3… commands are padded with reserved bytes to 20 bytes

# ── Topics ──────────────────────────────────────────────────────────────────────

DEVICE_TOPIC_PREFIX = "vpwatch"
SERVER_TOPIC_PREFIX = "server"


def device_topic_filter() -> str:
    return "vpwatch/+/v1/#"


def cmd_topic(client_id: str) -> str:
    return f"server/{client_id}/v1/cmd_notify"


def time_topic(client_id: str) -> str:
    return f"server/{client_id}/v1/time"


def split_device_topic(topic: str) -> Optional[tuple[str, str]]:
    """'vpwatch/{clientId}/v1/{name}' → (clientId, name); None for anything else."""
    parts = topic.split("/")
    if len(parts) == 4 and parts[0] == DEVICE_TOPIC_PREFIX and parts[2] == "v1" and parts[1]:
        return parts[1], parts[3]
    return None


# ── CRC16 (MODBUS, poly 0xA001, init 0xFFFF) — spec reference implementation ──────

_CRC_TABLE = []
for _i in range(256):
    _v = _i
    for _ in range(8):
        _v = (_v >> 1) ^ 0xA001 if _v & 1 else _v >> 1
    _CRC_TABLE.append(_v)


def crc16_modbus(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc = (crc >> 8) ^ _CRC_TABLE[(crc ^ b) & 0xFF]
    return crc


# ── Fragment envelope: Head(1) Current(2 LE) Total(2 LE) Content ──────────────────

@dataclass
class Envelope:
    head: int
    current: int
    total: int
    content: bytes


def parse_envelope(payload: bytes) -> Envelope:
    if len(payload) < 5:
        raise ValueError("payload shorter than the 5-byte envelope")
    head = payload[0]
    current, total = struct.unpack_from("<HH", payload, 1)
    if current < 1 or total < 1 or current > total:
        raise ValueError(f"bad fragment index {current}/{total}")
    return Envelope(head, current, total, payload[5:])


class FragmentBuffer:
    """Reassembles Current/Total fragments per (client, topic, head). Fragments may arrive out
    of order; a message is complete once 1..Total are all present."""

    def __init__(self):
        self._parts: dict[tuple, dict[int, bytes]] = {}
        self._totals: dict[tuple, int] = {}

    def add(self, key: tuple, env: Envelope) -> Optional[bytes]:
        if env.total == 1:
            return env.content
        if self._totals.get(key) not in (None, env.total):
            self._parts.pop(key, None)   # a new transfer started; drop the stale one
        self._totals[key] = env.total
        parts = self._parts.setdefault(key, {})
        parts[env.current] = env.content
        if len(parts) == env.total and all(i in parts for i in range(1, env.total + 1)):
            self._parts.pop(key, None)
            self._totals.pop(key, None)
            return b"".join(parts[i] for i in range(1, env.total + 1))
        return None

    def pending(self) -> int:
        return len(self._parts)


# ── Device → server parsers ──────────────────────────────────────────────────────

def _version(b: bytes) -> str:
    return ".".join(str(x) for x in b)


def parse_device_info(content: bytes) -> dict:
    """device_info_report content (§2.3.1)."""
    if len(content) < 28:
        raise ValueError("device_info content too short")
    device_number = struct.unpack_from("<H", content, 0)[0]
    mac = ":".join(f"{b:02X}" for b in content[2:8])
    tz = struct.unpack_from("<h", content, 13)[0]
    caps_names = ["sleep_type", "heart_rate", "ecg", "hrv", "spo2", "body_composition", "met", "stress",
                  "body_temperature", "blood_glucose", "blood_pressure", "blood_components", "sport_mode_type"]
    caps = {name: content[15 + i] for i, name in enumerate(caps_names)}
    info = {
        "device_number": device_number,
        "mac": mac,
        "firmware": _version(content[8:12]),
        "daily_protocol": content[12],
        "timezone_minutes": tz,
        "capabilities": caps,
    }
    if len(content) >= 32:
        info["hardware"] = _version(content[28:32])
    # CONFIRM: the spec lists ICCID as 20 bytes at offset 32 but the next field at 42. Accept both
    # layouts: a 54+-byte content means a full 20-byte ICCID (flags at 52/53), otherwise 10.
    if len(content) >= 54:
        iccid_raw, flags_at = content[32:52], 52
    else:
        iccid_raw, flags_at = content[32:42], 42
    iccid = iccid_raw.split(b"\x00")[0].decode("utf-8", "ignore").strip()
    if iccid:
        info["iccid"] = iccid
    if len(content) > flags_at:
        caps["auto_measure_config"] = content[flags_at]
    if len(content) > flags_at + 1:
        caps["gnss"] = content[flags_at + 1]
    return info


@dataclass
class PrepareData:
    read_type: int                 # 0xC0 sleep, 0xC1 daily, 0xC3 real-time/GPS
    last_change_ts: int
    factory_reset_ts: int


def parse_prepare_data(payload: bytes) -> PrepareData:
    """prepare_data (§2.3.3): ReadType(1) LastChangeTimestamp(4) FactoryResetTimestamp(4)."""
    if len(payload) < 9:
        raise ValueError("prepare_data too short")
    last, reset = struct.unpack_from("<II", payload, 1)
    return PrepareData(payload[0], last, reset)


def parse_realtime(payload: bytes) -> dict:
    """manual_measure Head 0xC3 real-time data (§2.3.8): lon, lat, altitude, HR, body temp, SpO2."""
    if len(payload) < 15 or payload[0] != 0xC3:
        raise ValueError("not a C3 real-time packet")
    lon, lat = struct.unpack_from("<ii", payload, 1)
    alt = struct.unpack_from("<h", payload, 9)[0]
    temp_raw = struct.unpack_from("<H", payload, 12)[0]
    return {
        "longitude": lon / 100000 if lon else None,
        "latitude": lat / 100000 if lat else None,
        "altitude_m": alt,
        "heart_rate": payload[11] or None,
        "temp": round(temp_raw / 10, 1) if temp_raw else None,
        "spo2": payload[14] or None,
    }


def parse_step_data(payload: bytes) -> dict:
    """step_data_report (§2.3.5): steps, distance (m), calories (kcal ×10)."""
    if len(payload) < 12:
        raise ValueError("step_data too short")
    steps, distance, cal = struct.unpack_from("<III", payload, 0)
    return {"steps": steps, "distance_m": distance, "calories_kcal": cal / 10}


def _strip_optional_envelope(payload: bytes, first_tag: int) -> bytes:
    """Status/event reports document only the TLV content; tolerate an envelope in front."""
    if payload and payload[0] == first_tag:
        return payload
    if len(payload) > 5 and payload[5] == first_tag:
        return payload[5:]
    raise ValueError(f"expected TLV starting with 0x{first_tag:02X}")


BATTERY_STATES = {0: "normal", 1: "charging", 2: "full", 3: "low"}


def parse_device_status(payload: bytes) -> dict:
    """device_status_report (§2.3.12): A1 version TLV, A2 battery TLV."""
    data = _strip_optional_envelope(payload, 0xA1)
    i = 0
    out = {}
    while i + 2 <= len(data):
        tag, length = data[i], data[i + 1]
        value = data[i + 2:i + 2 + length]
        if tag == 0xA2 and length >= 7:
            voltage = struct.unpack_from("<H", value, 5)[0]
            out.update({
                "battery_state": BATTERY_STATES.get(value[0], str(value[0])),
                "battery_level": value[1],
                "battery_percent": value[3] if value[2] == 1 else min(100, value[1] * 25),
                "battery_low": value[4] == 0x02,
                "battery_mv": voltage,
            })
        i += 2 + length
    return out


EVENT_TYPES = {0x01: "fall", 0x02: "sos", 0x03: "low_battery"}


def parse_device_event(payload: bytes) -> dict:
    """device_event_report (§2.3.14): A1 version, A2 event (type(1) + trigger timestamp(4))."""
    data = _strip_optional_envelope(payload, 0xA1)
    i = 0
    while i + 2 <= len(data):
        tag, length = data[i], data[i + 1]
        value = data[i + 2:i + 2 + length]
        if tag == 0xA2 and length >= 5:
            ts = struct.unpack_from("<I", value, 1)[0]
            return {"event": EVENT_TYPES.get(value[0], f"unknown_{value[0]}"),
                    "triggered_at": datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None) if ts else None}
        i += 2 + length
    raise ValueError("no A2 event TLV")


def parse_server_state_ack(payload: bytes) -> dict:
    """device_server_state_report (§2.3.15): Head E6, Type, CON, ACK, Current, Total, Content."""
    if len(payload) < 6 or payload[0] != 0xE6:
        raise ValueError("not an E6 packet")
    return {"type": payload[1], "con": payload[2], "ok": payload[3] == 0x01, "content": payload[6:]}


def parse_auto_measure_ack(payload: bytes) -> dict:
    """device_auto_measure_info_report (§2.3.16): Head E7, Con, Ack, Current, Content (CB TLVs)."""
    if len(payload) < 4 or payload[0] != 0xE7:
        raise ValueError("not an E7 packet")
    result = {"con": payload[1], "ok": payload[2] == 0x01, "current": payload[3], "records": []}
    try:
        result["records"] = parse_auto_measure_records(payload[4:])
    except (ValueError, struct.error, IndexError):
        pass  # ack without (parsable) content
    return result


# ── Daily data (§2.3.7) ────────────────────────────────────────────────────────────

WEAR_WORN = 0
WEAR_CHARGING = 6


@dataclass
class DailyBlock:
    block_no: int
    total_blocks: int
    day_offset: int                  # 0 today, 1 yesterday, …
    crc: int
    crc_ok: bool
    content: bytes
    values: dict = field(default_factory=dict)


def parse_daily_content(content: bytes) -> tuple[int, list[DailyBlock]]:
    """Reassembled daily_data_report content: Protocol(1) then 5-minute blocks, each a 20-byte
    header (0xC1 …) followed by D_T_S_L bytes of block content."""
    if not content:
        raise ValueError("empty daily content")
    protocol = content[0]
    i, blocks = 1, []
    while i + 20 <= len(content):
        if content[i] != 0xC1:
            raise ValueError(f"expected block header 0xC1 at {i}, got 0x{content[i]:02X}")
        block_no = struct.unpack_from("<H", content, i + 1)[0]
        total_blocks = struct.unpack_from("<H", content, i + 4)[0]
        day_offset = content[i + 7]
        crc = struct.unpack_from("<H", content, i + 11)[0]
        length = struct.unpack_from("<H", content, i + 13)[0]
        body = content[i + 20:i + 20 + length]
        if len(body) < length:
            raise ValueError("truncated 5-minute block")
        block = DailyBlock(block_no, total_blocks, day_offset, crc, crc16_modbus(body) == crc, body)
        block.values = parse_daily_block_values(body)
        blocks.append(block)
        i += 20 + length
    return protocol, blocks


def parse_daily_block_values(body: bytes) -> dict:
    """Block content fixed layout (§2.3.7 "Item content index layout").
    CONFIRM with vendor samples: offsets beyond SpO2 (stress, temperature, glucose…) are only
    given as '…' in the spec and are not parsed yet — the raw block is kept."""
    if len(body) < 16:
        return {}
    v = {
        "month": body[2], "day": body[3], "hour": body[4], "minute": body[5],
        "steps": struct.unpack_from(">H", body, 6)[0],
        "exercise": struct.unpack_from(">H", body, 8)[0],
        "distance": struct.unpack_from(">H", body, 10)[0],
        "calories": struct.unpack_from(">H", body, 12)[0],
        "posture": body[14],
        "wear": body[15],
    }
    if len(body) >= 27:
        v["pulse_rate"] = list(body[22:27])          # PPG heart rate ×5 (one per minute)
    if len(body) >= 37:
        v["resp_rate"] = list(body[32:37])
    if len(body) >= 88:
        v["hrv_type"] = body[37]
        v["rr_intervals"] = list(body[38:88])
    if len(body) >= 90:
        v["bp_systolic"], v["bp_diastolic"] = body[88], body[89]
    if len(body) >= 95:
        v["spo2"] = list(body[90:95])
    return v


# ── Auto-measure config (CB / E7) ──────────────────────────────────────────────────

# CB function types (§2.3.4 D1)
FUNCTION_TYPES = {"hr": 0, "bp": 1, "glucose": 2, "stress": 3, "spo2": 4, "temp": 5, "lorenz": 6, "hrv": 7,
                  "blood_components": 8}
FUNCTION_NAMES = {v: k for k, v in FUNCTION_TYPES.items()}


@dataclass
class AutoMeasureRecord:
    function: str
    enabled: bool
    interval_min: int
    step_min: int = 1
    window_start: tuple[int, int] = (0, 0)
    window_end: tuple[int, int] = (23, 59)
    supported_start: tuple[int, int] = (0, 0)
    supported_end: tuple[int, int] = (23, 59)
    slot_modifiable: bool = True
    interval_modifiable: bool = True
    protocol: int = 0


def encode_auto_measure_record(r: AutoMeasureRecord) -> bytes:
    # A1 record: D0..D7 sub-TLVs, 33 bytes total (A1 length 0x21). The spec prints D4 with L=0x01
    # but lists two values — only L=0x02 adds up to 0x21, so D4 carries both flags.
    body = bytes([
        0xD0, 0x01, r.protocol,
        0xD1, 0x01, FUNCTION_TYPES[r.function],
        0xD2, 0x01, 0x01 if r.enabled else 0x00,
        0xD3, 0x02, *struct.pack("<H", r.step_min),
        0xD4, 0x02, 0x01 if r.slot_modifiable else 0x00, 0x01 if r.interval_modifiable else 0x00,
        0xD5, 0x04, *r.supported_start, *r.supported_end,
        0xD6, 0x02, *struct.pack("<H", r.interval_min),
        0xD7, 0x04, *r.window_start, *r.window_end,
    ])
    assert len(body) == 0x21
    return bytes([0xA1, len(body)]) + body


def parse_auto_measure_records(content: bytes) -> list[AutoMeasureRecord]:
    """Content of CB / E7: A0 summary TLV then A1 records of D0..D7 sub-TLVs."""
    i, records = 0, []
    while i + 2 <= len(content):
        tag, length = content[i], content[i + 1]
        value = content[i + 2:i + 2 + length]
        if tag == 0xA1:
            sub, j = {}, 0
            while j + 2 <= len(value):
                st, sl = value[j], value[j + 1]
                sub[st] = value[j + 2:j + 2 + sl]
                j += 2 + sl
            func = sub.get(0xD1, b"\x00")[0]
            d5, d7 = sub.get(0xD5, bytes([0, 0, 23, 59])), sub.get(0xD7, bytes([0, 0, 23, 59]))
            d4 = sub.get(0xD4, b"\x01\x01")
            records.append(AutoMeasureRecord(
                function=FUNCTION_NAMES.get(func, f"type_{func}"),
                enabled=sub.get(0xD2, b"\x00")[0] == 1,
                interval_min=struct.unpack("<H", sub[0xD6])[0] if len(sub.get(0xD6, b"")) == 2 else 0,
                step_min=struct.unpack("<H", sub[0xD3])[0] if len(sub.get(0xD3, b"")) == 2 else 1,
                window_start=(d7[0], d7[1]), window_end=(d7[2], d7[3]),
                supported_start=(d5[0], d5[1]), supported_end=(d5[2], d5[3]),
                slot_modifiable=d4[0] == 1, interval_modifiable=(d4[1] == 1) if len(d4) > 1 else True,
                protocol=sub.get(0xD0, b"\x00")[0],
            ))
        i += 2 + length
    return records


# ── Server → device command builders ───────────────────────────────────────────────

def _pad(cmd: bytes) -> bytes:
    return cmd + bytes(max(0, COMMAND_SIZE - len(cmd)))


def build_time(now_utc: datetime, tz_offset_minutes: Optional[int]) -> bytes:
    """server/{id}/v1/time (§2.3.2): envelope A0 01/01 + UTC time(7) + tz enable(1) + tz value(1).
    tz value is in 15-minute steps (+22 = UTC+5:30). CONFIRM the envelope with the vendor."""
    content = struct.pack("<H", now_utc.year) + bytes([now_utc.month, now_utc.day, now_utc.hour,
                                                         now_utc.minute, now_utc.second])
    if tz_offset_minutes is None:
        content += bytes([0x02, 0x00])
    else:
        content += bytes([0x01]) + struct.pack("<b", tz_offset_minutes // 15)
    return bytes([0xA0]) + struct.pack("<HH", 1, 1) + content


def build_read_sleep(day: int = 0) -> bytes:
    return _pad(bytes([0xC0, day]))


def build_read_daily(position: int = 1, day: int = 0) -> bytes:
    return _pad(bytes([0xC1]) + struct.pack("<H", position) + bytes([day]))


def build_realtime(start: bool) -> bytes:
    return _pad(bytes([0xC3, 0x01 if start else 0x00]))


def build_read_auto_measure() -> bytes:
    return bytes([0xCB, 0x02, 0x01])


def build_set_auto_measure(records: list[AutoMeasureRecord]) -> bytes:
    """CB set (§2.3.4): Head CB, Con 0x01, Current 1, then A0 summary + A1 records."""
    encoded = b"".join(encode_auto_measure_record(r) for r in records)
    summary = bytes([0xA0, 0x05, 0x01]) + struct.pack("<I", len(encoded))
    packet = bytes([0xCB, 0x01, 0x01]) + summary + encoded
    if len(packet) > MAX_PAYLOAD:
        raise ValueError("auto-measure config exceeds one MQTT payload")
    return packet


def build_set_upload_interval(minutes: int) -> bytes:
    """CA set (§2.3.4): CA,00,01,Current,Total, A0 + total length(2 LE) + A8 01 <minutes>.
    Matches the spec's example CA,00,01,01,01,A0,06,00,A8,01,05 for 5 minutes."""
    if not 1 <= minutes <= 255:
        raise ValueError("upload interval must be 1–255 minutes")
    tlvs = bytes([0xA8, 0x01, minutes])
    content = bytes([0xA0]) + struct.pack("<H", 3 + len(tlvs)) + tlvs
    return bytes([0xCA, 0x00, 0x01, 0x01, 0x01]) + content


def build_read_server_state() -> bytes:
    return bytes([0xCA, 0x00, 0x02])
