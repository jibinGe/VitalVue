"""Baseline Engine v1 (shadow mode) — per-patient 10-minute observations and baseline versions.

Nothing in the alerting path reads these tables yet; they feed the baseline panel and,
later, the Pattern Library.
"""
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VitalObservation(Base):
    """One observation = the per-vital median of a 10-minute window of clean raw readings."""
    __tablename__ = "vital_observations"
    __table_args__ = (UniqueConstraint("patient_id", "window_start", name="uq_vital_observations_patient_window"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    window_start: Mapped[datetime] = mapped_column(DateTime, index=True)
    window_end: Mapped[datetime] = mapped_column(DateTime)

    sample_count: Mapped[int] = mapped_column(Integer)          # raw readings in the window
    good_ratio: Mapped[float] = mapped_column(Float)            # share of connected, non-removed readings

    hr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hrv: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sbp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dbp: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    map: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # (SBP + 2·DBP) / 3
    spo2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stress: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    movement: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    activity_state: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # resting / light / active
    signal_quality: Mapped[str] = mapped_column(String(20))                           # good / fair / poor
    is_stable: Mapped[bool] = mapped_column(Boolean, default=False)   # allowed into the baseline buffer
    reject_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    baseline_version: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # baseline it was scored against
    vpo: Mapped[dict] = mapped_column(JSONB, default=dict)   # Vital Parameter Objects computed for this window
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PatientBaseline(Base):
    """A baseline version. A new row is written whenever the baseline changes; the latest row
    for a patient is the current one. An episode (admission) starts in population mode."""
    __tablename__ = "patient_baselines"
    __table_args__ = (UniqueConstraint("patient_id", "version", name="uq_patient_baselines_patient_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    mode: Mapped[str] = mapped_column(String(20))            # population / personal / adaptive
    episode_start: Mapped[datetime] = mapped_column(DateTime)
    stats: Mapped[dict] = mapped_column(JSONB, default=dict)  # {vital: {median, mad, mean, sd, n, confidence}}
    n_stable: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
