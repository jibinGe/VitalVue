from sqlalchemy import ForeignKey, String, Integer, Boolean, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Location for Screen 1 filtering
    country: Mapped[str] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(100), index=True)
    city: Mapped[str] = mapped_column(String(100), index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)

    # Geo (org-hierarchy v2) — for GPS "nearby" hospital auto-select within a radius.
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # org-hierarchy v2 — soft-disable (hide from pickers without deleting / breaking FKs)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")

    # Relationships
    departments: Mapped[list["Department"]] = relationship(back_populates="organization")
    users: Mapped[list["User"]] = relationship(back_populates="organization")

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")

    organization: Mapped["Organization"] = relationship(back_populates="departments")
    wards: Mapped[list["Ward"]] = relationship(back_populates="department")
    stations: Mapped[list["Station"]] = relationship(back_populates="department")

class Station(Base):
    """org-hierarchy v2 — nursing station, sits between Department and Ward."""
    __tablename__ = "stations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    station_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")

    department: Mapped["Department"] = relationship(back_populates="stations")
    wards: Mapped[list["Ward"]] = relationship(back_populates="station")

class Ward(Base):
    __tablename__ = "wards"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g., "ICU", "General-A"
    ward_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    # org-hierarchy v2 — ward now lives under a station (nullable for back-compat/backfill)
    station_id: Mapped[int | None] = mapped_column(ForeignKey("stations.id"), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")

    department: Mapped["Department"] = relationship(back_populates="wards")
    station: Mapped["Station | None"] = relationship(back_populates="wards")
    rooms: Mapped[list["Room"]] = relationship(back_populates="ward")
    beds: Mapped[list["Bed"]] = relationship(back_populates="ward")

class Bed(Base):
    """org-hierarchy v2 — leaf physical asset (replaces Room as the patient location)."""
    __tablename__ = "beds"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bed_no: Mapped[str] = mapped_column(String(50), nullable=False)
    ward_id: Mapped[int] = mapped_column(ForeignKey("wards.id"), index=True)
    is_occupied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")

    ward: Mapped["Ward"] = relationship(back_populates="beds")

class Room(Base):
    """Physical room inside a Ward OR directly under a Department.
    Hierarchy A (dept-level): Department → Room  (consultation/procedure rooms, OTs).
    Hierarchy B (ward-level): Department → Ward → Room  (legacy, kept for backward-compat)."""
    __tablename__ = "rooms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    room_number: Mapped[str] = mapped_column(String(50), nullable=False)
    is_occupied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default="true")
    # dept-level room: department_id is set, ward_id is NULL
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    # ward-level room: ward_id is set (legacy / back-compat)
    ward_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wards.id"), nullable=True, index=True)

    ward: Mapped[Optional["Ward"]] = relationship(back_populates="rooms")
    department: Mapped[Optional["Department"]] = relationship("Department")
