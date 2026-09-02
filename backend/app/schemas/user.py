from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole

# --- Base User (Common to everyone) ---
class UserBase(BaseModel):
    # Matches your SQLAlchemy columns exactly
    user_id: str = Field(..., description="The unique public ID like VT-101 or PID-500")
    phone_number: str = Field(..., description="Phone number used for OTP login")
    full_name: str
    role: UserRole
    organization_id: Optional[int] = None
    is_active: bool = True
    
    # We include this so Pydantic can read from SQLAlchemy objects
    model_config = ConfigDict(from_attributes=True)
    
# --- Patient Specific ---
class PatientBase(UserBase):
    doctor_id: Optional[int] = Field(None, description="Selected Doctor ID from Screen 1")
    
    # Updated: Both are optional now, handled by validator
    room_id: Optional[int] = Field(None, description="Selected Room ID (Legacy)")
    bed_id: Optional[int] = Field(None, description="Selected Bed ID (v2)")
    
    age: int
    gender: str
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_group: str
    alt_phone: Optional[str] = None
    
    device_id: str = Field(..., description="Unique Device ID for real-time tracking")
    nurse_id: Optional[int] = Field(None, description="Selected Nurse ID")

    # NEW: Validation logic for exactly one of room_id or bed_id
    @model_validator(mode='after')
    def check_room_or_bed(self) -> 'PatientBase':
        if (self.room_id is None and self.bed_id is None) or \
           (self.room_id is not None and self.bed_id is not None):
            raise ValueError('Exactly one of room_id or bed_id must be provided')
        return self
class PatientCreate(PatientBase):
    role: UserRole = UserRole.PATIENT

class PatientUpdate(BaseModel):
    # All fields optional for PUT/PATCH updates
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    ward: Optional[str] = None
    room_id: Optional[int] = None
    doctor_id: Optional[int] = None
    device_id: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class PatientResponse(PatientBase):
    # Internal DB fields to return to the frontend
    id: int
    created_at: datetime

# --- Doctor Specific ---
class DoctorBase(UserBase):
    specialization: str
    license_no: str

class DoctorCreate(DoctorBase):
    role: UserRole = UserRole.DOCTOR

class DoctorUpdate(DoctorBase):
    user_id: Optional[str] = None
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    specialization: Optional[str] = None
    license_no: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: int
    created_at: datetime

# --- Patient Admit (org-hierarchy v2, RUN-024) — bed OR room + dept-doctor + comorbidities ---
class PatientAdmit(BaseModel):
    # Optional at registration → auto-generated PAT-<id> when omitted (AdmitScreen still passes one).
    user_id: Optional[str] = None
    # 6-digit login PIN set at registration (patient logs in with PAT-<id> + this PIN). Hashed server-side.
    pin: Optional[str] = None
    full_name: str
    phone_number: str
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_group: Optional[str] = None
    alt_phone: Optional[str] = None
    # Option A: exactly one of bed_id or room_id must be supplied.
    bed_id: Optional[int] = None
    room_id: Optional[int] = None
    doctor_id: Optional[int] = None
    nurse_id: Optional[int] = None
    comorbidities: List[str] = Field(default_factory=list)
    device_id: Optional[str] = None

    @model_validator(mode="after")
    def check_bed_or_room(self) -> "PatientAdmit":
        if self.bed_id is None and self.room_id is None:
            raise ValueError("Exactly one of bed_id or room_id must be provided")
        if self.bed_id is not None and self.room_id is not None:
            raise ValueError("Provide either bed_id or room_id, not both")
        return self
