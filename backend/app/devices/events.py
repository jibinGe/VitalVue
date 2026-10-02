"""The vendor-neutral language between protocol adapters and the rest of VitalVue.

Adapters turn a watch's bytes into these events, and these commands into the watch's bytes.
Nothing outside app.devices.adapters knows any vendor's wire format. None always means
"not reported" — never use 0 for that here (0 is how the shared ingest pipeline spells it).
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


# ── events (watch → server) ─────────────────────────────────────────────────────────────

@dataclass
class Hello:
    """The watch introduced itself (Wonlex login, BPW8 VER)."""
    model: Optional[str] = None
    firmware: Optional[str] = None
    iccid: Optional[str] = None
    sim_phone: Optional[str] = None
    battery: Optional[int] = None
    extra: dict = field(default_factory=dict)


@dataclass
class Heartbeat:
    battery: Optional[int] = None
    charging: Optional[bool] = None
    steps: Optional[int] = None


@dataclass
class VitalSample:
    """One measurement moment; any subset of vitals."""
    measured_at: Optional[datetime]
    heart_rate: Optional[int] = None
    spo2: Optional[float] = None
    bp_sys: Optional[int] = None
    bp_dia: Optional[int] = None
    skin_temp: Optional[float] = None     # what goes into vitals.temp
    body_temp: Optional[float] = None     # the watch's estimated core temperature (raw log only)
    hrv_ms: Optional[int] = None
    trigger: str = "scheduled"            # scheduled | manual (on the watch) | requested (by us)

    def has_vitals(self) -> bool:
        return any(v is not None for v in (self.heart_rate, self.spo2, self.bp_sys, self.skin_temp, self.hrv_ms))


@dataclass
class Metric:
    """A value that doesn't feed NEWS2: respiratory rate, glucose, steps, ambient temperature…"""
    kind: str
    measured_at: Optional[datetime]
    value: Optional[float] = None
    text: Optional[str] = None
    unit: Optional[str] = None


@dataclass
class Battery:
    percent: Optional[int]
    charging: Optional[bool] = None
    reason: Optional[str] = None          # scheduled | low | on | off


@dataclass
class Wear:
    worn: bool
    at: Optional[datetime] = None


@dataclass
class Location:
    at: Optional[datetime]
    lat: Optional[float] = None
    lon: Optional[float] = None
    source: str = "unknown"               # gps | wifi | cell | unknown
    reason: str = "scheduled"             # scheduled | query | sos | fall
    raw: dict = field(default_factory=dict)


@dataclass
class Alarm:
    kind: str                             # sos | fall | low_battery | power_off
    at: Optional[datetime] = None
    location: Optional[Location] = None


@dataclass
class Sleep:
    """One night's sleep (a watch may re-send it as the night goes on; the latest wins)."""
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    deep_min: Optional[int] = None
    light_min: Optional[int] = None
    rem_min: Optional[int] = None
    awake_min: Optional[int] = None
    segments: list = field(default_factory=list)   # [{"start", "end", "minutes", "stage"}]


@dataclass
class Ack:
    """The watch confirmed one of our commands."""
    command: str
    ok: bool = True
    ref: Optional[str] = None             # our command's id (Wonlex ident)


@dataclass
class ConfigRequest:
    """The watch asks for its configuration (Wonlex upGetDevConfig)."""


@dataclass
class BindStatusRequest:
    """The watch asks whether it is linked to someone (Wonlex upGetDevBindStatus)."""


@dataclass
class ReportedConfig:
    """Settings changed on the watch itself."""
    configs: dict


@dataclass
class Unhandled:
    """A message we acknowledge and keep in the raw log but don't act on (yet)."""
    name: str


# ── commands (server → watch) ───────────────────────────────────────────────────────────

@dataclass
class ApplySchedule:
    """plan: {vital: {"mode": "native"|"requested"|"off", "interval": minutes}} plus optional
    "window": ("HH:MM", "HH:MM"). Only native vitals go to the watch; requested ones are
    polled by the gateway."""
    plan: dict


@dataclass
class MeasureNow:
    vital: str                            # hr | bp | spo2 | temp | hrv


@dataclass
class SetBound:
    bound: bool


@dataclass
class SetAlarmSwitches:
    fall: bool = True
    low_battery_pct: Optional[int] = 20


@dataclass
class Locate:
    pass


@dataclass
class Reboot:
    pass


@dataclass
class PowerOff:
    pass
