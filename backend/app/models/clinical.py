from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from datetime import datetime
from app.database import Base

class Alert(Base):
    """Triggers the Red Flashing UI on the Dashboard"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    vital_type = Column(String)  # 'SPO2', 'Heart Rate', 'NEWS2'
    triggered_value = Column(String) 
    status = Column(String, default="active") # active, acknowledged, resolved
    severity = Column(String)    # critical, warning
    
    # Flagging Logic (Image 2 in your screenshots)
    is_flagged = Column(Boolean, default=False)
    flagged_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class Action(Base):
    """Logs the 'Action Capture' modal data (Image 3)"""
    __tablename__ = "actions"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    staff_id = Column(Integer, ForeignKey("users.id")) # Person taking action
    
    action_type = Column(String) # 'Medication Given', 'Oxygen Started', etc.
    other_details = Column(Text, nullable=True) 
    
    performed_at = Column(DateTime) # Back-dated time from UI
    created_at = Column(DateTime, default=datetime.utcnow)

class ClinicalNote(Base):
    """Logs 'Clinical Note' & 'Log Event' modals (Image 4 & 5)"""
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), index=True)
    author_id = Column(Integer, ForeignKey("users.id"))
    
    event_type = Column(String, nullable=True) # 'Symptom', 'Observation', etc.
    note_content = Column(Text)
    is_flagged_for_review = Column(Boolean, default=False)
    
    event_timestamp = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)