from pydantic import BaseModel, ConfigDict, Field
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
    # Screen 1 & 2 Hierarchy Links
    doctor_id: int = Field(..., description="Selected Doctor ID from Screen 1")
    room_id: int = Field(..., description="Selected Room ID from Screen 2")
    
    # Screen 2: Vital Stats & Info
    age: int
    gender: str
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_group: str
    alt_phone: Optional[str] = None
    
    # Screen 3: Device Identity
    device_id: str = Field(..., description="Unique Device ID for real-time tracking")

class PatientCreate(PatientBase):
    # Set default role for registration
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
