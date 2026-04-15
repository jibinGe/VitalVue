from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from app.database import get_db, get_redis
from app.schemas.user import PatientCreate
from app.crud.user import patient as crud_patient
from app.models.organization import Room
from app.models.user import Patient, User, Nurse, Doctor, UserRole
from app.models.vitals import Vitals
from app.models.clinical import Alert, Action
from typing import List
from app.schemas.patient import PatientDetailResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from app.api.deps import get_current_user, allow_admins
from sqlalchemy import func, and_, text
from datetime import datetime
from sqlalchemy import func, and_, text, select, inspect, Integer, Float, String, Boolean
import json

router = APIRouter()

@router.post("/register")
async def register_patient(
    obj_in: PatientCreate, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify Room Availability
    room = await db.get(Room, obj_in.room_id)
    if not room or room.is_occupied:
        raise HTTPException(status_code=400, detail="Selected room is unavailable")

    # 2. Create Patient (Uses the generic CRUD we built)
    new_patient = await crud_patient.create(db, obj_in=obj_in)

    # 3. Mark Room as Occupied
    room.is_occupied = True
    await db.commit()

    return new_patient

@router.patch("/{patient_id}/assign-nurse")
async def assign_nurse_to_patient(
    patient_id: int,
    nurse_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(allow_admins)
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    patient.nurse_id = nurse_id
    await db.commit()
    return {"message": f"Patient assigned to Nurse ID {nurse_id}"}

@router.get("/assigned", response_model=List[PatientDetailResponse])
async def get_assigned_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Base Query with joins for assigned staff names
    query = (
        select(Patient)
        .options(
            joinedload(Patient.assigned_nurse),
            joinedload(Patient.assigned_doctor)
        )
    )

    # 2. Role-Based Filtering
    if current_user.role == UserRole.NURSE:
        query = query.where(Patient.nurse_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        query = query.where(Patient.doctor_id == current_user.id)
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN]:
        query = query.where(Patient.organization_id == current_user.organization_id)
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    result = await db.execute(query)
    patients = result.scalars().all()

    response_data = []
    for p in patients:
        # 3. Fetch the 20 latest vitals (All columns included)
        vitals_query = (
            select(Vitals)
            .where(Vitals.patient_id == p.id)
            .order_by(Vitals.created_at.desc())
            .limit(20)
        )
        vitals_result = await db.execute(vitals_query)
        latest_20_vitals = vitals_result.scalars().all()

        response_data.append({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "room_no": "101", # Replace with p.room_id logic if needed
            "assigned_doctor": p.assigned_doctor.full_name if p.assigned_doctor else None,
            "assigned_nurse": p.assigned_nurse.full_name if p.assigned_nurse else None,
            "vitals_history": latest_20_vitals # Contains all data: HR, SpO2, AF_Warning, etc.
        })

    return response_data

@router.get("/history/{patient_id}")
async def get_patient_vitals_history(
    patient_id: int,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    scale_minutes: int = Query(1, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Security Check: Assigned Doctor or Nurse only
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # RBAC: Verify assignment
    if current_user.role == UserRole.NURSE and patient.nurse_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this patient")

    # 2. Time-Bucketing Logic
    bucket_size = scale_minutes * 60
    time_bucket = func.floor(func.extract('epoch', Vitals.created_at) / bucket_size) * bucket_size

    query = (
        select(
            func.to_timestamp(time_bucket).label("timestamp"),
            # Row 1: Primary Vitals (Averages)
            func.avg(Vitals.heart_rate).label("hr"),
            func.avg(Vitals.spo2).label("spo2"),
            func.avg(Vitals.temp).label("temp"),
            func.avg(Vitals.bp_systolic).label("sys"),
            func.avg(Vitals.bp_diastolic).label("dia"),
            # Row 2: Risk Analysis (Max severity in bucket)
            func.max(Vitals.news2_score).label("news2"),
            func.max(Vitals.af_warning).label("af"),
            func.max(Vitals.stroke_risk).label("stroke"),
            func.max(Vitals.seizure_risk).label("seizure"),
            # Row 3: Advanced Metrics & Status
            func.avg(Vitals.hrv_score).label("hrv"),
            func.max(Vitals.stress_level).label("stress"),
            func.avg(Vitals.movement).label("move"),
            func.avg(Vitals.battery_percent).label("batt"),
            func.bool_and(Vitals.is_connected).label("conn")
        )
        .where(
            and_(
                Vitals.patient_id == patient_id,
                Vitals.created_at >= start_time,
                Vitals.created_at <= end_time
            )
        )
        .group_by("timestamp")
        .order_by(text("timestamp ASC"))
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "timestamp": row.timestamp,
            "primary_vitals": {
                "heart_rate": round(row.hr, 1),
                "spo2": round(row.spo2, 1),
                "temp": round(row.temp, 1),
                "blood_pressure": f"{int(row.sys)}/{int(row.dia)}"
            },
            "clinical_risks": {
                "news2_score": row.news2,
                "af_warning": row.af,
                "stroke_risk": row.stroke,
                "seizure_risk": row.seizure
            },
            "advanced_metrics": {
                "hrv_score": round(row.hrv, 1),
                "stress_level": row.stress,
                "movement_index": round(row.move, 1)
            },
            "device_status": {
                "battery": int(row.batt),
                "is_connected": row.conn
            }
        }
        for row in rows
    ]

@router.get("/history/{patient_id}/{metric_name}")
async def get_dynamic_metric_history(
    patient_id: int,
    metric_name: str,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    scale_minutes: int = Query(1, ge=1, le=1440),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Dynamic Column Inspection
    # This automatically finds all columns in your Vitals model
    mapper = inspect(Vitals)
    columns = [c.key for c in mapper.attrs]
    
    if metric_name not in columns:
        raise HTTPException(
            status_code=400, 
            detail=f"Metric '{metric_name}' not found. Available: {', '.join(columns)}"
        )

    # 2. Security Check (Assigned Nurse/Doctor only)
    patient_result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = patient_result.scalars().first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if current_user.role == UserRole.NURSE and patient.nurse_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this patient")

    # 3. Dynamic Aggregation Logic
    bucket_size = scale_minutes * 60
    time_bucket = func.floor(func.extract('epoch', Vitals.created_at) / bucket_size) * bucket_size
    
    # Get the actual SQLAlchemy column object dynamically
    target_column = getattr(Vitals, metric_name)
    
    # Decide aggregation type: Numbers get Averaged, Strings get Maximum (latest/worst state)
    is_numeric = isinstance(target_column.type, (Integer, Float))
    agg_func = func.avg(target_column) if is_numeric else func.max(target_column)

    query = (
        select(
            func.to_timestamp(time_bucket).label("timestamp"),
            agg_func.label("value")
        )
        .where(
            and_(
                Vitals.patient_id == patient_id,
                Vitals.created_at >= start_time,
                Vitals.created_at <= end_time
            )
        )
        .group_by("timestamp")
        .order_by(text("timestamp ASC"))
    )

    result = await db.execute(query)
    rows = result.all()

    # 4. Response Generation
    return {
        "patient_id": patient_id,
        "metric": metric_name,
        "aggregation": "average" if is_numeric else "max_state",
        "data": [
            {
                "t": row.timestamp, 
                "v": round(row.value, 2) if (is_numeric and row.value) else row.value
            }
            for row in rows
        ]
    }

@router.post("/patients/{patient_id}/flag")
async def flag_doctor(
    patient_id: int,
    reason: str = Query(...),
    selected_doctor_id: int = Query(None), # The extra doctor chosen by the nurse
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Patient and Assigned Doctor
    result = await db.execute(
        select(Patient).options(joinedload(Patient.assigned_doctor))
        .where(Patient.id == patient_id)
    )
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Identify Unique Doctors to Alert
    # We use a set to automatically handle duplicates
    doctor_ids_to_alert = set()
    
    if patient.doctor_id:
        doctor_ids_to_alert.add(patient.doctor_id)
    
    if selected_doctor_id:
        doctor_ids_to_alert.add(selected_doctor_id)

    # 3. Create the Alert Record
    # 1. Fetch Patient
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Fetch Ward ID manually since the relationship 'room' is missing
    room_result = await db.execute(select(Room).where(Room.id == patient.room_id))
    room = room_result.scalars().first()
    p_ward_id = room.ward_id if room else None

    # 3. Create the Alert
    new_alert = Alert(
        patient_id=patient_id,
        ward_id=p_ward_id,
        vital_type="MANUAL_FLAG",
        triggered_value="NURSE_ESC",
        severity="CRITICAL",
        status="active",
        is_flagged=True,
        flagged_doctor_id=selected_doctor_id or patient.doctor_id
    )
    db.add(new_alert)
    await db.flush() # Get the alert ID before commit

    # 4. Broadcast & Notify
    flag_payload = {
        "event": "DOCTOR_FLAG",
        "alert_id": new_alert.id,
        "patient_name": patient.full_name,
        "reason": reason,
        "nurse_name": current_user.full_name,
        "timestamp": str(datetime.utcnow())
    }
    
    # Broadcast to the patient's ward/view
    await redis.publish(f"patient:{patient_id}:alerts", json.dumps(flag_payload))

    # Loop through unique doctors to send Redis signals and WhatsApps
    for doc_id in doctor_ids_to_alert:
        # A. Real-time Dashboard Update for each doctor
        await redis.publish(f"doctor:{doc_id}:alerts", json.dumps(flag_payload))
        
        # B. Fetch Doctor's Phone Number for WhatsApp
        doc_result = await db.execute(select(User).where(User.id == doc_id))
        doctor_user = doc_result.scalars().first()
        
        # if doctor_user and doctor_user.phone_number:
        #     background_tasks.add_task(
        #         send_doctor_flag_whatsapp,
        #         doctor_user.phone_number,
        #         patient.full_name,
        #         reason,
        #         current_user.full_name
        #     )

    await db.commit()
    return {"status": f"Alert sent to {len(doctor_ids_to_alert)} unique doctor(s)"}

@router.post("/patients/{patient_id}/action")
async def perform_patient_action(
    patient_id: int,
    action_type: str = Body(..., embed=True), # 'Acknowledge Only', 'Medication', etc.
    alert_id: int = Body(None, embed=True),    # Optional: Link to a specific alert
    other_details: str = Body(None, embed=True),
    performed_at: datetime = Body(None, embed=True), # Back-dated time from UI
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    # 1. Validation: Ensure Patient exists
    patient_check = await db.execute(select(Patient).where(Patient.id == patient_id))
    if not patient_check.scalars().first():
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Create the Action Log
    new_action = Action(
        patient_id=patient_id,
        alert_id=alert_id,
        staff_id=current_user.id,
        action_type=action_type,
        other_details=other_details,
        performed_at=performed_at or datetime.utcnow()
    )
    db.add(new_action)

    # 3. If linked to an Alert, Mark the Alert as Resolved
    if alert_id:
        alert_result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = alert_result.scalars().first()
        
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.utcnow()
            alert.resolved_by = current_user.id
            
            # Broadcast the "Clear Alert" signal to the Dashboard via Redis
            clear_payload = {
                "event": "ALERT_RESOLVED",
                "alert_id": alert_id,
                "patient_id": patient_id,
                "action_taken": action_type,
                "by": current_user.full_name
            }
            await redis.publish(f"patient:{patient_id}:alerts", json.dumps(clear_payload))

    # 4. Broadcast the Action to the Ward Stream (for real-time timeline updates)
    action_payload = {
        "event": "ACTION_LOGGED",
        "patient_id": patient_id,
        "staff_name": current_user.full_name,
        "action": action_type,
        "time": str(new_action.performed_at)
    }
    await redis.publish(f"ward_vitals_stream", json.dumps(action_payload))

    await db.commit()
    
    return {
        "status": "success",
        "action_id": new_action.id,
        "message": f"Action '{action_type}' recorded by {current_user.full_name}"
    }

