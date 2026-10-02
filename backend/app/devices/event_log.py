"""Readable log of everything devices send (and what we send back), for bring-up and debugging.

Off unless LOG_DEVICE_EVENTS=true. Two kinds of block:

  frame    one message on the wire: BPW8 / Wonlex (device-gateway) or Veepoo (mqtt-worker),
           in or out, with what it decoded to, what happened to it, and the raw bytes
  reading  one reading stored in `vitals`, from any source (including the BLE mobile app)

Patients appear by ID only (never name or phone). Vitals are still tied to that ID, so keep
this off in normal production use. When off, every function returns before formatting anything.

    12:01:05 UTC ┌─ IN   BPW8    867956070000018  patient 34  HEART  → parsed
    │  Heart rate 79 bpm  (measured 2026-10-01 12:01:04 UTC)
    └─ raw  [CS*867956070000018*0013*HEART,1708356556,79]
"""
import json
import logging
import sys
import time
from datetime import datetime
from typing import Iterable, Optional

from app.core.config import settings
from app.devices import events as ev

log = logging.getLogger("device.events")
_configured = False


def _logger() -> logging.Logger:
    """Its own stdout handler, so the blocks look the same in the API, gateway and mqtt-worker
    whatever their logging setup (uvicorn's, basicConfig…)."""
    global _configured
    if not _configured:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter("%(asctime)s UTC %(message)s", "%H:%M:%S")
        formatter.converter = time.gmtime                # same clock as the measurement times shown
        handler.setFormatter(formatter)
        log.addHandler(handler)
        log.setLevel(logging.INFO)
        log.propagate = False
        _configured = True
    return log

SOURCE_LABEL = {"ble": "BLE app", "mqtt": "Veepoo", "wonlex": "Wonlex", "bpw8": "BPW8",
                "wonlex_4g": "Wonlex", "bpw8_4g": "BPW8", "veepoo_4g": "Veepoo"}


def enabled() -> bool:
    return bool(settings.LOG_DEVICE_EVENTS)


def _t(dt: Optional[datetime]) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S UTC") if dt else "time unknown"


def _num(v, fmt="{:g}"):
    return fmt.format(v) if isinstance(v, (int, float)) else str(v)


def _raw(raw) -> str:
    """Text frames as text, binary (Veepoo) as hex; trimmed to LOG_DEVICE_EVENTS_RAW_CHARS."""
    limit = max(40, int(settings.LOG_DEVICE_EVENTS_RAW_CHARS))
    if isinstance(raw, (bytes, bytearray)):
        b = bytes(raw)
        if b[:2] == b"\xfc\xaf":                     # Wonlex: 4-byte header + JSON
            text = b[4:].decode("utf-8", errors="replace")
        elif b[:1] in (b"[", b"{"):                   # BPW8 frame, or Wonlex JSON without its header
            text = b.decode("utf-8", errors="replace")
        else:
            text = b.hex(" ")
    else:
        text = str(raw)
    text = text.replace("\r", "").replace("\n", " ")
    return text if len(text) <= limit else f"{text[:limit]}… ({len(text)} chars)"


def describe(e) -> str:
    """One line for a canonical event."""
    if isinstance(e, ev.VitalSample):
        parts = []
        if e.heart_rate is not None:
            parts.append(f"Heart rate {e.heart_rate} bpm")
        if e.spo2 is not None:
            parts.append(f"SpO₂ {_num(e.spo2)} %")
        if e.bp_sys is not None or e.bp_dia is not None:
            parts.append(f"BP {e.bp_sys}/{e.bp_dia} mmHg")
        if e.skin_temp is not None:
            parts.append(f"Skin temp {_num(e.skin_temp)} °C")
        if e.body_temp is not None:
            parts.append(f"Body temp {_num(e.body_temp)} °C")
        if e.hrv_ms is not None:
            parts.append(f"HRV {e.hrv_ms} ms")
        trigger = "" if e.trigger == "scheduled" else f", {e.trigger}"
        return f"{' · '.join(parts) or 'empty reading'}  (measured {_t(e.measured_at)}{trigger})"
    if isinstance(e, ev.Metric):
        value = _num(e.value) if e.value is not None else (e.text or "")
        if e.kind == "rri":
            value = f"{int(e.value or 0)} RR intervals"
        return f"{e.kind.replace('_', ' ').capitalize()} {value}{' ' + e.unit if e.unit and e.kind != 'rri' else ''}  ({_t(e.measured_at)})"
    if isinstance(e, ev.Alarm):
        where = f" near {e.location.lat:.5f}, {e.location.lon:.5f}" if e.location and e.location.lat is not None else ""
        return f"⚠ ALARM {e.kind.upper()}{where}  ({_t(e.at)})"
    if isinstance(e, ev.Hello):
        bits = [f"model {e.model}" if e.model else "", f"firmware {e.firmware}" if e.firmware else "",
                f"battery {e.battery} %" if e.battery is not None else "", f"SIM {e.iccid}" if e.iccid else ""]
        return "Hello: " + (", ".join(b for b in bits if b) or "no details")
    if isinstance(e, ev.Heartbeat):
        bits = [f"battery {e.battery} %" if e.battery is not None else "",
                ("charging" if e.charging else "not charging") if e.charging is not None else "",
                f"steps {e.steps}" if e.steps is not None else ""]
        return "Heartbeat" + (": " + ", ".join(b for b in bits if b) if any(bits) else "")
    if isinstance(e, ev.Battery):
        return f"Battery {e.percent} %{' (' + e.reason + ')' if e.reason else ''}"
    if isinstance(e, ev.Wear):
        return f"Watch {'put on' if e.worn else 'TAKEN OFF'}  ({_t(e.at)})"
    if isinstance(e, ev.Location):
        pos = f"{e.lat:.5f}, {e.lon:.5f}" if e.lat is not None else "no GPS fix"
        return f"Location {pos} via {e.source}, {e.reason}  ({_t(e.at)})"
    if isinstance(e, ev.Sleep):
        return (f"Sleep night ending {_t(e.end)}: deep {e.deep_min} · light {e.light_min} · "
                f"REM {e.rem_min} · awake {e.awake_min} min")
    if isinstance(e, ev.Ack):
        return f"Watch confirmed {e.command}" + (f" (ref {e.ref})" if e.ref else "")
    if isinstance(e, ev.ConfigRequest):
        return "Watch asks for its settings"
    if isinstance(e, ev.BindStatusRequest):
        return "Watch asks whether it is linked to a patient"
    if isinstance(e, ev.ReportedConfig):
        return f"Settings changed on the watch: {', '.join(e.configs) or 'none'}"
    if isinstance(e, ev.Unhandled):
        return f"{e.name}: kept in the raw log only"
    return type(e).__name__


def out_name(raw) -> str:
    """The command in a frame we send: BPW8 "[CS*imei*len*SET_HZ,1,15]" → SET_HZ; Wonlex → its type."""
    try:
        b = bytes(raw)
        if b[:2] == b"\xfc\xaf":
            return str(json.loads(b[4:]).get("type", "?"))
        if b[:1] == b"[":
            return b.decode("utf-8", errors="replace")[1:-1].split("*", 3)[-1].split(",")[0].strip() or "?"
    except Exception:
        pass
    return "?"


def _header(direction: str, source: str, device: str, patient_id, name: str, status: str = "") -> str:
    who = f"patient {patient_id}" if patient_id else ("" if direction == "OUT" else "no patient")
    return (f"┌─ {direction:<4} {SOURCE_LABEL.get(source, source):<7} {device}  {who + '  ' if who else ''}{name}"
            + (f"  → {status}" if status else ""))


def frame(direction: str, source: str, device: str, patient_id, name: str, raw,
          events: Iterable = (), status: str = "", note: str = "") -> None:
    """Log one message on the wire. direction: IN (from the watch) or OUT (to it)."""
    if not enabled():
        return
    lines = [_header(direction, source, device, patient_id, name, status)]
    lines += [f"│  {describe(e)}" for e in events]
    if note:
        lines.append(f"│  {note}")
    lines.append(f"└─ raw  {_raw(raw)}")
    _logger().info("\n".join(lines))


def reading(source: str, device: str, patient_id, measured_at: Optional[datetime], vitals: dict,
            news2=None, status: Optional[str] = None) -> None:
    """Log one reading as stored in `vitals` (any source, including the BLE app)."""
    if not enabled():
        return
    def v(key, unit, fmt="{:g}"):
        val = vitals.get(key)
        return f"{_num(val, fmt)}{unit}" if val else "–"
    bp = (f"{vitals.get('bp_systolic')}/{vitals.get('bp_diastolic')}"
          if vitals.get("bp_systolic") and vitals.get("bp_diastolic") else "–")
    flags = []
    if vitals.get("is_removed"):
        flags.append("WATCH/BAND REMOVED")
    if vitals.get("is_connected") is False:
        flags.append("DISCONNECTED")
    _logger().info("\n".join([
        f"┌─ STORED {SOURCE_LABEL.get(source, source):<7} {device}  patient {patient_id}  {_t(measured_at)}"
        + (f"  ({', '.join(flags)})" if flags else ""),
        f"└─ HR {v('heart_rate', '')} · SpO₂ {v('spo2', '%')} · BP {bp} · temp {v('temp', '°C')} · "
        f"HRV {v('hrv_score', '')} · NEWS2 {news2 if news2 is not None else '–'} · {status or '–'}",
    ]))
