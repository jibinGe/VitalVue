"""Baseline cycle: turn each closed 10-minute window of raw vitals into an observation, keep the
patient's baseline up to date and publish the Vital Parameter Objects.

Shadow mode: nothing here creates, resolves or routes alerts.
"""
import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.baseline import PatientBaseline, VitalObservation
from app.models.clinical import Alert
from app.models.user import Patient
from app.models.vitals import Vitals
from app.services.baseline.engine import build_baseline_stats, build_observation, compute_vpo, is_stable
from app.services.baseline.population import (
    ADAPTIVE_AFTER_HOURS, LEARNING_OBSERVATIONS, NEW_EPISODE_GAP_HOURS, ROLLING_BUFFER, VITALS, WINDOW_MINUTES,
)

log = logging.getLogger(__name__)

WINDOW = timedelta(minutes=WINDOW_MINUTES)
MAX_CATCH_UP_WINDOWS = 6            # after downtime, back-fill at most the last hour
TREND_HISTORY = 4                   # previous observations fed to trend detection
DEVICE_ALERT_TYPES = ("Connectivity", "Band Status")
RAW_COLUMNS = (Vitals.heart_rate, Vitals.spo2, Vitals.bp_systolic, Vitals.bp_diastolic, Vitals.hrv_score,
               Vitals.stress_level, Vitals.movement, Vitals.is_connected, Vitals.is_removed)


def latest_closed_window(now: datetime) -> datetime:
    """Start of the most recent fully elapsed 10-minute window."""
    floored = now.replace(second=0, microsecond=0) - timedelta(minutes=now.minute % WINDOW_MINUTES)
    return floored - WINDOW


def _obs_dict(o: VitalObservation) -> dict:
    d = {v: getattr(o, v) for v in VITALS}
    d.update(good_ratio=o.good_ratio, vpo=o.vpo or {}, window_start=o.window_start)
    return d


async def _monitored_patient_ids(db) -> list[int]:
    """Placed, monitored, active patients (same scope as the heartbeat sweep)."""
    stmt = (
        select(Patient.id)
        .where(or_(Patient.bed_id.isnot(None), Patient.room_id.isnot(None)))
        .where(Patient.is_monitoring_paused == False)  # noqa: E712
        .where(Patient.is_discharged == False)  # noqa: E712
        .where(Patient.archive_status == "active")
    )
    return list((await db.execute(stmt)).scalars().all())


async def _current_baseline(db, patient_id: int):
    stmt = (select(PatientBaseline).where(PatientBaseline.patient_id == patient_id)
            .order_by(PatientBaseline.version.desc()).limit(1))
    return (await db.execute(stmt)).scalar_one_or_none()


async def _stable_obs(db, patient_id: int, since: datetime, before: datetime, newest: int | None = None):
    stmt = (select(VitalObservation)
            .where(VitalObservation.patient_id == patient_id, VitalObservation.is_stable == True,  # noqa: E712
                   VitalObservation.window_start >= since, VitalObservation.window_start < before))
    if newest:
        rows = (await db.execute(stmt.order_by(VitalObservation.window_start.desc()).limit(newest))).scalars().all()
        return [_obs_dict(o) for o in reversed(rows)]
    rows = (await db.execute(stmt.order_by(VitalObservation.window_start))).scalars().all()
    return [_obs_dict(o) for o in rows]


async def process_window(db, patient_id: int, window_start: datetime):
    """Aggregate, score and store one window. Returns the stored payload, or None when the
    window had no readings or was already processed."""
    window_end = window_start + WINDOW
    rows = (await db.execute(
        select(*RAW_COLUMNS).where(Vitals.patient_id == patient_id,
                                   Vitals.created_at >= window_start, Vitals.created_at < window_end)
    )).mappings().all()
    obs = build_observation([dict(r) for r in rows])
    if obs is None:
        return None

    # Episode: a first observation, or a gap longer than NEW_EPISODE_GAP_HOURS (e.g. discharge +
    # readmit), starts over in population mode with a fresh learning phase.
    baseline = await _current_baseline(db, patient_id)
    previous_start = (await db.execute(
        select(func.max(VitalObservation.window_start))
        .where(VitalObservation.patient_id == patient_id, VitalObservation.window_start < window_start)
    )).scalar()
    if baseline is None or previous_start is None or \
            window_start - previous_start > timedelta(hours=NEW_EPISODE_GAP_HOURS):
        baseline = PatientBaseline(
            patient_id=patient_id, version=(baseline.version + 1) if baseline else 1, mode="population",
            episode_start=window_start, stats={}, n_stable=0, confidence=0.0,
        )
        db.add(baseline)
        await db.flush()

    history_rows = (await db.execute(
        select(VitalObservation)
        .where(VitalObservation.patient_id == patient_id,
               VitalObservation.window_start >= baseline.episode_start,
               VitalObservation.window_start < window_start)
        .order_by(VitalObservation.window_start.desc()).limit(TREND_HISTORY)
    )).scalars().all()
    history = [_obs_dict(o) for o in reversed(history_rows)]

    n_stable = (await db.execute(
        select(func.count(VitalObservation.id))
        .where(VitalObservation.patient_id == patient_id, VitalObservation.is_stable == True,  # noqa: E712
               VitalObservation.window_start >= baseline.episode_start)
    )).scalar() or 0
    learning_confidence = min(1.0, n_stable / LEARNING_OBSERVATIONS)

    vpo = compute_vpo(obs, baseline.mode, baseline.stats or {}, history, learning_confidence)

    alert_in_window = (await db.execute(
        select(func.count(Alert.id))
        .where(Alert.patient_id == patient_id, Alert.vital_type.not_in(DEVICE_ALERT_TYPES),
               Alert.created_at >= window_start - WINDOW, Alert.created_at < window_end)
    )).scalar() > 0
    stable, reason = is_stable(obs, vpo, baseline.mode, alert_in_window)

    inserted = (await db.execute(
        pg_insert(VitalObservation).values(
            patient_id=patient_id, window_start=window_start, window_end=window_end,
            sample_count=obs["sample_count"], good_ratio=obs["good_ratio"],
            **{v: obs[v] for v in VITALS}, movement=obs["movement"],
            activity_state=obs["activity_state"], signal_quality=obs["signal_quality"],
            is_stable=stable, reject_reason=reason, baseline_version=baseline.version, vpo=vpo,
            created_at=datetime.utcnow(),
        ).on_conflict_do_nothing(constraint="uq_vital_observations_patient_window").returning(VitalObservation.id)
    )).scalar_one_or_none()
    if inserted is None:
        return None  # another worker already processed this window

    if stable:
        n_stable += 1
        episode_hours = (window_end - baseline.episode_start).total_seconds() / 3600
        new_mode, buffer = None, None
        if baseline.mode == "population" and n_stable >= LEARNING_OBSERVATIONS:
            new_mode = "personal"  # Mode 2: first personal baseline from the learning phase
            buffer = await _stable_obs(db, patient_id, baseline.episode_start, window_end)
        elif baseline.mode in ("personal", "adaptive") and episode_hours >= ADAPTIVE_AFTER_HOURS:
            new_mode = "adaptive"  # Mode 3: rolling buffer of the latest stable observations
            buffer = await _stable_obs(db, patient_id, baseline.episode_start, window_end, newest=ROLLING_BUFFER)

        if new_mode:
            stats, confidence = build_baseline_stats(buffer)
            baseline = PatientBaseline(
                patient_id=patient_id, version=baseline.version + 1, mode=new_mode,
                episode_start=baseline.episode_start, stats=stats, n_stable=n_stable, confidence=confidence,
            )
            db.add(baseline)
        else:
            baseline.n_stable = n_stable
            if baseline.mode == "population":
                baseline.confidence = round(min(1.0, n_stable / LEARNING_OBSERVATIONS), 2)

    return {
        "patient_id": patient_id,
        "window_start": window_start.isoformat(),
        "mode": baseline.mode,
        "version": baseline.version,
        "learning": {"stable": n_stable, "required": LEARNING_OBSERVATIONS},
        "is_stable": stable,
        "reject_reason": reason,
        "vpo": vpo,
    }


async def run_baseline_cycle(db, redis, now: datetime | None = None) -> int:
    """Process every closed, unprocessed window (up to the last hour) for each monitored patient.
    Commits per patient so one failure can't roll back the others. Returns patients updated."""
    latest = latest_closed_window(now or datetime.utcnow())
    stored = 0
    for patient_id in await _monitored_patient_ids(db):
        try:
            last = (await db.execute(
                select(func.max(VitalObservation.window_start)).where(VitalObservation.patient_id == patient_id)
            )).scalar()
            first = max(last + WINDOW, latest - WINDOW * (MAX_CATCH_UP_WINDOWS - 1)) if last else latest
            windows, ws = [], first
            while ws <= latest:
                windows.append(ws)
                ws += WINDOW

            payload = None
            for ws in windows:
                payload = await process_window(db, patient_id, ws) or payload
            await db.commit()
        except Exception:
            await db.rollback()
            log.exception("baseline cycle failed for patient %s", patient_id)
            continue

        if payload:
            stored += 1
            # Separate cache key + channel: never the dashboard's patient:{id}:stream.
            message = json.dumps(payload)
            await redis.set(f"patient:{patient_id}:vpo", message)
            await redis.publish(f"patient:{patient_id}:baseline", message)
    return stored
