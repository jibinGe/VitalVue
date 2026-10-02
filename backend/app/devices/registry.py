"""One entry per 4G watch type: how it connects, how its id looks, and what it can do.

The API uses this to validate registrations and to tell the UI which controls to show; the
device-gateway uses it to open ports and to translate schedules. A new watch type is a new
entry here plus an adapter in app.devices.adapters.
"""
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

from app.models.device import DEVICE_4G, DEVICE_BPW8, DEVICE_WONLEX

VITALS = ("hr", "bp", "spo2", "temp", "hrv", "stress")

MAC_NUMBER_RE = re.compile(r"^[0-9A-F]{12}_\d{1,5}$")
IMEI_RE = re.compile(r"^\d{15}$")


def luhn_ok(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def validate_mac_number(raw: str) -> str:
    client_id = (raw or "").strip().upper()
    if not MAC_NUMBER_RE.match(client_id):
        raise ValueError("client_id must be MAC_DeviceNumber, e.g. F1F2F3F4F5F6_9999")
    return client_id


def validate_imei(raw: str) -> str:
    imei = re.sub(r"[\s-]", "", raw or "")
    if not IMEI_RE.match(imei):
        raise ValueError("IMEI must be 15 digits (dial *#06# on the watch or read it from the box)")
    if not luhn_ok(imei):
        raise ValueError("This IMEI fails its check digit; check for a typo")
    return imei


@dataclass(frozen=True)
class VitalLimit:
    """What a watch can do for one vital of the measurement schedule.

    native       the watch can measure this vital on its own schedule
    min_interval smallest native interval in minutes
    requestable  the server can ask the watch to measure it now ("measure now")
    """
    native: bool = False
    min_interval: int = 1
    requestable: bool = False


@dataclass(frozen=True)
class DeviceType:
    key: str
    label: str
    vendor: str
    transport: str                       # "mqtt" (EMQX) or "tcp" (device-gateway)
    id_label: str                        # what the admin types to register it
    validate_id: Callable[[str], str]
    source: str                          # vitals.source for its readings (max 10 chars)
    vitals: dict = field(default_factory=dict)          # vital -> VitalLimit
    schedule_window: bool = False        # watch applies the daily window itself
    upload_interval: bool = False        # watch batches uploads (Veepoo CA)
    confirms_schedule: bool = False      # watch acknowledges a schedule
    live_mode: bool = False              # real-time streaming (Veepoo C3)
    fall_detection: bool = False
    port_setting: Optional[str] = None   # settings attribute with the gateway port (tcp only)
    window_note: str = ""                # how the daily window works on this watch (UI text)

    def limit(self, vital: str) -> VitalLimit:
        return self.vitals.get(vital, VitalLimit())

    def public(self) -> dict:
        """What the UI needs to render registration and schedule controls."""
        return {
            "key": self.key, "label": self.label, "vendor": self.vendor, "transport": self.transport,
            "id_label": self.id_label,
            "vitals": {v: {"native": lim.native, "min_interval": lim.min_interval, "requestable": lim.requestable}
                       for v, lim in ((v, self.limit(v)) for v in VITALS)},
            "measure_now": [v for v in VITALS if self.limit(v).requestable],
            "schedule_window": self.schedule_window, "upload_interval": self.upload_interval,
            "confirms_schedule": self.confirms_schedule, "live_mode": self.live_mode,
            "fall_detection": self.fall_detection, "window_note": self.window_note,
        }


_NATIVE_1 = VitalLimit(native=True, min_interval=1)

TYPES: dict[str, DeviceType] = {
    DEVICE_4G: DeviceType(
        key=DEVICE_4G, label="Veepoo 4G", vendor="Veepoo", transport="mqtt",
        id_label="Client ID (MAC_DeviceNumber)", validate_id=validate_mac_number, source="mqtt",
        # Real limits are read back from the watch (E7) and refine these.
        vitals={"hr": _NATIVE_1, "bp": VitalLimit(native=True, min_interval=5), "spo2": _NATIVE_1,
                "temp": _NATIVE_1, "hrv": _NATIVE_1, "stress": _NATIVE_1},
        schedule_window=True, upload_interval=True, confirms_schedule=True, live_mode=True,
        fall_detection=True,
    ),
    DEVICE_WONLEX: DeviceType(
        key=DEVICE_WONLEX, label="Wonlex 4G", vendor="Wonlex", transport="tcp",
        id_label="IMEI", validate_id=validate_imei, source="wonlex",
        # deviceMeasuringFrequency (minutes). The protocol states no minimum: CONFIRM with Wonlex.
        vitals={"hr": VitalLimit(True, 1, True), "bp": VitalLimit(True, 1, True),
                "spo2": VitalLimit(True, 1, True), "temp": VitalLimit(True, 1, True),
                "hrv": VitalLimit(False, 1, True)},
        confirms_schedule=True, fall_detection=True, port_setting="GATEWAY_WONLEX_PORT",
        window_note="This watch has no daily window of its own: the server switches its measurements "
                    "on and off at the window's start and end.",
    ),
    DEVICE_BPW8: DeviceType(
        key=DEVICE_BPW8, label="CLOC BPW8", vendor="CLOC", transport="tcp",
        id_label="IMEI", validate_id=validate_imei, source="bpw8",
        # SET_HZ minimum is 10 minutes; temperature has no interval command (STATUS,10 only).
        vitals={"hr": VitalLimit(True, 10, True), "bp": VitalLimit(True, 10, True),
                "spo2": VitalLimit(True, 10, True), "temp": VitalLimit(False, 1, True)},
        port_setting="GATEWAY_BPW8_PORT",
        window_note="On this watch the daily window applies to blood pressure and to server-requested "
                    "vitals. Heart rate and SpO₂ measured by the watch itself (10 minutes or more) run all day.",
    ),
}


def get_type(key: str) -> DeviceType:
    try:
        return TYPES[key]
    except KeyError:
        raise ValueError(f"Unknown watch type {key!r}; choose one of: {', '.join(TYPES)}") from None


def tcp_types() -> list[DeviceType]:
    return [t for t in TYPES.values() if t.transport == "tcp"]
