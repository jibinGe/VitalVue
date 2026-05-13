from pydantic import BaseModel
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

    news2_score: int = 0
    af_warning: str = "Normal"
    # stroke_risk: str = "Low"
    # seizure_risk: str = "Low"
    is_connected: bool = False
    is_removed: bool = False

    class Config:
        from_attributes = True