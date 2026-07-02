import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, String, Enum, DateTime, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    NURSE = "nurse"
    DOCTOR = "doctor"
    ORG_ADMIN = "org_admin"
    MASTER_ADMIN = "master_admin"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # The unique identifier the user enters (e.g., VT-101, PID-500)
    user_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    organization_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id"), nullable=True)
    # Phone number linked to this ID for sending the OTP
    phone_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Patient 6-digit PIN login (bcrypt). Nullable — staff use OTP, only patients set a PIN.
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="users")

    # Polymorphic logic for the 5 sub-tables
    user_type: Mapped[str] = mapped_column(String(50))
    __mapper_args__ = {
        "polymorphic_identity": "user",
        "polymorphic_on": "user_type",
    }

# --- Specific User Type Tables ---

class Patient(User):
    __tablename__ = "patients"
    
    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    
    # --- Dashboard Data ---
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(20))
    height: Mapped[Optional[float]] = mapped_column()
    weight: Mapped[Optional[float]] = mapped_column()
    blood_group: Mapped[str] = mapped_column(String(10))
    alt_phone: Mapped[Optional[str]] = mapped_column(String(20))
    
    # --- Hardware Identity Association ---
    # Made Optional[str] and nullable=True so device_id can be wiped on formal discharge
    device_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    
    # --- Hierarchical Care Team Links ---
    doctor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    nurse_id: Mapped[Optional[int]] = mapped_column(ForeignKey("nurses.id"), nullable=True)
    
    # --- Facility Assets Allocation ---
    # Changed to Optional[int]/nullable=True so bed links can be severed immediately upon discharge
    room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)  # DEPRECATED (v2): use bed_id
    # org-hierarchy v2 — the patient now occupies a Bed (room_id kept for back-compat/rollback)
    bed_id: Mapped[Optional[int]] = mapped_column(ForeignKey("beds.id"), nullable=True)
    # Patient comorbidities (the 16-item canon) — stored as a JSON string array
    comorbidities: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")

    # --- NEW COMPLIANCE & LIFECYCLE FIELDS ---
    # Transient State: True if patient is active but temporarily unstrapped (e.g., shower/X-ray)
    is_monitoring_paused: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Administrative Milestones: Tracks explicit legal checkout sequences
    is_discharged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    discharged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Archival Status Compliance: Tracks auditing state workflows: 'active', 'archived', 'purged'
    archive_status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    # ------------------------------------------

    # --- SQLAlchemy Core Graph Relationships ---
    room: Mapped[Optional["Room"]] = relationship("Room")
    bed: Mapped[Optional["Bed"]] = relationship("Bed")
    assigned_nurse: Mapped[Optional["Nurse"]] = relationship("Nurse", foreign_keys=[nurse_id])
    assigned_doctor: Mapped[Optional["Doctor"]] = relationship("Doctor", foreign_keys=[doctor_id])

    __mapper_args__ = {"polymorphic_identity": "patient"}
       
class Nurse(User):
    __tablename__ = "nurses"
    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    license_no: Mapped[str] = mapped_column(String(50), unique=True)
    __mapper_args__ = {"polymorphic_identity": "nurse"}

class Doctor(User):
    __tablename__ = "doctors"
    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    specialization: Mapped[str] = mapped_column(String(100))
    is_on_call: Mapped[bool] = mapped_column(Boolean, nullable=True)
    # org-hierarchy v2 — doctors now belong to a department (doctors-by-department discovery)
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    __mapper_args__ = {"polymorphic_identity": "doctor"}

class OrgAdmin(User):
    __tablename__ = "org_admins"
    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    organization_name: Mapped[str] = mapped_column(String(255))
    __mapper_args__ = {"polymorphic_identity": "org_admin"}

class MasterAdmin(User):
    __tablename__ = "master_admins"
    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    super_level: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"polymorphic_identity": "master_admin"}
