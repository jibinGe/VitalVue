from fastapi import APIRouter, Depends, HTTPException, Query
from app.database import get_db, get_redis
from app.schemas.user import PatientCreate
from app.crud.user import patient as crud_patient
from app.models.organization import Room
from app.models.user import Patient, User, Nurse, Doctor, UserRole
from app.models.vitals import Vitals
from app.models.clinical import Alert
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
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify the patient exists and get assigned doctor
    result = await db.execute(
        select(Patient).options(joinedload(Patient.assigned_doctor))
        .where(Patient.id == patient_id)
    )
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Create a "Flagged" Alert record
    new_alert = Alert(
        patient_id=patient_id,
        alert_type="MANUAL_FLAG",
        severity="CRITICAL",
        message=f"Nurse {current_user.full_name} flagged: {reason}",
        is_resolved=False
    )
    db.add(new_alert)
    
    # 3. Real-time Broadcast to Doctor's Dashboard
    flag_payload = {
        "event": "DOCTOR_FLAG",
        "patient_name": patient.full_name,
        "reason": reason,
        "nurse_name": current_user.full_name,
        "timestamp": str(datetime.utcnow())
    }
    
    # Notify the specific ward and the specific doctor
    await redis.publish(f"patient:{patient_id}:alerts", json.dumps(flag_payload))
    if patient.doctor_id:
        await redis.publish(f"doctor:{patient.doctor_id}:alerts", json.dumps(flag_payload))

    # 4. Trigger the Twilio WhatsApp Alert to the Doctor
    # if patient.assigned_doctor and patient.assigned_doctor.phone_number:
    #     # We reuse your existing Twilio service but customize the message
    #     background_tasks.add_task(
    #         send_doctor_flag_whatsapp,
    #         patient.assigned_doctor.phone_number,
    #         patient.full_name,
    #         reason,
    #         current_user.full_name
    #     )

    await db.commit()
    return {"status": "Doctor Flagged Successfully"}

