from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean, Index
from datetime import datetime
from app.database import Base
from sqlalchemy import func

class Vitals(Base):
    """
    The core high-frequency table for Vitalvue. 
    Optimized for sub-millisecond dashboard updates.
    A new column here must also be added to VitalsArchive (and its migration), otherwise
    archiving stops with an error instead of moving the readings.
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
    phone_battery = Column(Integer, nullable=True)
    is_connected = Column(Boolean, default=True)
    is_removed = Column(Boolean, default=False)
    # Where the reading came from: "ble" (band via mobile app) or "mqtt" (Veepoo 4G watch)
    source = Column(String(10), server_default="ble", nullable=True)
    
    # --- Chronological Data ---
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class VitalsArchive(Base):
    """Raw readings of discharged patients, moved out of `vitals` by app.services.archive and
    moved back on readmit. Same columns as Vitals plus archived_at; ids are kept as they were.
    Only one index: archived rows are read per patient, and only on restore or for reports."""
    __tablename__ = "vitals_archive"
    __table_args__ = (Index("ix_vitals_archive_patient_id_created_at", "patient_id", "created_at"),)

    id = Column(Integer, primary_key=True, autoincrement=False)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    device_id = Column(String)
    heart_rate = Column(Integer)
    spo2 = Column(Float)
    temp = Column(Float)
    bp_systolic = Column(Integer)
    bp_diastolic = Column(Integer)
    news2_score = Column(Integer)
    af_warning = Column(String)
    stroke_risk = Column(String)
    seizure_risk = Column(String)
    hrv_score = Column(Integer)
    stress_level = Column(String)
    movement = Column(Integer)
    sleep_pattern = Column(String)
    battery_percent = Column(Integer)
    phone_battery = Column(Integer, nullable=True)
    is_connected = Column(Boolean)
    is_removed = Column(Boolean)
    source = Column(String(10), nullable=True)
    created_at = Column(DateTime)
    archived_at = Column(DateTime, server_default=func.now(), nullable=False)

class PatientCalibration(Base):
    __tablename__ = "patient_calibrations"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), unique=True)
    
    # Temperature Calibration
    actual_temp = Column(Float)   # e.g. 98.6 (Measured by Nurse)
    sensor_temp = Column(Float)   # e.g. 96.4 (Read from Band)
    temp_offset = Column(Float)   # Calculated: 2.2
    
    # BP Calibration
    actual_systolic = Column(Integer)
    sensor_systolic = Column(Integer)
    systolic_offset = Column(Integer)
    
    actual_diastolic = Column(Integer)
    sensor_diastolic = Column(Integer)
    diastolic_offset = Column(Integer)

    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

