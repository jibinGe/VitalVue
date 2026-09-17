from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.schemas.vitals import VitalIngestSchema as VitalsSchema

class PatientVitalsSummary(BaseModel):
    heart_rate: int
    spo2: float
    temp: float
    bp_systolic: int
    bp_diastolic: int
    created_at: datetime

class PatientDetailResponse(BaseModel):
    id: int
    user_id: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    room_no: str
    assigned_doctor: Optional[str]
    assigned_nurse: Optional[str]
    # Changed to List to hold the 20 latest entries
    vitals_history: List[VitalsSchema] 

    alt_phone: Optional[str]
    phone_number: Optional[str]

    news2_score: int = 0
    af_warning: str = "Normal"
    # stroke_risk: str = "Low"
    # seizure_risk: str = "Low"
    is_connected: bool = False
    is_removed: bool = False

    class Config:
        from_attributes = True

class MonitoringToggleSchema(BaseModel):
    pause: bool = Field(..., description="Set to true to pause alerts, false to resume active evaluation")

class PatientDischargeResponseSchema(BaseModel):
    status: str
    message: str
    patient_id: int
    archive_status: str
    is_discharged: bool

class PatientActionCreate(BaseModel):
    action_type: str = Field(..., description="Action taken, e.g. 'Network Reset', 'Medication Given'")
    alert_id: Optional[int] = Field(None, description="Optional associated alert ID")
    other_details: Optional[str] = Field(None, description="Additional notes or details")
    performed_at: Optional[datetime] = Field(None, description="Timestamp when the action was performed")

class PatientReadmitSchema(BaseModel):
    archived_patient_id: int = Field(..., description="The ID of the past archived patient record")
    department_id: Optional[int] = Field(None, description="Assigned Department ID")
    ward_id: Optional[int] = Field(None, description="Assigned Ward ID")
    room_id: Optional[int] = Field(None, description="Assigned Room ID")
    bed_id: Optional[int] = Field(None, description="Assigned Bed ID")
    assigned_doctor: Optional[int] = Field(None, description="Primary attending Doctor ID")
    device_id: Optional[str] = Field(None, description="New hardware band device address")


class PatientArchiveItemSchema(BaseModel):
    id: int
    user_id: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    room_no: str
    device_id: Optional[str] = None
    is_monitoring_paused: bool
    is_discharged: bool
    discharged_at: Optional[datetime] = None
    archive_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedPatientArchiveResponse(BaseModel):
    total_count: int
    page: int
    limit: int
    total_pages: int
    patients: List[PatientArchiveItemSchema]

