"""Turn a patient's measurement schedule into what a particular watch will actually do.

For each vital one of:
  native     the watch measures on its own at this interval (best for battery, survives gaps)
  requested  the device-gateway asks the watch to measure when it's due ("measure now")
  native + clamped_from   the watch can't go that fast: its minimum is used instead
  off / unavailable       not scheduled, or this watch can't measure it at all

Server-requested measurement only works while the watch is connected and worn, and costs more
battery, so by default it's allowed only for quick measurements. Blood pressure is clamped
instead (a cuffless BP reading takes about a minute and is uncomfortable every few minutes).
"""
from app.devices.registry import DeviceType
from app.services.monitoring import VITAL_FIELDS

REQUESTED_ALLOWED = ("hr", "spo2", "temp", "hrv")


def plan_for(profile: dict, dtype: DeviceType, allow_requested=REQUESTED_ALLOWED) -> dict:
    plan = {}
    for vital, field in VITAL_FIELDS.items():
        interval = profile.get(field)
        lim = dtype.limit(vital)
        if interval is None:
            plan[vital] = {"mode": "off"}
        elif lim.native and interval >= lim.min_interval:
            plan[vital] = {"mode": "native", "interval": interval}
        elif lim.requestable and vital in allow_requested:
            plan[vital] = {"mode": "requested", "interval": interval}
        elif lim.native:
            plan[vital] = {"mode": "native", "interval": lim.min_interval, "clamped_from": interval}
        else:
            plan[vital] = {"mode": "unavailable", "requested_interval": interval}
    if profile.get("window_start") and profile.get("window_end"):
        plan["window"] = (profile["window_start"], profile["window_end"])
    return plan


def outside_window(plan: dict) -> dict:
    """The plan to send while the daily window is closed, for a watch with no window of its
    own: everything it measures by itself is switched off (requested vitals simply aren't
    polled meanwhile)."""
    return {v: ({"mode": "off"} if isinstance(e, dict) and e.get("mode") == "native" else e)
            for v, e in plan.items()}


def requested_vitals(plan: dict) -> dict:
    """{vital: interval_minutes} for the vitals the gateway must poll."""
    return {v: e["interval"] for v, e in plan.items()
            if isinstance(e, dict) and e.get("mode") == "requested"}
