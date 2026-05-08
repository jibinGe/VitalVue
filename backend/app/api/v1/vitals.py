from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
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
from app.services.alerts import send_vitalvue_whatsapp
from sqlalchemy.orm import joinedload

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/verify-otp")

@router.post("/ingest")
async def ingest_vitals(
    payload: VitalIngestSchema, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db), 
    redis = Depends(get_redis),
):
    # 1. Fetch Patient & Ward context
    result = await db.execute(
        select(Patient, Room.ward_id)
        .join(Room, Patient.room_id == Room.id)
        .where(Patient.id == payload.patient_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient or Room assignment not found")
    
    patient, ward_id = row

    # 2. Calculate Advanced Metrics
    calculated_data = calculate_risks(payload)
    
    # 3. Prepare & Save Vitals Record
    new_vitals = Vitals(**payload.dict(), **calculated_data)
    db.add(new_vitals)
    
    # 4. Prepare Unified Payload for Real-time
    full_data_payload = {
        "patient_id": payload.patient_id,
        "patient_name": patient.user_id,
        "ward_id": ward_id,
        "vitals": {**payload.dict(), **calculated_data},
        "timestamp": str(new_vitals.created_at)
    }
    vital_json = json.dumps(full_data_payload, default=str)

    # 5. Baseline Deviation & Alert Logic
    alerts = check_baseline_deviations(new_vitals)
    if alerts:
        # Get your Alert Model's valid columns to avoid the TypeError
        valid_alert_columns = Alert.__table__.columns.keys()

        for alert_data in alerts:
            # Create a copy for the database
            # We filter out any keys (like 'message' or 'ward_id') 
            # that aren't actual columns in your Alert table
            db_alert_data = {
                k: v for k, v in alert_data.items() 
                if k in valid_alert_columns
            }
            
            # Save to DB
            new_alert = Alert(**db_alert_data)
            db.add(new_alert)
            
            # Prepare the rich payload for Redis (which CAN include 'message' for the frontend)
            rich_alert_data = {**alert_data, "ward_id": ward_id, "patient_id": payload.patient_id}
            alert_json = json.dumps(rich_alert_data, default=str)
            
            # Publish to Redis
            await redis.publish(f"ward:{ward_id}:alerts", alert_json)
            await redis.publish(f"patient:{payload.patient_id}:alerts", alert_json)

    # 6. Broadcast Vital Update
    await redis.publish(f"ward:{ward_id}:stream", vital_json)
    await redis.publish(f"patient:{payload.patient_id}:stream", vital_json)

    await db.commit()
    return {"status": "success", "news2": calculated_data.get("news2_score")}

