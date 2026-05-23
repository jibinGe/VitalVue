from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ActionResponse(BaseModel):
    id: int
    alert_id: Optional[int] = None
    staff_id: int
    action_type: str
    other_details: Optional[str] = None
    performed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class AlertAuditResponse(BaseModel):
    id: int
    vital_type: str
    triggered_value: str
    status: str
    severity: str
    is_flagged: bool
    flagged_doctor_id: Optional[int] = None
    snoozed_until: Optional[datetime] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    created_at: datetime
    actions_taken: List[ActionResponse] = [] # Nested actions mapped to this specific alert

    class Config:
        from_attributes = True

class ClinicalNoteResponse(BaseModel):
    id: int
    author_id: int
    event_type: Optional[str] = None
    note_content: str
    is_flagged_for_review: bool
    event_timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class PatientClinicalTimelineResponse(BaseModel):
    patient_id: int
    total_alerts_count: int
    total_notes_count: int
    alerts: List[AlertAuditResponse]
    clinical_notes: List[ClinicalNoteResponse]

    class Config:
        from_attributes = True