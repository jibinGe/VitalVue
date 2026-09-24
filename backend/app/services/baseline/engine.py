"""Baseline Engine v1 — the Baseline & Trend layer. Pure functions, no I/O.

raw readings ─► build_observation ─► compute_vpo (per vital) ─► is_stable ─► baseline buffer
                                                                                │
                                          build_baseline_stats ◄────────────────┘
"""
from typing import Optional, Sequence

from app.services.baseline import stats as st
from app.services.baseline.population import (
    ACTIVE_MIN_MOVEMENT, LEARNING_OBSERVATIONS, RESTING_MAX_MOVEMENT, STATUS_BANDS, STATUS_LEVEL, VITALS,
)
from app.services.baseline.trend import classify_trend, persistence

STUCK_MIN_SAMPLES = 20  # identical HR across this many readings = a stuck sensor


def _num(value) -> Optional[float]:
    """Float or None. Stress arrives as a string, sometimes a label ("Low") — labels are skipped."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _positive(values):
    return [v for v in (_num(x) for x in values) if v is not None and v > 0]


def build_observation(rows: Sequence[dict]) -> Optional[dict]:
    """Collapse one window of raw `vitals` rows into a single observation (per-vital medians).

    Rows need: heart_rate, spo2, bp_systolic, bp_diastolic, hrv_score, stress_level, movement,
    is_connected, is_removed. Returns None for an empty window."""
    total = len(rows)
    if total == 0:
        return None
    good = [r for r in rows if r.get("is_connected", True) and not r.get("is_removed", False)]
    good_ratio = len(good) / total

    hr = _positive(r.get("heart_rate") for r in good)
    maps = [
        (s + 2 * d) / 3
        for s, d in ((_num(r.get("bp_systolic")), _num(r.get("bp_diastolic"))) for r in good)
        if s and d and s > 0 and d > 0
    ]
    movement = [v for v in (_num(r.get("movement")) for r in good) if v is not None and v >= 0]

    stuck = len(hr) >= STUCK_MIN_SAMPLES and len(set(hr)) == 1
    if good_ratio < 0.5 or stuck or not hr:
        signal_quality = "poor"
    elif good_ratio < 0.8:
        signal_quality = "fair"
    else:
        signal_quality = "good"

    movement_median = st.median(movement)
    if movement_median is None:
        activity = None
    elif movement_median <= RESTING_MAX_MOVEMENT:
        activity = "resting"
    elif movement_median >= ACTIVE_MIN_MOVEMENT:
        activity = "active"
    else:
        activity = "light"

    return {
        "sample_count": total,
        "good_ratio": round(good_ratio, 3),
        "hr": st.median(hr),
        "hrv": st.median(_positive(r.get("hrv_score") for r in good)),
        "sbp": st.median(_positive(r.get("bp_systolic") for r in good)),
        "dbp": st.median(_positive(r.get("bp_diastolic") for r in good)),
        "map": st.median(maps),
        "spo2": st.median(_positive(r.get("spo2") for r in good)),
        "stress": st.median(_positive(r.get("stress_level") for r in good)),
        "movement": movement_median,
        "activity_state": activity,
        "signal_quality": "poor" if stuck else signal_quality,
        "stuck_sensor": stuck,
    }


def _is_critical(cfg: dict, value: float) -> bool:
    return (cfg["critical_low"] is not None and value < cfg["critical_low"]) or \
           (cfg["critical_high"] is not None and value > cfg["critical_high"])


def _outside_population(cfg: dict, value: float) -> bool:
    return (cfg["low"] is not None and value < cfg["low"]) or \
           (cfg["high"] is not None and value > cfg["high"])


def _population_reference(cfg: dict) -> Optional[float]:
    if cfg["low"] is not None and cfg["high"] is not None:
        return (cfg["low"] + cfg["high"]) / 2
    return cfg["low"] if cfg["low"] is not None else cfg["high"]


def classify_status(vital: str, current: float, baseline: Optional[dict]) -> tuple[str, Optional[float]]:
    """Status + robust z. Without a personal baseline (population mode) only the population
    range and the fixed critical thresholds apply."""
    cfg = VITALS[vital]
    if _is_critical(cfg, current):
        rz = st.robust_z(current, baseline["median"], baseline.get("mad"), cfg["mad_floor"]) if baseline else None
        return "Critical", rz
    if not baseline:
        return ("Mild deviation" if _outside_population(cfg, current) else "Normal"), None

    rz = st.robust_z(current, baseline["median"], baseline.get("mad"), cfg["mad_floor"])
    bad_z = {"up": max(rz, 0.0), "down": max(-rz, 0.0)}.get(cfg["bad"], abs(rz))
    for cutoff, label in STATUS_BANDS:
        if bad_z >= cutoff:
            return label, rz
    return "Normal", rz


def _variability_label(mad_value: Optional[float], median_value: Optional[float]) -> Optional[str]:
    if mad_value is None or not median_value:
        return None
    cv = mad_value / median_value
    return "Low" if cv < 0.05 else "Moderate" if cv < 0.15 else "High"


def compute_vpo(obs: dict, mode: str, baseline_stats: dict, history: Sequence[dict],
                learning_confidence: float) -> dict:
    """Vital Parameter Object per vital.

    obs                  this window's observation (build_observation output)
    mode                 population / personal / adaptive
    baseline_stats       {vital: {median, mad, mean, sd, n, confidence}} (ignored in population mode)
    history              earlier observations of this episode, oldest → newest, each with the
                         vital medians and its stored `vpo`
    learning_confidence  baseline confidence while still in population mode (n_stable / 12)
    """
    result = {}
    for vital, cfg in VITALS.items():
        current = obs.get(vital)
        if current is None:
            continue
        base = baseline_stats.get(vital) if mode != "population" else None
        reference = base["median"] if base else _population_reference(cfg)

        status, rz = classify_status(vital, current, base)
        trend = classify_trend(
            [h.get(vital) for h in history] + [current], cfg["bad"], reference, cfg["mad_floor"],
        )
        previous_statuses = [(h.get("vpo") or {}).get(vital, {}).get("status", "Normal") for h in history]

        delta = current - base["median"] if base else None
        threshold_score = 2 if _is_critical(cfg, current) else 1 if _outside_population(cfg, current) else 0
        deviation_score = max(STATUS_LEVEL[status], 0)
        z = st.z_score(current, base.get("mean"), base.get("sd"), cfg["mad_floor"]) if base else None

        result[vital] = {
            "label": cfg["label"],
            "unit": cfg["unit"],
            "current": round(current, 1),
            "populationRange": {"low": cfg["low"], "high": cfg["high"]},
            "baseline": round(base["median"], 1) if base else None,
            "variability": {
                "mad": base.get("mad") if base else None,
                "sd": base.get("sd") if base else None,
                "level": _variability_label(base.get("mad"), base.get("median")) if base else None,
            },
            "delta": round(delta, 1) if delta is not None else None,
            "percentDeviation": round(st.percent_dev(current, base["median"]), 1) if base and base["median"] else None,
            "zScore": round(z, 2) if z is not None else None,
            "robustZ": round(rz, 2) if rz is not None else None,
            "trend": trend["trend"],
            "trendScore": trend["trendScore"],
            "rate": trend["rate"],
            "persistence": persistence(previous_statuses, status),
            "signalQuality": obs.get("signal_quality"),
            "activityState": obs.get("activity_state"),
            "confidence": round(base.get("confidence", 0.0) if base else learning_confidence, 2),
            "score": max(threshold_score + trend["trendScore"] + deviation_score, 0),
            "status": status,
        }
    return result


def is_stable(obs: dict, vpo: dict, mode: str, alert_in_window: bool) -> tuple[bool, Optional[str]]:
    """May this observation enter the baseline buffer? (the spec's contribution filter + freeze
    logic). Deteriorating windows are kept out so the baseline can't drift towards them."""
    if obs.get("signal_quality") != "good":
        return False, "stuck_sensor" if obs.get("stuck_sensor") else "poor_signal"
    if obs.get("activity_state") == "active":
        return False, "motion"
    if alert_in_window:
        return False, "alert_active"
    # Population mode can't judge "deterioration" against the patient's own normal yet
    # (HR 55 may be normal for them), so only a critical value freezes it.
    freeze_level = STATUS_LEVEL["Critical"] if mode == "population" else STATUS_LEVEL["Moderate deviation"]
    if any(STATUS_LEVEL.get(p["status"], 0) >= freeze_level for p in vpo.values()):
        return False, "deterioration"
    return True, None


def build_baseline_stats(stable_obs: Sequence[dict]) -> tuple[dict, float]:
    """Per-vital median / MAD / mean / SD from the stable buffer, plus confidence (0–1).

    Confidence per vital = coverage of the 12-observation buffer, reduced when the patient's
    own variability is high or signal coverage was patchy."""
    stats = {}
    for vital in VITALS:
        values = [o[vital] for o in stable_obs if o.get(vital) is not None]
        if not values:
            continue
        m, spread = st.median(values), st.mad(values)
        confidence = min(1.0, len(values) / LEARNING_OBSERVATIONS)
        if m and spread / m > 0.15:
            confidence *= 0.8
        good = [o.get("good_ratio", 1.0) for o in stable_obs]
        confidence *= min(1.0, sum(good) / len(good) / 0.9) if good else 1.0
        stats[vital] = {
            "median": round(m, 2),
            "mad": round(spread, 2),
            "mean": round(st.mean(values), 2),
            "sd": round(st.sd(values), 2) if len(values) >= 2 else None,
            "n": len(values),
            "confidence": round(confidence, 2),
        }
    overall = round(sum(s["confidence"] for s in stats.values()) / len(stats), 2) if stats else 0.0
    return stats, overall
