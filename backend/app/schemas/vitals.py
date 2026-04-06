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

    class Config:
        from_attributes = True # Allows compatibility with SQLAlchemy models