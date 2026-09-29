import struct
from datetime import datetime

import pytest

from app.mqtt import protocol as p


def env(head, current, total, content):
    return bytes([head]) + struct.pack("<HH", current, total) + content


# --- basics ---

def test_crc16_modbus_standard_check_value():
    assert p.crc16_modbus(b"123456789") == 0x4B37


def test_topics():
    assert p.split_device_topic("vpwatch/F1F2F3F4F5F6_9999/v1/daily_data_report") == ("F1F2F3F4F5F6_9999", "daily_data_report")
    assert p.split_device_topic("server/X/v1/cmd_notify") is None
    assert p.cmd_topic("A_1") == "server/A_1/v1/cmd_notify"


def test_envelope_and_out_of_order_reassembly():
    buf = p.FragmentBuffer()
    key = ("A_1", "daily_data_report", 0xD0)
    assert buf.add(key, p.parse_envelope(env(0xD0, 2, 3, b"BB"))) is None
    assert buf.add(key, p.parse_envelope(env(0xD0, 1, 3, b"AA"))) is None
    assert buf.add(key, p.parse_envelope(env(0xD0, 3, 3, b"CC"))) == b"AABBCC"
    assert buf.pending() == 0


def test_envelope_rejects_bad_index():
    with pytest.raises(ValueError):
        p.parse_envelope(env(0xD0, 3, 2, b""))


# --- device → server ---

def test_device_info():
    content = struct.pack("<H", 9999) + bytes([0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6]) + bytes([1, 2, 3, 4]) + bytes([5]) \
        + struct.pack("<h", 330) + bytes(range(1, 14)) + bytes([0, 1, 0, 0]) + b"8991000000000000000\x00" + bytes([1, 2])
    info = p.parse_device_info(content)
    assert info["device_number"] == 9999 and info["mac"] == "F1:F2:F3:F4:F5:F6"
    assert info["firmware"] == "1.2.3.4" and info["timezone_minutes"] == 330
    assert info["hardware"] == "0.1.0.0" and info["iccid"] == "8991000000000000000"
    assert info["capabilities"]["auto_measure_config"] == 1 and info["capabilities"]["gnss"] == 2


def test_prepare_data():
    pd = p.parse_prepare_data(bytes([0xC1]) + struct.pack("<II", 100, 200))
    assert (pd.read_type, pd.last_change_ts, pd.factory_reset_ts) == (0xC1, 100, 200)


def test_realtime_c3():
    pkt = bytes([0xC3]) + struct.pack("<ii", 7659123, 1004567) + struct.pack("<h", 12) + bytes([88]) \
        + struct.pack("<H", 339) + bytes([97]) + bytes(5)
    r = p.parse_realtime(pkt)
    assert r["heart_rate"] == 88 and r["temp"] == 33.9 and r["spo2"] == 97
    assert r["longitude"] == 76.59123 and r["latitude"] == 10.04567


def test_step_data():
    assert p.parse_step_data(struct.pack("<III", 1200, 850, 456)) == {"steps": 1200, "distance_m": 850, "calories_kcal": 45.6}


def test_device_status_battery():
    tlv = bytes([0xA1, 0x01, 0x01, 0xA2, 0x07, 1, 3, 1, 76, 0x01]) + struct.pack("<H", 3980)
    s = p.parse_device_status(tlv)
    assert s == {"battery_state": "charging", "battery_level": 3, "battery_percent": 76, "battery_low": False, "battery_mv": 3980}
    assert p.parse_device_status(env(0xA0, 1, 1, tlv))["battery_percent"] == 76   # tolerates an envelope


def test_device_event_sos():
    ev = p.parse_device_event(bytes([0xA1, 0x01, 0x01, 0xA2, 0x05, 0x02]) + struct.pack("<I", 1790000000))
    assert ev["event"] == "sos" and ev["triggered_at"] == datetime(2026, 9, 21, 14, 13, 20)   # 1790000000 in UTC


# --- daily data ---

def _block(block_no, body):
    header = bytes([0xC1]) + struct.pack("<H", block_no) + bytes([0]) + struct.pack("<H", 288) + bytes([1, 0, 0, 0, len(body) & 0xFF]) \
        + struct.pack("<H", p.crc16_modbus(body)) + struct.pack("<H", len(body)) + bytes(5)
    assert len(header) == 20
    return header + body


def _body():
    b = bytearray(100)
    b[2:6] = bytes([9, 29, 14, 25])                 # month, day, hour, minute
    b[6:8] = struct.pack(">H", 321)                 # steps (big-endian)
    b[15] = 0                                       # worn
    b[22:27] = bytes([80, 82, 81, 150, 83])         # pulse rate ×5
    b[88], b[89] = 122, 79
    b[90:95] = bytes([97, 98, 97, 0, 96])
    return bytes(b)


def test_daily_blocks_parse_and_crc():
    body = _body()
    protocol, blocks = p.parse_daily_content(bytes([0x05]) + _block(170, body) + _block(171, body))
    assert protocol == 5 and [b.block_no for b in blocks] == [170, 171]
    v = blocks[0].values
    assert blocks[0].crc_ok and v["steps"] == 321 and v["wear"] == 0
    assert v["pulse_rate"] == [80, 82, 81, 150, 83] and (v["bp_systolic"], v["bp_diastolic"]) == (122, 79)
    assert v["spo2"] == [97, 98, 97, 0, 96] and (v["hour"], v["minute"]) == (14, 25)


def test_daily_block_crc_mismatch_is_flagged():
    raw = bytearray(_block(1, _body()))
    raw[-1] ^= 0xFF
    _, blocks = p.parse_daily_content(bytes([0x05]) + bytes(raw))
    assert not blocks[0].crc_ok


# --- server → device ---

def test_upload_interval_matches_spec_example():
    # Spec §2.3.4: "set upload interval to once every 5 minutes: CA,00,01,01,01,A0,06,00,A8,01,05"
    assert p.build_set_upload_interval(5) == bytes.fromhex("CA000101 01A00600A80105".replace(" ", ""))
    with pytest.raises(ValueError):
        p.build_set_upload_interval(0)


def test_auto_measure_record_length_and_roundtrip():
    recs = [p.AutoMeasureRecord("hr", True, 5, step_min=5), p.AutoMeasureRecord("bp", True, 60, window_start=(8, 0), window_end=(20, 0)),
            p.AutoMeasureRecord("spo2", False, 30)]
    pkt = p.build_set_auto_measure(recs)
    assert pkt[:3] == bytes([0xCB, 0x01, 0x01])
    assert pkt[3:5] == bytes([0xA0, 0x05]) and struct.unpack("<I", pkt[6:10])[0] == 3 * 35
    parsed = p.parse_auto_measure_records(pkt[3:])
    assert [(r.function, r.enabled, r.interval_min) for r in parsed] == [("hr", True, 5), ("bp", True, 60), ("spo2", False, 30)]
    assert parsed[1].window_start == (8, 0) and parsed[1].window_end == (20, 0) and parsed[0].step_min == 5


def test_auto_measure_ack():
    body = p.build_set_auto_measure([p.AutoMeasureRecord("hr", True, 10)])[3:]
    ack = p.parse_auto_measure_ack(bytes([0xE7, 0x02, 0x01, 0x01]) + body)
    assert ack["ok"] and ack["records"][0].interval_min == 10


def test_read_commands_are_20_bytes():
    assert p.build_read_daily(1, 0) == bytes([0xC1, 0x01, 0x00, 0x00]) + bytes(16)
    assert p.build_read_sleep(1)[:2] == bytes([0xC0, 0x01]) and len(p.build_realtime(True)) == 20


def test_time_push_ist():
    t = p.build_time(datetime(2026, 9, 29, 6, 30, 5), 330)
    assert t[:5] == bytes([0xA0, 1, 0, 1, 0])
    assert t[5:12] == struct.pack("<H", 2026) + bytes([9, 29, 6, 30, 5]) and t[12:] == bytes([0x01, 22])
