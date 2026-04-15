import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, String, Enum, DateTime, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
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
    
    # Screen 2 Data
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(20))
    height: Mapped[Optional[float]] = mapped_column()
    weight: Mapped[Optional[float]] = mapped_column()
    blood_group: Mapped[str] = mapped_column(String(10))
    alt_phone: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Screen 3 / Identity
    device_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    
    # Hierarchical Links (Derived from Screen 1 & 2)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    nurse_id: Mapped[Optional[int]] = mapped_column(ForeignKey("nurses.id"), nullable=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"))

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
