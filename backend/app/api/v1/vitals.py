from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.database import get_db, get_redis
from app.models.vitals import Vitals, PatientCalibration
from app.models.clinical import Alert
from app.models.organization import Room, Ward, Bed  # Added to find ward context (room OR bed, v2)
from app.models.user import Patient
from app.schemas.vitals import VitalIngestSchema, CalibrationRequest
from app.services.analytics import calculate_risks, check_baseline_deviations, get_vital_statuses, get_patient_overall_status
import json
from fastapi.security import OAuth2PasswordBearer
from app.models.user import User
from app.api.deps import get_current_user
from app.services.alerts import send_critical_alert
import asyncio
from app.services.push import send_critical_push, staff_tokens_for_patient
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
#     # 1. Fetch Context — org-hierarchy v2 (RUN-024): resolve ward via ROOM (legacy) OR BED (v2-admit),
#     #    so patients admitted to a bed (room_id NULL) still stream/alert. (Was an INNER join on room → 404.)
#     patient = (await db.execute(select(Patient).where(Patient.id == payload.patient_id))).scalar_one_or_none()
#     if not patient:
#         raise HTTPException(status_code=404, detail="Patient context not found")
#     user_created_at = patient.created_at
#     phone_number = patient.phone_number
#     ward_id, ward_name, room_number = None, None, None
#     if patient.room_id:
#         room = (await db.execute(select(Room).where(Room.id == patient.room_id))).scalar_one_or_none()
#         if room:
#             room_number = room.room_number
#             ward = (await db.execute(select(Ward).where(Ward.id == room.ward_id))).scalar_one_or_none()
#             if ward:
#                 ward_id, ward_name = ward.id, ward.name
#     elif patient.bed_id:
#         bed = (await db.execute(select(Bed).where(Bed.id == patient.bed_id))).scalar_one_or_none()
#         if bed:
#             room_number = bed.bed_no
#             ward = (await db.execute(select(Ward).where(Ward.id == bed.ward_id))).scalar_one_or_none()
#             if ward:
#                 ward_id, ward_name = ward.id, ward.name
#     cal = (await db.execute(select(PatientCalibration).where(PatientCalibration.patient_id == patient.id))).scalar_one_or_none()

#     # 2. Extract payload to dictionary, excluding UI status fields not present in DB model
#     vital_dict = payload.model_dump(exclude={"heart_rate_status", "spo2_status", "bp_status", "temperature_status"})

#     # 3. Rule Enforcement: Zero-out Clinical Parameters if Hardware state fails
#     if not vital_dict.get("is_connected", True) or vital_dict.get("is_removed", False):
#         vital_dict["heart_rate"] = 0
#         vital_dict["spo2"] = 0
#         vital_dict["bp_systolic"] = 0
#         vital_dict["bp_diastolic"] = 0
#         vital_dict["temp"] = 0.0
#         vital_dict["movement"] = 0
#     else:
#         # Only apply calibration offsets if the sensor readings are active and valid
#         if cal:
#             vital_dict["temp"] = round(vital_dict["temp"] + (cal.temp_offset or 0.0), 1)
#             vital_dict["bp_systolic"] += (cal.systolic_offset or 0)
#             vital_dict["bp_diastolic"] += (cal.diastolic_offset or 0)

#     # 4. Calculate Early Warning Risks
#     vitals_obj = Namespace(**vital_dict)
#     calculated_data = calculate_risks(vitals_obj)
    
#     # 5. Save Telemetry Instance to Database
#     new_vitals = Vitals(**vital_dict, **calculated_data)
#     db.add(new_vitals)

#     # 6. Fetch Most Recent Hardware Interruption for Stabilization Filtering
#     stab_stmt = (
#         select(Vitals.created_at)
#         .where(Vitals.patient_id == payload.patient_id)
#         .where(or_(Vitals.is_connected == False, Vitals.is_removed == True))
#         .order_by(Vitals.created_at.desc()).limit(1)
#     )
#     stab_res = await db.execute(stab_stmt)
#     last_failure_at = stab_res.scalar_one_or_none()

#     # 7. Evaluate Explicit Deviations (Triggers clinical alarms if windows are clear)
#     detected_alerts = check_baseline_deviations(
#         vitals=new_vitals, 
#         user_created_at=user_created_at, 
#         ward_name=ward_name,
#         room_number=room_number, 
#         phone_number=phone_number,
#         last_failure_at=last_failure_at
#     )
    
#     if detected_alerts:
#         for alert_data in detected_alerts:
#             v_type = alert_data["vital_type"]
#             lock_key = f"alert_lock:{payload.patient_id}:{v_type}"
            
#             is_locked = await redis.get(lock_key)
#             if not is_locked:
#                 new_alert = Alert(
#                     patient_id=payload.patient_id,
#                     ward_id=ward_id,
#                     vital_type=alert_data["vital_type"],
#                     triggered_value=alert_data["triggered_value"],
#                     severity=alert_data["severity"]
#                 )
#                 db.add(new_alert)
#                 await db.flush() # Flush to generate autoincrement ID
                
#                 # Attach unique DB ID to event strings
#                 alert_data["id"] = new_alert.id
#                 alert_data["alert_id"] = new_alert.id
                
#                 # Mute duplicate entries for 5 minutes
#                 await redis.setex(lock_key, 300, "active")
                
#                 # Publish event via Server-Sent Events channel
#                 await redis.publish(
#                     f"patient:{payload.patient_id}:alerts",
#                     json.dumps(alert_data)
#                 )

#                 # Plan D (RUN-024): also push to the patient's staff phones (offline delivery).
#                 # Fetched here (needs db), sent off-thread so a slow FCM call never blocks ingest.
#                 _push_tokens = await staff_tokens_for_patient(db, payload.patient_id)
#                 if _push_tokens:
#                     asyncio.create_task(asyncio.to_thread(send_critical_push, _push_tokens, alert_data))

#     # 8. Reset Asymmetric State Transitions
#     # ANY active API ingest ping drops the background task's dead lock
#     await redis.delete(f"patient_dead_state:{payload.patient_id}")
#     await redis.delete(f"alert_lock:{payload.patient_id}:Network")

#     # Only clear hardware disconnect locks if the sensor states are completely sound
#     if payload.is_connected and not payload.is_removed:
#         await redis.delete(f"alert_lock:{payload.patient_id}:Connectivity")
#         await redis.delete(f"alert_lock:{payload.patient_id}:Band Status")

#     # 9. JSON Serialization Safe Realtime Broadcast
#     timestamp_str = datetime.utcnow().isoformat()
#     serializable_vitals = {**vital_dict, **calculated_data}
    
#     # Add UI statuses for the SSE Stream
#     vital_statuses = get_vital_statuses(new_vitals)
#     serializable_vitals.update(vital_statuses)
    
#     # Derive single overall patient triage status
#     patient_status = get_patient_overall_status(new_vitals, vital_statuses, calculated_data)
    
#     serializable_vitals["created_at"] = timestamp_str # Overwrite datetime object with string
    
#     stream_payload = json.dumps({
#         "patient_id": payload.patient_id,
#         "patient_status": patient_status,
#         "vitals": serializable_vitals,
#         "ward_name": ward_name,
#         "room_number": room_number,
#         "timestamp": timestamp_str
#     })
    
#     await redis.publish(f"patient:{payload.patient_id}:stream", stream_payload)
    
#     # 10. Update Heartbeat Switch Active Window (3 Minutes TTL)
#     await redis.setex(f"patient_active:{payload.patient_id}", 65, "online")

#     await db.commit()
#     return {"status": "success"}

@router.post("/ingest")
async def ingest_vitals(
    payload: VitalIngestSchema, 
    background_tasks: BackgroundTasks, # Added BackgroundTasks for non-blocking HTTP calls
    db: AsyncSession = Depends(get_db), 
    redis = Depends(get_redis)
):
    # 1. Fetch Context 
    patient = (await db.execute(select(Patient).where(Patient.id == payload.patient_id))).scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient context not found")
    
    user_created_at = patient.created_at
    phone_number = patient.phone_number
    ward_id, ward_name, room_number = None, None, None
    
    if patient.room_id:
        room = (await db.execute(select(Room).where(Room.id == patient.room_id))).scalar_one_or_none()
        if room:
            room_number = room.room_number
            ward = (await db.execute(select(Ward).where(Ward.id == room.ward_id))).scalar_one_or_none()
            if ward:
                ward_id, ward_name = ward.id, ward.name
    elif patient.bed_id:
        bed = (await db.execute(select(Bed).where(Bed.id == patient.bed_id))).scalar_one_or_none()
        if bed:
            room_number = bed.bed_no
            ward = (await db.execute(select(Ward).where(Ward.id == bed.ward_id))).scalar_one_or_none()
            if ward:
                ward_id, ward_name = ward.id, ward.name
                
    cal = (await db.execute(select(PatientCalibration).where(PatientCalibration.patient_id == patient.id))).scalar_one_or_none()

    # 2. Extract payload to dictionary
    vital_dict = payload.model_dump(exclude={"heart_rate_status", "spo2_status", "bp_status", "temperature_status"})

    # 3. Rule Enforcement: Zero-out Clinical Parameters if Hardware state fails
    if not vital_dict.get("is_connected", True) or vital_dict.get("is_removed", False):
        vital_dict.update({
            "heart_rate": 0, "spo2": 0, "bp_systolic": 0, 
            "bp_diastolic": 0, "temp": 0.0, "movement": 0
        })
    else:
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

    # 7. Evaluate Explicit Deviations
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
                await db.flush() 
                
                alert_data["id"] = alert_data["alert_id"] = new_alert.id
                await redis.setex(lock_key, 300, "active")
                
                await redis.publish(
                    f"patient:{payload.patient_id}:alerts",
                    json.dumps(alert_data)
                )

                _push_tokens = await staff_tokens_for_patient(db, payload.patient_id)
                if _push_tokens:
                    asyncio.create_task(asyncio.to_thread(send_critical_push, _push_tokens, alert_data))

    # 8. Reset Asymmetric State Transitions
    await redis.delete(f"patient_dead_state:{payload.patient_id}")
    await redis.delete(f"alert_lock:{payload.patient_id}:Network")

    if payload.is_connected and not payload.is_removed:
        await redis.delete(f"alert_lock:{payload.patient_id}:Connectivity")
        await redis.delete(f"alert_lock:{payload.patient_id}:Band Status")

    # 9. JSON Serialization Safe Realtime Broadcast & Overall Status Check
    timestamp_str = datetime.utcnow().isoformat()
    serializable_vitals = {**vital_dict, **calculated_data}
    
    vital_statuses = get_vital_statuses(new_vitals)
    serializable_vitals.update(vital_statuses)
    
    # Derive single overall patient triage status (Critical / Warning / Stable)
    patient_status = get_patient_overall_status(new_vitals, vital_statuses, calculated_data)
    
    # =====================================================================
    # NEW: Trigger WhatsApp Alert via Background Tasks
    # =====================================================================
    if patient_status in ["Warning", "Critical"]:
        wa_lock_key = f"whatsapp_alert_lock:{payload.patient_id}:{patient_status}"
        is_wa_locked = await redis.get(wa_lock_key)
        
        # Only send if we haven't already sent an alert for this status in the last 15 minutes
        if not is_wa_locked:
            doctor = (await db.execute(select(User).where(User.id == patient.doctor_id))).scalar_one_or_none()
            
            if doctor and doctor.phone_number:
                location_string = f"{ward_name or 'N/A'} - Room {room_number or 'N/A'}"
                
                # Format vitals safely for the message
                hr_val = str(int(float(new_vitals.heart_rate))) if new_vitals.heart_rate else "N/A"
                spo2_val = f"{float(new_vitals.spo2):.1f}%" if new_vitals.spo2 else "N/A"
                bp_val = f"{new_vitals.bp_systolic}/{new_vitals.bp_diastolic}" if (new_vitals.bp_systolic and new_vitals.bp_diastolic) else "N/A"

                background_tasks.add_task(
                    send_critical_alert,
                    doctor_phone=doctor.phone_number,
                    patient_name=patient.full_name,
                    location=location_string,
                    hr_value=hr_val,
                    spo2_value=spo2_val,
                    bp_value=bp_val,
                    patient_id=str(payload.patient_id)
                )
                
                # Mute this exact WhatsApp status alert for 15 minutes (900 seconds)
                await redis.setex(wa_lock_key, 900, "active")
    # =====================================================================
    
    serializable_vitals["created_at"] = timestamp_str 
    
    stream_payload = json.dumps({
        "patient_id": payload.patient_id,
        "patient_status": patient_status,
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





