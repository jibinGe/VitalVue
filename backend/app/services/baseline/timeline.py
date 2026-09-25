"""Timeline for the Baseline tab: points for a time range, health score, deterioration markers,
score trend and rule-based insights. Pure functions, no I/O.

Insights are returned as structured facts (type + numbers), not prose, so the wording lives in
one place (the UI) and every sentence is traceable to these values.
"""
from datetime import datetime, timedelta
from typing import Optional, Sequence

from app.services.baseline import stats as st
from app.services.baseline.stats import MAD_TO_SD
from app.services.baseline.engine import health_score
from app.services.baseline.population import (
    DETERIORATION_SCORE, SCORE_SIGNIFICANT, SCORE_WITHIN_BASELINE, STATUS_LEVEL, VITALS,
)

# range key → (hours shown, point resolution in minutes, interval-table column step in minutes)
RANGES = {
    "6h":  (6,   10, 30),
    "12h": (12,  10, 60),
    "24h": (24,  10, 120),
    "3d":  (72,  60, 360),
    "7d":  (168, 60, 720),
}
RECENT_HOURS = 2      # "current" part of the range for the score trend
TREND_POINTS = 5      # score change (points) that counts as improving / worsening


def usual_bands(mode: Optional[str], stats: dict) -> dict:
    """Per-vital "usual range" for the graphs: baseline ± 2 × the scoring spread (the Normal
    status zone); while learning (or for a vital without a personal baseline), the population range."""
    bands = {}
    for vital, cfg in VITALS.items():
        stat = (stats or {}).get(vital) if mode not in (None, "population") else None
        if stat:
            spread = max((stat.get("mad") or 0) * MAD_TO_SD, cfg["mad_floor"])
            bands[vital] = {"kind": "personal", "center": stat["median"],
                            "low": round(stat["median"] - 2 * spread, 1),
                            "high": round(stat["median"] + 2 * spread, 1)}
        else:
            bands[vital] = {"kind": "population", "center": None, "low": cfg["low"], "high": cfg["high"]}
    return bands


def score_band(score: Optional[int]) -> Optional[str]:
    if score is None:
        return None
    if score >= SCORE_WITHIN_BASELINE:
        return "Within baseline"
    return "Deviating" if score >= SCORE_SIGNIFICANT else "Significant change"


def _point_from_obs(o: dict) -> dict:
    vpo = o.get("vpo") or {}
    return {
        "t": o["window_start"],
        "score": health_score(vpo),
        "values": {v: o.get(v) for v in VITALS},
        "baseline": {v: (vpo.get(v) or {}).get("baseline") for v in VITALS},
        "status": {v: (vpo.get(v) or {}).get("status") for v in VITALS},
        "windows": 1,
        "used": 1 if o.get("is_stable") else 0,
        "reject_reason": o.get("reject_reason"),
    }


def _worst(statuses: Sequence[Optional[str]]) -> Optional[str]:
    known = [s for s in statuses if s]
    return max(known, key=lambda s: STATUS_LEVEL.get(s, -1)) if known else None


def _bucket(points: Sequence[dict], minutes: int) -> list[dict]:
    """Aggregate 10-minute points into `minutes`-long buckets.
    Values = median; score = LOWEST in the bucket and status = WORST, so a short deterioration
    is never averaged away at coarser resolutions."""
    buckets: dict[datetime, list[dict]] = {}
    for p in points:
        t = p["t"]
        key = t.replace(minute=(t.minute // minutes) * minutes if minutes < 60 else 0, second=0, microsecond=0)
        buckets.setdefault(key, []).append(p)
    out = []
    for key in sorted(buckets):
        group = buckets[key]
        scores = [p["score"] for p in group if p["score"] is not None]
        out.append({
            "t": key,
            "score": min(scores) if scores else None,
            "values": {v: st.median([p["values"][v] for p in group if p["values"][v] is not None]) for v in VITALS},
            "baseline": {v: next((p["baseline"][v] for p in reversed(group) if p["baseline"][v] is not None), None)
                         for v in VITALS},
            "status": {v: _worst([p["status"][v] for p in group]) for v in VITALS},
            "windows": sum(p["windows"] for p in group),
            "used": sum(p["used"] for p in group),
            "reject_reason": None,
        })
    return out


def _markers(points: Sequence[dict]) -> list[dict]:
    """One marker per run of consecutive points below DETERIORATION_SCORE, at the run's lowest
    score. Lists the vitals that were at moderate deviation or worse at that point."""
    markers, run = [], []

    def close_run():
        if not run:
            return
        low = min(run, key=lambda p: p["score"])
        changes = []
        for v, cfg in VITALS.items():
            status = low["status"].get(v)
            if STATUS_LEVEL.get(status, 0) < STATUS_LEVEL["Moderate deviation"]:
                continue
            value, base = low["values"].get(v), low["baseline"].get(v)
            pct = round((value - base) / base * 100, 1) if value is not None and base else None
            changes.append({"vital": v, "label": cfg["label"], "status": status, "percentDeviation": pct,
                            "direction": "up" if pct is not None and pct > 0 else "down"})
        markers.append({"t": low["t"], "score": low["score"], "changes": changes})

    for p in points:
        if p["score"] is not None and p["score"] < DETERIORATION_SCORE:
            run.append(p)
        else:
            close_run()
            run = []
    close_run()
    return markers


def build_timeline(observations: Sequence[dict], range_key: str, now: datetime,
                   learning: dict, mode: Optional[str]) -> dict:
    """observations: oldest → newest, each {window_start, <vital medians>, vpo, is_stable, reject_reason}."""
    hours, resolution, table_step = RANGES[range_key]
    start = now - timedelta(hours=hours)
    in_range = [o for o in observations if o["window_start"] >= start]
    raw_points = [_point_from_obs(o) for o in in_range]
    points = raw_points if resolution == 10 else _bucket(raw_points, resolution)

    scored_stable = [p["score"] for p, o in zip(raw_points, in_range) if o.get("is_stable") and p["score"] is not None]
    usual_score = round(st.median(scored_stable)) if scored_stable else None

    current = raw_points[-1] if raw_points else None
    current_score = current["score"] if current else None

    recent_cut = now - timedelta(hours=RECENT_HOURS)
    recent = [p["score"] for p in raw_points if p["t"] >= recent_cut and p["score"] is not None]
    earlier = [p["score"] for p in raw_points if p["t"] < recent_cut and p["score"] is not None]
    score_trend = None
    if recent and earlier:
        diff = st.median(recent) - st.median(earlier)
        score_trend = {"trend": "Improving" if diff >= TREND_POINTS else "Worsening" if diff <= -TREND_POINTS else "Stable",
                       "change": round(diff, 1), "vs_hours": hours - RECENT_HOURS}

    markers = _markers(points)
    insights = []
    if mode in (None, "population"):
        insights.append({"type": "learning", "stable": learning.get("stable", 0), "required": learning.get("required", 12)})
    if not raw_points:
        insights.append({"type": "no_data", "hours": hours})
    if markers:
        worst = min(markers, key=lambda m: m["score"])
        insights.append({"type": "drop", "t": worst["t"], "score": worst["score"], "changes": worst["changes"],
                         "episodes": len(markers)})
        if current_score is not None:
            if current_score >= SCORE_WITHIN_BASELINE:
                state = "recovered"
            elif current_score > worst["score"] + TREND_POINTS:
                state = "recovering"
            else:
                state = "still_low"
            insights.append({"type": "recovery", "state": state, "score": current_score})
    elif current_score is not None:
        insights.append({"type": "steady", "score": current_score, "band": score_band(current_score)})
    kept_out = {}
    for o in in_range:
        if not o.get("is_stable") and o.get("reject_reason"):
            kept_out[o["reject_reason"]] = kept_out.get(o["reject_reason"], 0) + 1
    if kept_out:
        insights.append({"type": "kept_out", "counts": kept_out, "total": len(in_range)})

    return {
        "range": range_key,
        "hours": hours,
        "resolution_minutes": resolution,
        "table_step_minutes": table_step,
        "start": start,
        "end": now,
        "points": points,
        "markers": markers,
        "usual_score": usual_score,
        "current": {"score": current_score, "band": score_band(current_score),
                    "t": current["t"] if current else None},
        "score_trend": score_trend,
        "insights": insights,
        "thresholds": {"within_baseline": SCORE_WITHIN_BASELINE, "significant": SCORE_SIGNIFICANT,
                       "deterioration": DETERIORATION_SCORE},
    }
