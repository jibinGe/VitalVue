"""The latest *measured* value of each vital from a patient's recent rows.

4G watches send one vital per message, so the newest row usually carries only one vital (the
others are 0 = not measured). Showing that row as "current vitals" would display HR 0 or
BP 0/0. These helpers take each vital from the newest row that actually measured it.
"""
from argparse import Namespace
from typing import Optional, Sequence

VITAL_KEYS = ("heart_rate", "spo2", "temp", "bp_systolic", "bp_diastolic", "hrv_score")


def latest_measured(rows_newest_first: Sequence) -> Optional[Namespace]:
    """A row-like object: the newest row's fields, with each vital filled from the newest
    connected, worn row that measured it (BP as a pair). None when there are no rows."""
    if not rows_newest_first:
        return None
    newest = rows_newest_first[0]
    merged = {c: getattr(newest, c, None) for c in (
        "patient_id", "is_connected", "is_removed", "created_at", "news2_score", "af_warning",
        "stroke_risk", "seizure_risk", "movement", "battery_percent", *VITAL_KEYS)}
    if newest.is_removed or not newest.is_connected:
        return Namespace(**merged)          # removed / offline: show it as it is
    live = [r for r in rows_newest_first if r.is_connected and not r.is_removed]
    for key in ("heart_rate", "spo2", "temp", "hrv_score"):
        merged[key] = next((getattr(r, key) for r in live if getattr(r, key)), getattr(newest, key))
    bp = next((r for r in live if r.bp_systolic and r.bp_diastolic), None)
    if bp is not None:
        merged["bp_systolic"], merged["bp_diastolic"] = bp.bp_systolic, bp.bp_diastolic
    merged["af_warning"] = next((r.af_warning for r in live if r.af_warning), "Normal")
    return Namespace(**merged)
