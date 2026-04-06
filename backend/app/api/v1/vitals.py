from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db, get_redis
from app.models.vitals import Vitals
from app.models.clinical import Alert
from app.models.organization import Room, Ward  # Added to find ward context
from app.models.user import Patient
from app.schemas.vitals import VitalIngestSchema
from app.services.analytics import calculate_risks, check_baseline_deviations
import json
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/verify-otp")

@router.post("/ingest")
async def ingest_vitals(
    payload: VitalIngestSchema, 
    db: AsyncSession = Depends(get_db), 
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Patient & Ward context (Needed for Broad-cast routing)
    # We find which ward this patient is currently in via their Room assignment
    result = await db.execute(
        select(Patient, Room.ward_id)
        .join(Room, Patient.room_id == Room.id)
        .where(Patient.id == payload.patient_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient or Room assignment not found")
    
    patient, ward_id = row

    # 2. Calculate Advanced Metrics (NEWS2, Stroke Risk, etc.)
    calculated_data = calculate_risks(payload)
    
    # 3. Prepare & Save Database Record
    new_vitals = Vitals(
        **payload.dict(),
        **calculated_data
    )
    db.add(new_vitals)
    
    # 4. Prepare Unified Payload for Real-time
    full_data_payload = {
        "patient_id": payload.patient_id,
        "patient_name": patient.user_id, # Or patient.full_name if available
        "ward_id": ward_id,
        "vitals": {**payload.dict(), **calculated_data},
        "timestamp": str(new_vitals.created_at)
    }
    vital_json = json.dumps(full_data_payload, default=str)

    # 5. Baseline Deviation & Alert Logic
    alerts = check_baseline_deviations(new_vitals)
    if alerts:
        for alert_data in alerts:
            # Create a copy for the database that doesn't include ward_id
            db_alert_data = alert_data.copy()
            
            # Add ward context only for the Real-time JSON (Redis)
            alert_data.update({"ward_id": ward_id, "patient_id": payload.patient_id})
            
            # Remove 'ward_id' if it exists in the dict before passing to Alert model
            # This prevents the TypeError you just saw
            db_alert_data.pop("ward_id", None) 
            
            new_alert = Alert(**db_alert_data)
            db.add(new_alert)
            
            # Publish the full info (including ward_id) to Redis
            alert_json = json.dumps(alert_data, default=str)
            await redis.publish(f"ward:{ward_id}:alerts", alert_json)
            await redis.publish(f"patient:{payload.patient_id}:alerts", alert_json)

    # 6. Broadcast Vital Update
    # Route A: To the Ward Dashboard (Multi-patient view)
    await redis.publish(f"ward:{ward_id}:stream", vital_json)
    
    # Route B: To the specific Patient View (Single-patient detail)
    await redis.publish(f"patient:{payload.patient_id}:stream", vital_json)

    await db.commit()
    return {"status": "success", "news2": calculated_data.get("news2_score")}

