"""Heart rate variability from raw RR intervals (BPW8 HRV_RRI).

RMSSD (root mean square of successive differences, in ms) is the standard short-term HRV
measure. Wrist RR series contain artifacts (missed or extra beats), so intervals outside a
physiological range, or differing from the previous accepted one by more than 20 %, are
dropped before computing it (a common, simple artifact filter).
"""
import math
from typing import Optional, Sequence

MIN_RR_MS, MAX_RR_MS = 300, 2000          # 200 bpm … 30 bpm
MAX_JUMP = 0.20
MIN_INTERVALS = 10


def clean_rr(rr_ms: Sequence[float]) -> list[float]:
    out: list[float] = []
    for rr in rr_ms:
        if not MIN_RR_MS <= rr <= MAX_RR_MS:
            continue
        if out and abs(rr - out[-1]) > MAX_JUMP * out[-1]:
            continue
        out.append(float(rr))
    return out


def rmssd(rr_ms: Sequence[float]) -> Optional[int]:
    """RMSSD in ms, or None when too few clean intervals remain."""
    rr = clean_rr(rr_ms)
    if len(rr) < MIN_INTERVALS:
        return None
    diffs = [b - a for a, b in zip(rr, rr[1:])]
    return round(math.sqrt(sum(d * d for d in diffs) / len(diffs)))
