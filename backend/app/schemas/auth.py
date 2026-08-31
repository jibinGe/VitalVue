from pydantic import BaseModel, Field
from typing import Optional, List, Union, Literal
from typing_extensions import Annotated
import enum

class OTPRequest(BaseModel):
    user_id: str

class OTPVerify(BaseModel):
    user_id: str
    otp: str

class QRGenerateResponse(BaseModel):
    qr_token: str = Field(..., description="Unique code to render as QR")
    expires_in: int = Field(120, description="Expiration buffer in seconds")

class QRAuthorizeRequest(BaseModel):
    qr_token: str = Field(..., description="The decrypted token read from the scanned QR code")

class UserRole(str, enum.Enum):
    PATIENT = "patient"
    NURSE = "nurse"
    DOCTOR = "doctor"
    ORG_ADMIN = "org_admin"
    MASTER_ADMIN = "master_admin"
    HOSPITAL_MANAGEMENT = "hospital_management"

# --- Base Schema ---
class UserBaseCreate(BaseModel):
    user_id: str
    phone_number: str
    full_name: str
    organization_id: Optional[int] = None
    hashed_password: Optional[str] = None
    is_active: bool = True

# --- Specific Role Schemas ---
class PatientCreate(UserBaseCreate):
    # Fix: Use Literal instead of const=True
    role: Literal[UserRole.PATIENT] = UserRole.PATIENT
    age: int
    gender: str
    height: Optional[float] = None
    weight: Optional[float] = None
    blood_group: str
    alt_phone: Optional[str] = None
    device_id: Optional[str] = None
    doctor_id: Optional[int] = None
    nurse_id: Optional[int] = None
    bed_id: Optional[int] = None
    comorbidities: List[str] = []

class NurseCreate(UserBaseCreate):
    role: Literal[UserRole.NURSE] = UserRole.NURSE
    license_no: str

class DoctorCreate(UserBaseCreate):
    role: Literal[UserRole.DOCTOR] = UserRole.DOCTOR
    specialization: str
    is_on_call: Optional[bool] = None
    department_id: Optional[int] = None

class OrgAdminCreate(UserBaseCreate):
    role: Literal[UserRole.ORG_ADMIN] = UserRole.ORG_ADMIN
    organization_name: str

class MasterAdminCreate(UserBaseCreate):
    role: Literal[UserRole.MASTER_ADMIN] = UserRole.MASTER_ADMIN
    super_level: int = 1
    
class HospitalManagementCreate(UserBaseCreate):
    role: Literal[UserRole.HOSPITAL_MANAGEMENT] = UserRole.HOSPITAL_MANAGEMENT

# --- Discriminated Union ---
UserCreate = Annotated[
    Union[
        PatientCreate, 
        NurseCreate, 
        DoctorCreate, 
        OrgAdminCreate, 
        MasterAdminCreate, 
        HospitalManagementCreate
    ],
    Field(discriminator="role")
]