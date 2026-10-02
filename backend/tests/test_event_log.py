"""LOG_DEVICE_EVENTS: readable device-event blocks when on, nothing at all when off."""
import io
import logging
from datetime import datetime

from app.core.config import settings
from app.devices import event_log
from app.devices import events as ev

AT = datetime(2026, 10, 1, 12, 1, 4)


def capture(monkeypatch, on: bool):
    monkeypatch.setattr(settings, "LOG_DEVICE_EVENTS", on)
    buf = io.StringIO()
    event_log._logger()                                   # make sure the handler exists
    handler = logging.StreamHandler(buf)
    handler.setFormatter(logging.Formatter("%(message)s"))
    event_log.log.handlers = [handler]
    return buf


def test_off_logs_nothing(monkeypatch):
    buf = capture(monkeypatch, False)
    event_log.frame("IN", "bpw8", "867956070000018", 34, "HEART", b"[CS*867956070000018*0013*HEART,1,79]",
                    [ev.VitalSample(AT, heart_rate=79)], status="parsed")
    event_log.reading("ble", "band-1", 34, AT, {"heart_rate": 79})
    assert buf.getvalue() == ""


def test_bpw8_frame_block(monkeypatch):
    buf = capture(monkeypatch, True)
    event_log.frame("IN", "bpw8", "867956070000018", 34, "BPUP", b"[CS*867956070000018*0019*BPUP,1,80,126,77]",
                    [ev.VitalSample(AT, heart_rate=80, bp_sys=126, bp_dia=77)], status="parsed")
    out = buf.getvalue().splitlines()
    assert out[0] == "┌─ IN   BPW8    867956070000018  patient 34  BPUP  → parsed"
    assert out[1] == "│  Heart rate 80 bpm · BP 126/77 mmHg  (measured 2026-10-01 12:01:04 UTC)"
    assert out[2] == "└─ raw  [CS*867956070000018*0019*BPUP,1,80,126,77]"


def test_wonlex_json_is_shown_as_text_and_alarm_highlighted(monkeypatch):
    buf = capture(monkeypatch, True)
    loc = ev.Location(AT, lat=9.9312, lon=76.2673, source="gps", reason="sos")
    event_log.frame("IN", "wonlex", "352273017386001", 5, "upLocation", b'{"type":"upLocation"}',
                    [loc, ev.Alarm("sos", AT, loc)], status="parsed")
    text = buf.getvalue()
    assert "⚠ ALARM SOS near 9.93120, 76.26730" in text
    assert '└─ raw  {"type":"upLocation"}' in text


def test_veepoo_binary_as_hex_and_long_raw_trimmed(monkeypatch):
    buf = capture(monkeypatch, True)
    monkeypatch.setattr(settings, "LOG_DEVICE_EVENTS_RAW_CHARS", 40)
    event_log.frame("IN", "mqtt", "F1F2F3F4F5F6_9999", None, "daily_data_report", bytes(range(200)))
    text = buf.getvalue()
    assert "Veepoo" in text and "no patient" in text and "00 01 02 03" in text and "(599 chars)" in text


def test_out_frame_and_stored_reading(monkeypatch):
    buf = capture(monkeypatch, True)
    frame = b"[CS*867956070000018*000b*SET_HZ,1,15]"
    event_log.frame("OUT", "bpw8", "867956070000018", None, event_log.out_name(frame), frame)
    event_log.reading("ble", "band-7", 12, AT, {"heart_rate": 88, "spo2": 97.0, "bp_systolic": 0,
                                                 "is_connected": True}, 1, "Stable")
    lines = buf.getvalue().splitlines()
    assert lines[0] == "┌─ OUT  BPW8    867956070000018  SET_HZ"
    assert lines[2] == "┌─ STORED BLE app band-7  patient 12  2026-10-01 12:01:04 UTC"
    assert lines[3] == "└─ HR 88 · SpO₂ 97% · BP – · temp – · HRV – · NEWS2 1 · Stable"
