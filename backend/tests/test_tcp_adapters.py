"""Wonlex and BPW8 codecs against the sample frames in the vendor protocol documents."""
import json
import struct
from datetime import datetime

from app.devices import events as ev
from app.devices.adapters.bpw8 import Bpw8Codec, frame as bpw8_frame, parse_location
from app.devices.adapters.wonlex import WonlexCodec, sign

NOW = datetime(2026, 10, 1, 12, 0, 0)
W_IMEI = "352273017386001"
B_IMEI = "867956070000018"


def wframe(msg: dict) -> bytes:
    body = json.dumps(msg).encode()
    return b"\xfc\xaf" + struct.pack(">H", len(body)) + body


def wdecode(msg: dict):
    c = WonlexCodec()
    frames = c.feed(wframe(msg))
    assert len(frames) == 1
    return c, c.decode(frames[0], NOW)


def bdecode(text: str):
    c = Bpw8Codec()
    frames = c.feed(text.encode())
    assert len(frames) == 1
    return c, c.decode(frames[0], NOW)


def only(events, cls):
    found = [e for e in events if isinstance(e, cls)]
    assert len(found) == 1, events
    return found[0]


# ── Wonlex framing ──────────────────────────────────────────────────────────────────────

def test_wonlex_split_merged_and_garbage():
    a = wframe({"type": "heartbeat", "ident": 1, "imei": W_IMEI, "timestamp": 1})
    b = wframe({"type": "upBO", "ident": 2, "imei": W_IMEI, "data": "97", "timestamp": 2})
    c = WonlexCodec()
    stream = b"junk" + a + b"\x00\x01" + b
    out = []
    for i in range(0, len(stream), 7):                 # arrives in 7-byte pieces
        out += c.feed(stream[i:i + 7])
    assert [json.loads(f)["type"] for f in out] == ["heartbeat", "upBO"]
    assert c.dropped_bytes == 6
    assert c.buffer == bytearray()


def test_wonlex_magic_split_across_reads():
    a = wframe({"type": "heartbeat", "ident": 1, "imei": W_IMEI})
    c = WonlexCodec()
    assert c.feed(a[:1]) == []
    assert len(c.feed(a[1:])) == 1


# ── Wonlex messages ─────────────────────────────────────────────────────────────────────

def test_wonlex_login_and_reply_with_bind_status():
    c, d = wdecode({"type": "login", "ident": 762250, "ref": "w:update", "imei": W_IMEI, "deviceModel": "W8",
                    "Version": "1.2.42", "iccId": "8986", "batteryLevel": 64, "timestamp": 1648111390074})
    hello = only(d.events, ev.Hello)
    assert (hello.model, hello.firmware, hello.battery) == ("W8", "1.2.42", 64)
    reply = json.loads(c.feed(c.reply(d, bound=True, now=NOW))[0])
    assert reply["type"] == "login" and reply["ident"] == 762250 and reply["ref"] == "s:reply"
    assert reply["bindStatus"] == 1


def test_wonlex_nested_data_and_date_typo():
    c, d = wdecode({"type": "upHeartRate", "ident": 5, "ref": "w:update", "imei": W_IMEI, "timestamp": 1700000000000,
                    "data": {"type": "upHeartRate", "imei": W_IMEI, "date": "100", "testType": 2}})
    s = only(d.events, ev.VitalSample)
    assert s.heart_rate == 100 and s.trigger == "requested"
    assert s.measured_at == datetime(2023, 11, 14, 22, 13, 20)
    assert c.nested
    reply = json.loads(c.feed(c.reply(d, bound=False, now=NOW))[0])
    assert reply["data"]["type"] == "upHeartRate"            # replies mirror the watch's style


def test_wonlex_bp_with_pulse():
    _, d = wdecode({"type": "upBP", "ident": 1, "imei": W_IMEI, "data": "120/80/88", "timestamp": 1})
    s = only(d.events, ev.VitalSample)
    assert (s.bp_sys, s.bp_dia, s.heart_rate) == (120, 80, 88)


def test_wonlex_temperature_three_values():
    _, d = wdecode({"type": "upBodyTemperature", "ident": 1, "imei": W_IMEI, "data": "36.8/31.6/28.2", "timestamp": 1})
    s = only(d.events, ev.VitalSample)
    assert (s.body_temp, s.skin_temp) == (36.8, 31.6)
    assert only(d.events, ev.Metric).kind == "ambient_temp"


def test_wonlex_batch():
    _, d = wdecode({"type": "upBatch", "ident": 1, "imei": W_IMEI, "dataType": "upHeartRate", "data": "100,98,97",
                    "dataTime": "1648111390075,1648111390073,1648111390074", "timestamp": 1648111390074})
    samples = [e for e in d.events if isinstance(e, ev.VitalSample)]
    assert [s.heart_rate for s in samples] == [100, 98, 97]
    assert samples[1].measured_at < samples[0].measured_at


def test_wonlex_sos_and_fall_from_location():
    _, d = wdecode({"type": "upLocation", "ident": 1, "imei": W_IMEI, "positionDataType": "fall",
                    "gps": {"lon": "113.4201386", "lat": "23.1782397"}, "timestamp": 1})
    alarm = only(d.events, ev.Alarm)
    assert alarm.kind == "fall" and alarm.location.lat == 23.1782397


def test_wonlex_low_battery_and_shutdown():
    _, d = wdecode({"type": "upBattery", "ident": 1, "imei": W_IMEI, "batteryLevel": 9, "batteryState": 0,
                    "batteryType": 3, "timestamp": 1})
    assert only(d.events, ev.Alarm).kind == "low_battery"
    _, d = wdecode({"type": "upShutdown", "ident": 1, "imei": W_IMEI, "timestamp": 1})
    assert only(d.events, ev.Alarm).kind == "power_off"


def test_wonlex_reply_from_watch_is_an_ack_and_needs_no_reply():
    c, d = wdecode({"type": "deviceMeasuringFrequency", "ident": 4321, "ref": "w:reply", "imei": W_IMEI})
    assert only(d.events, ev.Ack).ref == "4321"
    assert c.reply(d, bound=True, now=NOW) is None


def test_wonlex_dedupe_key_ignores_ident():
    msg = {"type": "upBO", "imei": W_IMEI, "data": "96", "timestamp": 1648111390074}
    _, a = wdecode({**msg, "ident": 111111})
    _, b = wdecode({**msg, "ident": 222222})                # the watch resends with a new ident
    assert a.dedupe_key and a.dedupe_key == b.dedupe_key


def test_wonlex_unknown_type_is_acked():
    c, d = wdecode({"type": "upCallLog", "ident": 9, "imei": W_IMEI})
    assert isinstance(d.events[0], ev.Unhandled)
    assert c.reply(d, bound=False, now=NOW) is not None


def test_wonlex_commands():
    c = WonlexCodec()
    plan = {"hr": {"mode": "native", "interval": 5}, "bp": {"mode": "requested", "interval": 5},
            "spo2": {"mode": "native", "interval": 10}, "temp": {"mode": "off"}}
    msg = json.loads(c.feed(c.encode(W_IMEI, ev.ApplySchedule(plan), NOW)[0])[0])
    assert msg["type"] == "deviceMeasuringFrequency" and msg["ref"] == "s:down"
    assert msg["configs"]["upHeartRate"] == {"interval": "5"}
    assert msg["configs"]["upBP"] == {"interval": "0"}       # polled by the gateway instead
    assert json.loads(c.feed(c.encode(W_IMEI, ev.MeasureNow("spo2"), NOW)[0])[0])["type"] == "dnBO"
    assert json.loads(c.feed(c.encode(W_IMEI, ev.SetBound(True), NOW)[0])[0])["status"] == 1
    assert c.encode(W_IMEI, ev.MeasureNow("stress"), NOW) == []


def test_wonlex_signature_is_order_independent_and_nested():
    a = {"type": "heartbeat", "imei": "1", "ident": 2, "data": {"b": 1, "a": [1, {"y": 2, "x": 1}]}}
    b = {"data": {"a": [1, {"x": 1, "y": 2}], "b": 1}, "ident": 2, "imei": "1", "type": "heartbeat"}
    assert sign(a, "TestKey") == sign(b, "TestKey")
    assert sign(a, "TestKey") != sign(a, "OtherKey")
    assert sign({**a, "encryptionCode": "X"}, "TestKey") == sign(a, "TestKey")


# ── BPW8 framing ────────────────────────────────────────────────────────────────────────

def test_bpw8_split_merged_and_garbage():
    c = Bpw8Codec()
    stream = (b"\r\n[CS*867956070000018*0015*LK,1708604720,0,96,96]"
              b"[CS*867956070000018*0013*HEART,1708356556,79]xx[CS*8679")
    out = []
    for i in range(0, len(stream), 5):
        out += c.feed(stream[i:i + 5])
    assert len(out) == 2
    assert c.buffer == bytearray(b"[CS*8679")


def test_bpw8_frame_length_is_hex_of_content():
    assert bpw8_frame(B_IMEI, "LK") == b"[CS*867956070000018*0002*LK]"
    assert bpw8_frame(B_IMEI, "STATUS,10") == b"[CS*867956070000018*0009*STATUS,10]"


# ── BPW8 messages (document samples, stray spaces and wrong LEN included) ─────────────

def test_bpw8_version_and_heartbeat():
    _, d = bdecode("[CS*867956070000018*0019*VER,1708618132,BPW8_V0.03]")
    hello = only(d.events, ev.Hello)
    assert (hello.model, hello.firmware) == ("BPW8", "BPW8_V0.03")
    _, d = bdecode("[CS*867956070000018*0015*LK,1708604720,0,96,96]")
    hb = only(d.events, ev.Heartbeat)
    assert (hb.battery, hb.steps) == (96, 0)


def test_bpw8_vitals():
    _, d = bdecode("[CS*867956070000018*0013*HEART,1708356556,79]")
    assert only(d.events, ev.VitalSample).heart_rate == 79
    _, d = bdecode("[CS*867956070000018*0019*BPUP,1293874245,80,126,77]")
    s = only(d.events, ev.VitalSample)
    assert (s.heart_rate, s.bp_sys, s.bp_dia) == (80, 126, 77)
    assert s.measured_at.year == 2011                         # unsynced clock: the core falls back
    _, d = bdecode("[CS*867956070000018*0012*SPO2,1708606850,98]")
    assert only(d.events, ev.VitalSample).spo2 == 98
    _, d = bdecode("[CS*867956070000018*0019*TEMP,1708660441,35.6,24.5]")
    assert only(d.events, ev.VitalSample).skin_temp == 35.6
    _, d = bdecode("[CS*867956070000174*0014*BREATH,1715245816,17]")
    assert only(d.events, ev.Metric).value == 17


def test_bpw8_wear_battery_sos():
    _, d = bdecode("[CS*867956070000018*0011*WEAR,1708660441,0]")
    assert only(d.events, ev.Wear).worn is False
    _, d = bdecode("[CS*867956070000018*000e*BATTERY,8,0,3]")
    assert only(d.events, ev.Alarm).kind == "low_battery"
    _, d = bdecode("[CS*867956070000018*00b1*SOS,3,20230925111820,106,0E121.411783N31.178125T20080121165030"
                   "@460!0!9231!2351@wifi!AC:BC:32:78:A2:5F!-97#wifi1!AC:BC:32:78:A2:5F!-97]")
    alarm = only(d.events, ev.Alarm)
    assert alarm.kind == "sos"
    assert (alarm.location.lat, alarm.location.lon) == (31.178125, 121.411783)
    assert alarm.at == datetime(2023, 9, 25, 11, 18, 20)


def test_bpw8_sos_never_lost_to_bad_location():
    _, d = bdecode("[CS*867956070000018*0003*SOS]")
    assert only(d.events, ev.Alarm).kind == "sos"


def test_bpw8_location_without_fix():
    loc = parse_location("3,1708616176,152,1N0.0000E0.0000@460!0!29650!13846148!60@wifi0!04:6b:25:f1:0e:b1!-40".split(","),
                         "scheduled")
    assert loc.lat is None and loc.source == "wifi"


def test_bpw8_reply_and_unknown():
    c, d = bdecode("[CS*867956070000018*0013*HEART,1708356556,79]")
    assert c.reply(d, bound=True, now=NOW) == b"[CS*867956070000018*0005*HEART]"
    c, d = bdecode("[CS*867956070000018*0006*FOOBAR]")
    assert isinstance(d.events[0], ev.Unhandled) and c.reply(d, bound=True, now=NOW) is None


def test_bpw8_rejects_non_frames():
    c = Bpw8Codec()
    assert c.decode(b"[XX*123*0002*LK]", NOW).error
    assert c.decode(b"[CS*abc*0002*LK]", NOW).error


def test_bpw8_commands():
    c = Bpw8Codec()
    plan = {"hr": {"mode": "native", "interval": 15}, "spo2": {"mode": "requested", "interval": 5},
            "bp": {"mode": "native", "interval": 30}, "window": ("06:00", "10:00")}
    out = c.encode(B_IMEI, ev.ApplySchedule(plan), NOW)
    assert out == [b"[CS*867956070000018*000b*SET_HZ,1,15]", b"[CS*867956070000018*0015*SET_HZ,3,360,600,1,30]"]
    assert c.encode(B_IMEI, ev.MeasureNow("temp"), NOW) == [b"[CS*867956070000018*0009*STATUS,10]"]
    assert c.encode(B_IMEI, ev.SetBound(True), NOW) == []


def test_bpw8_dedupe_key_stable():
    _, a = bdecode("[CS*867956070000018*0013*HEART,1708356556,79]")
    _, b = bdecode("[CS*867956070000018*0013*HEART,1708356556,79]")
    _, c = bdecode("[CS*867956070000018*0013*HEART,1708356557,79]")
    assert a.dedupe_key == b.dedupe_key != c.dedupe_key


# ── schedule plans ──────────────────────────────────────────────────────────────────────

def test_plan_modes_for_bpw8_and_wonlex():
    from app.devices.registry import get_type
    from app.devices.schedule import outside_window, plan_for, requested_vitals
    profile = {"hr_interval_min": 5, "bp_interval_min": 5, "spo2_interval_min": 15, "temp_interval_min": 30,
               "hrv_interval_min": None, "stress_interval_min": 30, "window_start": "06:00", "window_end": "22:00"}
    bpw8 = plan_for(profile, get_type("bpw8_4g"))
    assert bpw8["hr"] == {"mode": "requested", "interval": 5}            # under its 10-min minimum
    assert bpw8["bp"] == {"mode": "native", "interval": 10, "clamped_from": 5}   # BP isn't polled
    assert bpw8["spo2"] == {"mode": "native", "interval": 15}
    assert bpw8["temp"] == {"mode": "requested", "interval": 30}        # no interval command
    assert bpw8["hrv"] == {"mode": "off"}
    assert bpw8["stress"]["mode"] == "unavailable"
    assert requested_vitals(bpw8) == {"hr": 5, "temp": 30}
    wonlex = plan_for(profile, get_type("wonlex_4g"))
    assert wonlex["hr"] == {"mode": "native", "interval": 5}
    closed = outside_window(wonlex)
    assert closed["hr"] == {"mode": "off"} and closed["window"] == ("06:00", "22:00")
