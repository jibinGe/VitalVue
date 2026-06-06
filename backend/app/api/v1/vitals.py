from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.database import get_db, get_redis
from app.models.vitals import Vitals, PatientCalibration
from app.models.clinical import Alert
from app.models.organization import Room, Ward  # Added to find ward context
from app.models.user import Patient
from app.schemas.vitals import VitalIngestSchema, CalibrationRequest
from app.services.analytics import calculate_risks, check_baseline_deviations, get_vital_statuses
import json
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User
from app.api.deps import get_current_user
from app.services.alerts import send_vitalvue_whatsapp
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from argparse import Namespace

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/verify-otp")

# @router.post("/ingest")
# async def ingest_vitals(
#     payload: VitalIngestSchema, 
#     db: AsyncSession = Depends(get_db), 
#     redis = Depends(get_redis)
# ):
#     # 1. Fetch Patient, Ward Context, and Calibration Data
#     # We join Room for ward_id and use an outer join for Calibration
#     result = await db.execute(
#         select(Patient, Room.ward_id, PatientCalibration)
#         .join(Room, Patient.room_id == Room.id)
#         .outerjoin(PatientCalibration, Patient.id == PatientCalibration.patient_id)
#         .where(Patient.id == payload.patient_id)
#     )
#     row = result.first()
    
#     if not row:
#         raise HTTPException(status_code=404, detail="Patient or Room not found")
    
#     patient, ward_id, cal = row

#     # 2. Apply Dynamic Calibration Offsets
#     vital_dict = payload.dict()
    
#     if cal:
#         # If calibration exists, apply the saved offsets
#         vital_dict["temp"] = round(vital_dict["temp"] + (cal.temp_offset or 0.0), 1)
#         vital_dict["bp_systolic"] = vital_dict["bp_systolic"] + (cal.systolic_offset or 0)
#         vital_dict["bp_diastolic"] = vital_dict["bp_diastolic"] + (cal.diastolic_offset or 0)
#     else:
#         # If no calibration, vital_dict keeps the original payload values
#         pass
    
#     # 3. Calculate Risks based on Calibrated Values
#     from argparse import Namespace
#     vitals_obj = Namespace(**vital_dict)
#     calculated_data = calculate_risks(vitals_obj)
    
#     # 4. Save Vitals to DB
#     new_vitals = Vitals(**vital_dict, **calculated_data)
#     db.add(new_vitals)

#     # 5. Handle Alert Deduplication (Send Only Once)
#     detected_alerts = check_baseline_deviations(new_vitals)
    
#     conn_lock = f"alert_lock:{payload.patient_id}:Connectivity"
#     rem_lock = f"alert_lock:{payload.patient_id}:Band Status"

#     if detected_alerts:
#         for alert_data in detected_alerts:
#             v_type = alert_data["vital_type"]
#             lock_key = f"alert_lock:{payload.patient_id}:{v_type}"
            
#             is_locked = await redis.get(lock_key)
            
#             if not is_locked:
#                 new_alert = Alert(
#                     patient_id=payload.patient_id,
#                     ward_id=ward_id,
#                     vital_type=v_type,
#                     triggered_value=alert_data["triggered_value"],
#                     severity=alert_data["severity"]
#                 )
#                 db.add(new_alert)
                
#                 await redis.set(lock_key, "active")
                
#                 alert_payload = json.dumps({**alert_data, "ward_id": ward_id})
#                 await redis.publish(f"patient:{payload.patient_id}:alerts", alert_payload)

#     # 6. RESET LOGIC: Clear hardware locks if status is normal
#     if payload.is_connected and not payload.is_removed:
#         await redis.delete(conn_lock)
#         await redis.delete(rem_lock)

#     # 7. Always Broadcast Vital Stream Update (Real-time graph)
#     stream_payload = json.dumps({
#         "patient_id": payload.patient_id,
#         "vitals": {**vital_dict, **calculated_data},
#         "ward_id": ward_id
#     }, default=str)
#     await redis.publish(f"patient:{payload.patient_id}:stream", stream_payload)

#     await db.commit()
#     return {"status": "success"}

# @router.post("/ingest")
# async def ingest_vitals(
#     payload: VitalIngestSchema, 
#     db: AsyncSession = Depends(get_db), 
#     redis = Depends(get_redis)
# ):
#     # 1. Fetch Context (Inheritance handles the User join automatically)
#     # We select User.created_at specifically for the 15-min New User Mute logic.
#     stmt = (
#         select(Patient, User.created_at, Room.ward_id, PatientCalibration)
#         .join(Room, Patient.room_id == Room.id)
#         .outerjoin(PatientCalibration, Patient.id == PatientCalibration.patient_id)
#         .where(Patient.id == payload.patient_id)
#     )
    
#     result = await db.execute(stmt)
#     row = result.first()
#     if not row:
#         raise HTTPException(status_code=404, detail="Patient context not found")
    
#     patient, user_created_at, ward_id, cal = row

#     # 2. Apply Dynamic Calibration (If Nurse has entered offsets)
#     vital_dict = payload.model_dump()
#     if cal:
#         vital_dict["temp"] = round(vital_dict["temp"] + (cal.temp_offset or 0.0), 1)
#         vital_dict["bp_systolic"] += (cal.systolic_offset or 0)
#         vital_dict["bp_diastolic"] += (cal.diastolic_offset or 0)

#     # 3. Calculate NEWS2 & Clinical Risks (Always stored for history)
#     vitals_obj = Namespace(**vital_dict)
#     calculated_data = calculate_risks(vitals_obj)
    
#     # 4. Save Vitals to DB (Database is never muted)
#     new_vitals = Vitals(**vital_dict, **calculated_data)
#     db.add(new_vitals)

#     # 5. Fetch Last Hardware Failure (For 15-min Stabilization Mute)
#     stab_stmt = (
#         select(Vitals.created_at)
#         .where(Vitals.patient_id == payload.patient_id)
#         .where(or_(Vitals.is_connected == False, Vitals.is_removed == True))
#         .order_by(Vitals.created_at.desc())
#         .limit(1)
#     )
#     stab_res = await db.execute(stab_stmt)
#     last_failure_at = stab_res.scalar_one_or_none()

#     # 6. Process Smart Alerts
#     # This function uses user_created_at and last_failure_at to decide if it should mute
#     detected_alerts = check_baseline_deviations(
#         vitals=new_vitals, 
#         user_created_at=user_created_at, 
#         last_failure_at=last_failure_at
#     )
    
#     if detected_alerts:
#         for alert_data in detected_alerts:
#             v_type = alert_data["vital_type"]
#             lock_key = f"alert_lock:{payload.patient_id}:{v_type}"
            
#             is_locked = await redis.get(lock_key)
#             if not is_locked:
#                 # FIXED LOGIC: 
#                 # Remove the explicit patient_id because it is already in alert_data
#                 new_alert = Alert(
#                     ward_id=ward_id,
#                     **alert_data 
#                 )
#                 db.add(new_alert)
                
#                 await redis.set(lock_key, "active")
                
#                 # Publish to Frontend
#                 await redis.publish(
#                     f"patient:{payload.patient_id}:alerts", 
#                     json.dumps({**alert_data, "ward_id": ward_id})
#                 )

#     # 7. Reset Locks if Hardware is Healthy
#     if payload.is_connected and not payload.is_removed:
#         await redis.delete(f"alert_lock:{payload.patient_id}:Connectivity")
#         await redis.delete(f"alert_lock:{payload.patient_id}:Band Status")

#     # 8. Broadcast to Real-time Stream (Graphs update even if alerts are muted)
#     stream_payload = json.dumps({
#         "patient_id": payload.patient_id,
#         "vitals": {**vital_dict, **calculated_data},
#         "ward_id": ward_id,
#         "timestamp": str(datetime.utcnow())
#     })
#     await redis.publish(f"patient:{payload.patient_id}:stream", stream_payload)

#     await db.commit()
#     return {"status": "success"}

@router.post("/ingest")
async def ingest_vitals(
    payload: VitalIngestSchema, 
    db: AsyncSession = Depends(get_db), 
    redis = Depends(get_redis)
):
    # 1. Fetch Context via Polymorphic Mapping (Prevents DuplicateAliasError)
    stmt = (
        select(
            Patient, 
            User.created_at, 
            Ward.id,
            Ward.name,        
            Room.room_number, 
            User.phone_number, 
            PatientCalibration
        )
        .join(Room, Patient.room_id == Room.id)
        .join(Ward, Room.ward_id == Ward.id) 
        .outerjoin(PatientCalibration, Patient.id == PatientCalibration.patient_id)
        .where(Patient.id == payload.patient_id)
    )
    
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Patient context not found")
    
    patient, user_created_at, ward_id, ward_name, room_number, phone_number, cal = row

    # 2. Extract payload to dictionary, excluding UI status fields not present in DB model
    vital_dict = payload.model_dump(exclude={"heart_rate_status", "spo2_status", "bp_status", "temperature_status"})

    # 3. Rule Enforcement: Zero-out Clinical Parameters if Hardware state fails
    if not vital_dict.get("is_connected", True) or vital_dict.get("is_removed", False):
        vital_dict["heart_rate"] = 0
        vital_dict["spo2"] = 0
        vital_dict["bp_systolic"] = 0
        vital_dict["bp_diastolic"] = 0
        vital_dict["temp"] = 0.0
        vital_dict["movement"] = 0
    else:
        # Only apply calibration offsets if the sensor readings are active and valid
        if cal:
            vital_dict["temp"] = round(vital_dict["temp"] + (cal.temp_offset or 0.0), 1)
            vital_dict["bp_systolic"] += (cal.systolic_offset or 0)
            vital_dict["bp_diastolic"] += (cal.diastolic_offset or 0)

    # 4. Calculate Early Warning Risks
    vitals_obj = Namespace(**vital_dict)
    calculated_data = calculate_risks(vitals_obj)
    
    # 5. Save Telemetry Instance to Database
    new_vitals = Vitals(**vital_dict, **calculated_data)
    db.add(new_vitals)

    # 6. Fetch Most Recent Hardware Interruption for Stabilization Filtering
    stab_stmt = (
        select(Vitals.created_at)
        .where(Vitals.patient_id == payload.patient_id)
        .where(or_(Vitals.is_connected == False, Vitals.is_removed == True))
        .order_by(Vitals.created_at.desc()).limit(1)
    )
    stab_res = await db.execute(stab_stmt)
    last_failure_at = stab_res.scalar_one_or_none()

    # 7. Evaluate Explicit Deviations (Triggers clinical alarms if windows are clear)
    detected_alerts = check_baseline_deviations(
        vitals=new_vitals, 
        user_created_at=user_created_at, 
        ward_name=ward_name,
        room_number=room_number, 
        phone_number=phone_number,
        last_failure_at=last_failure_at
    )
    
    if detected_alerts:
        for alert_data in detected_alerts:
            v_type = alert_data["vital_type"]
            lock_key = f"alert_lock:{payload.patient_id}:{v_type}"
            
            is_locked = await redis.get(lock_key)
            if not is_locked:
                new_alert = Alert(
                    patient_id=payload.patient_id,
                    ward_id=ward_id,
                    vital_type=alert_data["vital_type"],
                    triggered_value=alert_data["triggered_value"],
                    severity=alert_data["severity"]
                )
                db.add(new_alert)
                await db.flush() # Flush to generate autoincrement ID
                
                # Attach unique DB ID to event strings
                alert_data["id"] = new_alert.id
                alert_data["alert_id"] = new_alert.id
                
                # Mute duplicate entries for 5 minutes
                await redis.setex(lock_key, 300, "active")
                
                # Publish event via Server-Sent Events channel
                await redis.publish(
                    f"patient:{payload.patient_id}:alerts", 
                    json.dumps(alert_data)
                )

    # 8. Reset Asymmetric State Transitions
    # ANY active API ingest ping drops the background task's dead lock
    await redis.delete(f"patient_dead_state:{payload.patient_id}")
    await redis.delete(f"alert_lock:{payload.patient_id}:Network")

    # Only clear hardware disconnect locks if the sensor states are completely sound
    if payload.is_connected and not payload.is_removed:
        await redis.delete(f"alert_lock:{payload.patient_id}:Connectivity")
        await redis.delete(f"alert_lock:{payload.patient_id}:Band Status")

    # 9. JSON Serialization Safe Realtime Broadcast
    timestamp_str = datetime.utcnow().isoformat()
    serializable_vitals = {**vital_dict, **calculated_data}
    
    # Add UI statuses for the SSE Stream
    vital_statuses = get_vital_statuses(new_vitals)
    serializable_vitals.update(vital_statuses)
    
    serializable_vitals["created_at"] = timestamp_str # Overwrite datetime object with string
    
    stream_payload = json.dumps({
        "patient_id": payload.patient_id,
        "vitals": serializable_vitals,
        "ward_name": ward_name,
        "room_number": room_number,
        "timestamp": timestamp_str
    })
    
    await redis.publish(f"patient:{payload.patient_id}:stream", stream_payload)
    
    # 10. Update Heartbeat Switch Active Window (3 Minutes TTL)
    await redis.setex(f"patient_active:{payload.patient_id}", 65, "online")

    await db.commit()
    return {"status": "success"}

@router.post("/calibrate")
async def calibrate_patient(
    data: CalibrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    # 1. Identity Check
    stmt = select(Patient).where(Patient.id == current_user.id)
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # 2. Get existing calibration or create a new empty one
    cal_stmt = select(PatientCalibration).where(PatientCalibration.patient_id == patient.id)
    cal_result = await db.execute(cal_stmt)
    calibration = cal_result.scalars().first()

    if not calibration:
        calibration = PatientCalibration(patient_id=patient.id)
        db.add(calibration)

    # 3. Update Manual (Actual) Data if provided
    if data.actual_temp is not None: calibration.actual_temp = data.actual_temp
    if data.actual_systolic is not None: calibration.actual_systolic = data.actual_systolic
    if data.actual_diastolic is not None: calibration.actual_diastolic = data.actual_diastolic

    # 4. Update Sensor Data if provided
    if data.sensor_temp is not None: calibration.sensor_temp = data.sensor_temp
    if data.sensor_systolic is not None: calibration.sensor_systolic = data.sensor_systolic
    if data.sensor_diastolic is not None: calibration.sensor_diastolic = data.sensor_diastolic

    # 5. RE-CALCULATE OFFSETS (Only if both Actual and Sensor exist)
    # Temperature
    if calibration.actual_temp is not None and calibration.sensor_temp is not None:
        calibration.temp_offset = round(calibration.actual_temp - calibration.sensor_temp, 2)
    
    # Blood Pressure
    if calibration.actual_systolic is not None and calibration.sensor_systolic is not None:
        calibration.systolic_offset = calibration.actual_systolic - calibration.sensor_systolic
        
    if calibration.actual_diastolic is not None and calibration.sensor_diastolic is not None:
        calibration.diastolic_offset = calibration.actual_diastolic - calibration.sensor_diastolic

    await db.commit()
    
    return {
        "status": "success",
        "message": "Calibration data synced",
        "current_offsets": {
            "temp": calibration.temp_offset,
            "systolic": calibration.systolic_offset,
            "diastolic": calibration.diastolic_offset
        }
    }

@router.post("/calibrate_by_id/{user_id}")
async def calibrate_patient_by_id(
    user_id: str,
    data: CalibrationRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Identity Check
    stmt = (
        select(Patient)
        # REMOVED: .join(User, Patient.id == User.id) 
        .where(func.lower(User.user_id) == func.lower(user_id))
    )
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # 2. Get existing calibration or create a new empty one
    cal_stmt = select(PatientCalibration).where(PatientCalibration.patient_id == patient.id)
    cal_result = await db.execute(cal_stmt)
    calibration = cal_result.scalars().first()

    if not calibration:
        calibration = PatientCalibration(patient_id=patient.id)
        db.add(calibration)

    # 3. Update Manual (Actual) Data if provided
    if data.actual_temp is not None: calibration.actual_temp = data.actual_temp
    if data.actual_systolic is not None: calibration.actual_systolic = data.actual_systolic
    if data.actual_diastolic is not None: calibration.actual_diastolic = data.actual_diastolic

    # 4. Update Sensor Data if provided
    if data.sensor_temp is not None: calibration.sensor_temp = data.sensor_temp
    if data.sensor_systolic is not None: calibration.sensor_systolic = data.sensor_systolic
    if data.sensor_diastolic is not None: calibration.sensor_diastolic = data.sensor_diastolic

    # 5. RE-CALCULATE OFFSETS (Only if both Actual and Sensor exist)
    # Temperature
    if calibration.actual_temp is not None and calibration.sensor_temp is not None:
        calibration.temp_offset = round(calibration.actual_temp - calibration.sensor_temp, 2)
    
    # Blood Pressure
    if calibration.actual_systolic is not None and calibration.sensor_systolic is not None:
        calibration.systolic_offset = calibration.actual_systolic - calibration.sensor_systolic
        
    if calibration.actual_diastolic is not None and calibration.sensor_diastolic is not None:
        calibration.diastolic_offset = calibration.actual_diastolic - calibration.sensor_diastolic

    await db.commit()
    
    return {
        "status": "success",
        "message": "Calibration data synced",
        "current_offsets": {
            "temp": calibration.temp_offset,
            "systolic": calibration.systolic_offset,
            "diastolic": calibration.diastolic_offset
        }
    }





