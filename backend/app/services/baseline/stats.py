"""Pure statistics used by the baseline engine. No I/O."""
import statistics
from typing import Optional, Sequence

# Scales a MAD to be comparable with a standard deviation for normally distributed data.
MAD_TO_SD = 1.4826


def median(values: Sequence[float]) -> Optional[float]:
    return float(statistics.median(values)) if values else None


def mad(values: Sequence[float]) -> Optional[float]:
    """Median Absolute Deviation (unscaled) — robust to single outliers like a 120 in a run of 82s."""
    m = median(values)
    if m is None:
        return None
    return float(statistics.median([abs(v - m) for v in values]))


def mean(values: Sequence[float]) -> Optional[float]:
    return float(statistics.fmean(values)) if values else None


def sd(values: Sequence[float]) -> Optional[float]:
    """Sample standard deviation (needs at least two values)."""
    return float(statistics.stdev(values)) if len(values) >= 2 else None


def robust_z(current: float, baseline_median: float, baseline_mad: Optional[float], floor: float) -> float:
    """(current − median) / (1.4826·MAD), with the scaled MAD floored per vital."""
    spread = max((baseline_mad or 0.0) * MAD_TO_SD, floor)
    return (current - baseline_median) / spread


def z_score(current: float, baseline_mean: Optional[float], baseline_sd: Optional[float], floor: float) -> Optional[float]:
    """Classic (current − mean) / SD, SD floored per vital. None without a mean."""
    if baseline_mean is None:
        return None
    return (current - baseline_mean) / max(baseline_sd or 0.0, floor)


def percent_dev(current: float, reference: float) -> Optional[float]:
    return (current - reference) / reference * 100.0 if reference else None
