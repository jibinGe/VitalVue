from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from datetime import datetime
from app.database import Base

class Vitals(Base):
    """
    The core high-frequency table for Vitalvue. 
    Optimized for sub-millisecond dashboard updates.
    """
    __tablename__ = "vitals"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    device_id = Column(String, index=True) # The ID of the Band
    
    # --- Dashboard Row 1: Primary Vitals ---
    heart_rate = Column(Integer, index=True)    # 139 bpm
    spo2 = Column(Float, index=True)           # 85%
    temp = Column(Float)                       # 38.4 °C
    bp_systolic = Column(Integer)              # 171
    bp_diastolic = Column(Integer)             # 126
    
    # --- Dashboard Row 2: Risk Scoring & Warnings ---
    news2_score = Column(Integer, index=True)  # Score 10 (High Risk)
    af_warning = Column(String)                # 'Normal', 'Detected'
    stroke_risk = Column(String)               # 'High', 'Medium', 'Low'
    seizure_risk = Column(String)              # 'High', 'Medium', 'Low'
    
    # --- Dashboard Row 3: Advanced Metrics & Activity ---
    hrv_score = Column(Integer)                # 48 ms
    stress_level = Column(String)              # 'Moderate'
    movement = Column(Integer)                 # Activity index (1-10)
    sleep_pattern = Column(String)             # '6h 30m' (stored as formatted string or minutes)
    
    # --- Device & Connection Status ---
    battery_percent = Column(Integer)          # 80%
    is_connected = Column(Boolean, default=True)
    is_removed = Column(Boolean, default=False)
    
    # --- Chronological Data ---
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

