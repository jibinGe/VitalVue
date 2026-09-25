"""Trend, rate of change and persistence over the last few 10-minute observations. No I/O."""
from typing import Optional, Sequence

from app.services.baseline.population import STATUS_LEVEL, WINDOW_MINUTES

TREND_POINTS = 5            # look at up to the last 5 observations
TREND_SCORE = {"Stable": 0, "Improving": -1, "Slow worsening": 1, "Rapid worsening": 2,
               "Oscillating": 0, "Unknown": 0}


def _slope_per_minute(values: Sequence[float], window_minutes: int) -> float:
    """Least-squares slope, observations spaced `window_minutes` apart."""
    n = len(values)
    xs = [i * window_minutes for i in range(n)]
    x_bar, y_bar = sum(xs) / n, sum(values) / n
    denom = sum((x - x_bar) ** 2 for x in xs)
    return sum((x - x_bar) * (y - y_bar) for x, y in zip(xs, values)) / denom if denom else 0.0


def _direction_changes(values: Sequence[float], min_step: float) -> int:
    """How often the series reverses direction, ignoring steps smaller than `min_step`."""
    signs = [1 if b > a else -1 for a, b in zip(values, values[1:]) if abs(b - a) >= min_step]
    return sum(1 for a, b in zip(signs, signs[1:]) if a != b)


def classify_trend(values: Sequence[Optional[float]], bad: str, reference: Optional[float],
                   floor: float, window_minutes: int = WINDOW_MINUTES) -> dict:
    """Classify the series (oldest → newest).

    bad        "up", "down" or "both" — which direction is deterioration for this vital
    reference  personal baseline (or population mid-point); for "both" vitals, moving away from
               it is worsening and moving back towards it is improving
    floor      the vital's MAD floor; a change below half of it per window counts as stable
    """
    series = [v for v in values if v is not None][-TREND_POINTS:]
    if len(series) < 2:
        return {"trend": "Unknown", "trendScore": 0, "rate": None}

    rate = _slope_per_minute(series, window_minutes)
    if len(series) < 3:
        return {"trend": "Unknown", "trendScore": 0, "rate": round(rate, 3)}

    if _direction_changes(series, floor / 2) >= 2:
        trend = "Oscillating"
    else:
        change_per_window = rate * window_minutes
        if abs(change_per_window) < floor / 2:
            trend = "Stable"
        else:
            if bad == "up":
                worse_sign = 1
            elif bad == "down":
                worse_sign = -1
            else:  # both: away from the reference is worse
                worse_sign = 1 if reference is None or series[-1] >= reference else -1
            if rate * worse_sign < 0:
                trend = "Improving"
            elif abs(change_per_window) >= 3 * floor:
                trend = "Rapid worsening"
            else:
                trend = "Slow worsening"
    return {"trend": trend, "trendScore": TREND_SCORE[trend], "rate": round(rate, 3)}


def persistence(previous_statuses: Sequence[str], current_status: str) -> int:
    """Consecutive abnormal windows ending with the current one (0 if the current is normal)."""
    if STATUS_LEVEL.get(current_status, 0) < STATUS_LEVEL["Mild deviation"]:
        return 0
    count = 1
    for status in reversed(previous_statuses):
        if STATUS_LEVEL.get(status, 0) >= STATUS_LEVEL["Mild deviation"]:
            count += 1
        else:
            break
    return count
