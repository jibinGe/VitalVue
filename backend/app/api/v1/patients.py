from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body
from app.database import get_db, get_redis
from app.schemas.user import PatientCreate
from app.crud.user import patient as crud_patient
from app.models.organization import Room
from app.models.user import Patient, User, Nurse, Doctor, UserRole
from app.models.vitals import Vitals
from app.services.alerts import send_vitalvue_whatsapp
from app.models.clinical import Alert, Action
from typing import List, Optional
from app.schemas.patient import PatientDetailResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from app.api.deps import get_current_user, allow_admins
from sqlalchemy import func, and_, text, or_
from datetime import datetime
from sqlalchemy import func, and_, text, select, inspect, Integer, Float, String, Boolean
import json
import random
import string
from sqlalchemy.exc import IntegrityError
import secrets
import string

router = APIRouter()

def generate_random_device_id():
    """Generates a random string starting with 'random_k12nm'"""
    # Generate 6 random alphanumeric characters
    suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    return f"random_{suffix}"

@router.post("/register")
async def register_patient(
    obj_in: PatientCreate, 
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify Room Availability
    room = await db.get(Room, obj_in.room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # 2. Force a Random Unique Device ID
    obj_in.device_id = generate_random_device_id()

    # 3. Create Patient with specific Error Handling
    try:
        new_patient = await crud_patient.create(db, obj_in=obj_in)
        
        # 4. Mark Room as Occupied (Optional: Uncomment if needed)
        # room.is_occupied = True
        
        await db.commit()
        await db.refresh(new_patient)
        return new_patient

    except IntegrityError as e:
        await db.rollback()
        error_details = str(e.orig)
        
        # Check which constraint was violated
        if "ix_users_user_id" in error_details:
            raise HTTPException(status_code=400, detail=f"Patient ID '{obj_in.user_id}' is already registered.")
        
        if "phone_number" in error_details:
            raise HTTPException(status_code=400, detail=f"Phone number '{obj_in.phone_number}' is already linked to another account.")
        
        if "ix_patients_device_id" in error_details:
            # Although we generate it randomly, it's safe to handle just in case
            raise HTTPException(status_code=400, detail="Generated Device ID collision. Please try again.")

        raise HTTPException(status_code=400, detail="Database integrity violation: Duplicate entry detected.")
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")
    
@router.patch("/me/change-device")
async def update_my_device(
    new_device_id: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user) 
):
    # 1. Verify Patient Record
    stmt = select(Patient).where(Patient.id == current_user.id)
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient:
        raise HTTPException(
            status_code=403, 
            detail="Only registered patients can update their own device mapping."
        )

    # --- MODIFICATION: Handle Empty Device ID ---
    # If the payload is {"new_device_id": ""}, generate the unassigned prefix
    if not new_device_id or new_device_id.strip() == "":
        random_suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        new_device_id = f"unasigned_{random_suffix}"
    # --------------------------------------------

    # 2. Check for Duplicate Mapping
    # Note: This check still works; it ensures two people don't accidentally 
    # get the same 'unasigned_' string, though the random suffix makes that rare.
    check_stmt = select(Patient).where(Patient.device_id == new_device_id)
    existing_device = await db.execute(check_stmt)
    if existing_device.scalars().first():
        raise HTTPException(
            status_code=400, 
            detail="This device ID (or generated placeholder) is already in use."
        )

    # 3. Update the device ID
    old_device_id = patient.device_id
    patient.device_id = new_device_id
    
    await db.commit()
    await db.refresh(patient)

    return {
        "status": "success",
        "message": "Device successfully updated",
        "old_device_id": old_device_id,
        "new_device_id": patient.device_id
    }

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
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by Full Name or Patient ID")
):
    # 1. Base Query: Do NOT manually join User. 
    # SQLAlchemy handles the Patient->User join automatically via inheritance.
    query = (
        select(Patient)
        .options(
            joinedload(Patient.assigned_nurse),
            joinedload(Patient.assigned_doctor)
        )
    )

    # --- MODIFICATION: Filter by User.is_active directly ---
    # Since Patient inherits from User, referencing User.is_active here works perfectly.
    query = query.where(User.is_active == True)
    # -------------------------------------------------------

    # 2. Role-Based Filtering
    if current_user.role == UserRole.NURSE:
        query = query.where(Patient.nurse_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        query = query.where(Patient.doctor_id == current_user.id)
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN]:
        # Filter by Org ID (also found on the User table part of the Patient)
        query = query.where(User.organization_id == current_user.organization_id)
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    # 3. Apply Search Filter
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Patient.full_name.ilike(search_filter),
                Patient.user_id.ilike(search_filter)
            )
        )

    # This will now execute without the DuplicateAliasError
    result = await db.execute(query)
    patients = result.scalars().all()

    response_data = []
    for p in patients:
        # 4. Fetch the 20 latest vitals
        vitals_query = (
            select(Vitals)
            .where(Vitals.patient_id == p.id)
            .order_by(Vitals.created_at.desc())
            .limit(20)
        )
        vitals_result = await db.execute(vitals_query)
        latest_20_vitals = vitals_result.scalars().all()

        latest = latest_20_vitals[0] if latest_20_vitals else None

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
            "vitals_history": latest_20_vitals,

            "news2_score": latest.news2_score if latest else 0,
            "af_warning": latest.af_warning if latest else "Normal",
            # "stroke_risk": latest.stroke_risk if latest else "Low",
            # "seizure_risk": latest.seizure_risk if latest else "Low",
            "is_connected": latest.is_connected if latest else False,
            "is_removed": latest.is_removed if latest else False,
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
    selected_doctor_id: int = Query(None),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Patient
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Fetch Room & Ward
    room_name = "N/A"
    ward_label = "N/A"
    if patient.room_id:
        room_result = await db.execute(select(Room).where(Room.id == patient.room_id))
        room = room_result.scalars().first()
        if room:
            room_name = room.room_number
            ward_label = str(room.ward_id)

    # 3. Fetch Latest Vitals (to fill WhatsApp template placeholders)
    v_res = await db.execute(
        select(Vitals)
        .where(Vitals.patient_id == patient_id)
        .order_by(Vitals.created_at.desc())
        .limit(1)
    )
    vitals = v_res.scalars().first()
    
    # 4. Identify Doctor to Notify
    doc_id = selected_doctor_id or patient.doctor_id
    if not doc_id:
        raise HTTPException(status_code=400, detail="No doctor assigned to this patient")

    # 5. Create Alert Record
    new_alert = Alert(
        patient_id=patient_id,
        ward_id=int(ward_label) if ward_label.isdigit() else None,
        vital_type="MANUAL_FLAG",
        triggered_value="NURSE_ESC",
        severity="CRITICAL",
        status="active"
    )
    db.add(new_alert)

    # 6. Notify via WhatsApp ONLY
    doc_user = (await db.execute(select(User).where(User.id == doc_id))).scalars().first()
    
    if doc_user and doc_user.phone_number:
        background_tasks.add_task(
            send_vitalvue_whatsapp,
            doc_user.phone_number,         # doctor_phone
            patient.full_name,             # patient_name
            reason,                        # reason (6)
            vitals.heart_rate if vitals else "0", # hr (3)
            vitals.spo2 if vitals else "0",       # spo2 (4)
            vitals.news2_score if vitals else "0",# news2 (5)
            ward_label,                    # ward_name
            room_name                      # room_name (7)
        )

    await db.commit()
    return {"status": "Escalation processed successfully"}

@router.post("/patients/{patient_id}/action")
async def perform_patient_action(
    patient_id: int,
    action_type: str = Body(..., embed=True),
    alert_id: int = Body(None, embed=True),
    other_details: str = Body(None, embed=True),
    performed_at: datetime = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    # 1. Validation: Ensure Patient exists
    patient_check = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = patient_check.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Fix Timezone Mismatch (Naive vs Aware)
    # SQLAlchemy TIMESTAMP WITHOUT TIME ZONE needs naive objects
    clean_performed_at = performed_at
    if clean_performed_at:
        if clean_performed_at.tzinfo is not None:
            clean_performed_at = clean_performed_at.replace(tzinfo=None)
    else:
        clean_performed_at = datetime.utcnow()

    # 3. Handle Foreign Key logic (Convert 0 to None)
    # This prevents the asyncpg.exceptions.ForeignKeyViolationError
    actual_alert_id = alert_id if alert_id != 0 else None

    # 4. Create the Action Log
    new_action = Action(
        patient_id=patient_id,
        alert_id=actual_alert_id,
        staff_id=current_user.id,
        action_type=action_type,
        other_details=other_details,
        performed_at=clean_performed_at,
        created_at=datetime.utcnow()
    )
    db.add(new_action)

    # 5. If linked to an Alert, Mark the Alert as Resolved
    if actual_alert_id:
        alert_result = await db.execute(select(Alert).where(Alert.id == actual_alert_id))
        alert = alert_result.scalars().first()
        
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.utcnow()
            alert.resolved_by = current_user.id
            alert.status = "resolved" # Matching your Alert model status column
            
            # Broadcast "Clear Alert" signal to Dashboard
            clear_payload = {
                "event": "ALERT_RESOLVED",
                "alert_id": actual_alert_id,
                "patient_id": patient_id,
                "action_taken": action_type,
                "by": current_user.full_name
            }
            await redis.publish(f"patient:{patient_id}:alerts", json.dumps(clear_payload))

    # 6. Broadcast Action to Ward Stream for Real-time Timeline
    action_payload = {
        "event": "ACTION_LOGGED",
        "patient_id": patient_id,
        "patient_name": patient.full_name,
        "staff_name": current_user.full_name,
        "action": action_type,
        "details": other_details,
        "time": clean_performed_at.isoformat()
    }
    await redis.publish("ward_vitals_stream", json.dumps(action_payload))

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
    return {
        "status": "success",
        "action_id": new_action.id,
        "message": f"Action '{action_type}' recorded successfully"
    }
