"""Extra data from a patient's 4G watch: metrics that don't feed NEWS2, sleep and location.
Same access rule as the rest of the watch API (doctor / nurse with access, or admin)."""
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.devices import _patient_or_404, _require_patient_access
from app.database import get_db
from app.models.user import User
from app.models.watch_data import DeviceLocation, PatientMetric, SleepSession

router = APIRouter()

# Shown on the patient page, in this order; others (e.g. raw RR intervals) stay in the API.
DISPLAY_KINDS = ("resp_rate", "glucose", "steps", "lipids", "uric_acid", "kcal")
SERIES_KINDS = ("resp_rate", "glucose", "steps")
MAX_SERIES_POINTS = 300


def _iso(dt):
    return dt.isoformat() if dt else None


@router.get("/patients/{patient_id}/watch-data")
async def patient_watch_data(patient_id: int, hours: int = Query(24, ge=1, le=24 * 14), nights: int = Query(7, ge=1, le=31),
                             db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    await _require_patient_access(db, user, await _patient_or_404(db, patient_id))
    since = datetime.utcnow() - timedelta(hours=hours)

    rows = (await db.execute(
        select(PatientMetric).where(PatientMetric.patient_id == patient_id, PatientMetric.measured_at >= since,
                                    PatientMetric.kind.in_(DISPLAY_KINDS))
        .order_by(PatientMetric.measured_at)
    )).scalars().all()
    latest, series = {}, defaultdict(list)
    for m in rows:
        latest[m.kind] = {"value": m.value, "text": m.value_text, "unit": m.unit, "measured_at": _iso(m.measured_at),
                          "source": m.source}
        if m.kind in SERIES_KINDS and m.value is not None:
            series[m.kind].append({"t": _iso(m.measured_at), "v": m.value})
    for kind, points in series.items():                     # keep charts light
        if len(points) > MAX_SERIES_POINTS:
            step = -(-len(points) // MAX_SERIES_POINTS)
            series[kind] = points[::step] + ([points[-1]] if (len(points) - 1) % step else [])

    sleep = (await db.execute(
        select(SleepSession).where(SleepSession.patient_id == patient_id)
        .order_by(SleepSession.night.desc()).limit(nights)
    )).scalars().all()
    loc = (await db.execute(
        select(DeviceLocation).where(DeviceLocation.patient_id == patient_id, DeviceLocation.lat.isnot(None))
        .order_by(DeviceLocation.recorded_at.desc()).limit(1)
    )).scalar_one_or_none()

    return {
        "patient_id": patient_id, "hours": hours,
        "latest": {k: latest[k] for k in DISPLAY_KINDS if k in latest},
        "series": dict(series),
        "sleep": [{"night": s.night.isoformat(), "start_at": _iso(s.start_at), "end_at": _iso(s.end_at),
                   "total_min": s.total_min, "deep_min": s.deep_min, "light_min": s.light_min, "rem_min": s.rem_min,
                   "awake_min": s.awake_min, "segments": s.segments or [], "source": s.source} for s in sleep],
        "location": {"lat": loc.lat, "lon": loc.lon, "recorded_at": _iso(loc.recorded_at), "source": loc.source,
                     "reason": loc.reason} if loc else None,
    }
