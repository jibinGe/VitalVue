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
    db: AsyncSession = Depends(get_db), 
    redis = Depends(get_redis)
):
    # 1. Fetch Patient and Ward Context
    result = await db.execute(
        select(Patient, Room.ward_id)
        .join(Room, Patient.room_id == Room.id)
        .where(Patient.id == payload.patient_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient or Room not found")
    patient, ward_id = row

    # 2. Apply Temperature Offset (+2.2) and Calculate Risks
    vital_dict = payload.dict()
    vital_dict["temp"] = round(vital_dict["temp"] + 0, 1)
    
    # We use a simple object for the risk functions
    from argparse import Namespace
    vitals_obj = Namespace(**vital_dict)
    calculated_data = calculate_risks(vitals_obj)
    
    # 3. Save Vitals to DB
    new_vitals = Vitals(**vital_dict, **calculated_data)
    db.add(new_vitals)

    # 4. Handle Alert Deduplication (Send Only Once)
    detected_alerts = check_baseline_deviations(new_vitals)
    
    # Define lock keys for hardware states
    conn_lock = f"alert_lock:{payload.patient_id}:Connectivity"
    rem_lock = f"alert_lock:{payload.patient_id}:Band Status"

    if detected_alerts:
        for alert_data in detected_alerts:
            v_type = alert_data["vital_type"]
            lock_key = f"alert_lock:{payload.patient_id}:{v_type}"
            
            # Check if this specific alert is already "Locked" in Redis
            is_locked = await redis.get(lock_key)
            
            if not is_locked:
                # FIRST TIME: Save to DB and Publish
                new_alert = Alert(
                    patient_id=payload.patient_id,
                    ward_id=ward_id,
                    vital_type=v_type,
                    triggered_value=alert_data["triggered_value"],
                    severity=alert_data["severity"]
                )
                db.add(new_alert)
                
                # Set the lock in Redis (No expiry, stays until reconnected)
                await redis.set(lock_key, "active")
                
                # Publish to Frontend via SSE channel
                alert_payload = json.dumps({**alert_data, "ward_id": ward_id})
                await redis.publish(f"patient:{payload.patient_id}:alerts", alert_payload)

    # 5. RESET LOGIC: If device is back to normal, clear the hardware locks
    if payload.is_connected and not payload.is_removed:
        await redis.delete(conn_lock)
        await redis.delete(rem_lock)

    # 6. Always Broadcast Vital Stream Update (Real-time graph)
    stream_payload = json.dumps({
        "patient_id": payload.patient_id,
        "vitals": {**vital_dict, **calculated_data},
        "ward_id": ward_id
    }, default=str)
    await redis.publish(f"patient:{payload.patient_id}:stream", stream_payload)

    await db.commit()
    return {"status": "success"}

