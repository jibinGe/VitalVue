"""Extra data from 4G watches that doesn't belong in `vitals`: metrics that don't feed NEWS2,
sleep, and locations."""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PatientMetric(Base):
    """kind: resp_rate | glucose | lipids | uric_acid | steps | kcal | ambient_temp |
    surface_temp | rri (raw RR intervals in value_text)."""
    __tablename__ = "patient_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    device_id: Mapped[Optional[int]] = mapped_column(ForeignKey("devices.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(20))
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    value_text: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    measured_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SleepSession(Base):
    """One night per watch; re-reports of the same night replace it."""
    __tablename__ = "sleep_sessions"
    __table_args__ = (UniqueConstraint("device_id", "night", name="uq_sleep_sessions_device_night"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    night: Mapped[date] = mapped_column(Date)
    start_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deep_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    light_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rem_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    awake_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    segments: Mapped[list] = mapped_column(JSONB, default=list)
    source: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class DeviceLocation(Base):
    """Where a watch was (GPS, or the Wi-Fi / cell data to resolve it later). Kept 30 days."""
    __tablename__ = "device_locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"))
    patient_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lon: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    raw: Mapped[dict] = mapped_column(JSONB, default=dict)
