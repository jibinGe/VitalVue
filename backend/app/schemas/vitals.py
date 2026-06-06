from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VitalIngestSchema(BaseModel):
    patient_id: int
    device_id: str
    
    # Primary Vitals
    heart_rate: int
    spo2: float
    temp: float
    bp_systolic: int
    bp_diastolic: int
    
    # Advanced Metrics
    hrv_score: int
    stress_level: str
    movement: int
    sleep_pattern: str
    
    # Status
    battery_percent: int
    is_connected: bool
    is_removed: bool
    
    # UI Statuses (Dynamically populated, optional for initial validation)
    heart_rate_status: Optional[str] = "Stable"
    spo2_status: Optional[str] = "Stable"
    bp_status: Optional[str] = "Stable"
    temperature_status: Optional[str] = "Stable"

    class Config:
        from_attributes = True # Allows compatibility with SQLAlchemy models

class CalibrationRequest(BaseModel):
    actual_temp: Optional[float] = None
    sensor_temp: Optional[float] = None
    actual_systolic: Optional[int] = None
    sensor_systolic: Optional[int] = None
    actual_diastolic: Optional[int] = None
    sensor_diastolic: Optional[int] = None

        