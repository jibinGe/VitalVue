from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Body, status
from app.database import get_db, get_redis
from app.schemas.user import PatientCreate
from app.crud.user import patient as crud_patient
from app.models.organization import Room, Ward
from app.models.user import Patient, User, Nurse, Doctor, UserRole
from app.models.vitals import Vitals
from app.services.alerts import send_consolidated_vitalvue_alert
from app.models.clinical import Alert, Action
from typing import List, Optional
from app.schemas.patient import PaginatedPatientArchiveResponse, PatientDetailResponse, MonitoringToggleSchema, PatientDischargeResponseSchema, PatientReadmitSchema
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.future import select
from app.api.deps import get_current_user, allow_admins
from sqlalchemy import func, and_, text, or_
from app.models.clinical import Alert, Action, ClinicalNote
from app.schemas.clinical_audit import PatientClinicalTimelineResponse
from datetime import datetime
from sqlalchemy import func, and_, text, select, inspect, Integer, Float, String, Boolean
import json
import random
import string
from sqlalchemy.exc import IntegrityError
import secrets
import string
import math
from app.services.analytics import get_vital_statuses

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

@router.get("/{patient_id}/timeline", response_model=PatientClinicalTimelineResponse)
async def get_patient_clinical_timeline(
    patient_id: int,
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    alert_category: Optional[str] = Query(None, description="Filter categories: 'vital', 'device'"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution state: true/false"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves a paginated clinical incident timeline for a patient with filter matrices:
    - alert_category: 'vital' (SpO2, Heart Rate, Blood Pressure) vs 'device' (Connectivity, Band Status)
    - is_resolved: True (Solved entries) vs False (Unsolved/Active entries)
    """
    # 1. Verify Patient Existence inside data tier bounds
    patient_exists = await db.scalar(select(Patient.id).where(Patient.id == patient_id))
    if not patient_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Patient with ID {patient_id} not found"
        )

    # 2. Build Dynamic Filters for the Alerts Query
    alerts_stmt = select(Alert).where(Alert.patient_id == patient_id)
    
    # Filter A: Resolution State (Handles Boolean NULL/False convergence dynamically)
    if is_resolved is not None:
        if is_resolved:
            alerts_stmt = alerts_stmt.where(Alert.is_resolved == True)
        else:
            alerts_stmt = alerts_stmt.where(or_(Alert.is_resolved == False, Alert.is_resolved == None))

    # Filter B: Category Partitioning (Differentiates hardware alerts from true vital anomalies)
    if alert_category:
        device_types = ["Connectivity", "Band Status"]
        if alert_category.lower() == "device":
            alerts_stmt = alerts_stmt.where(Alert.vital_type.in_(device_types))
        elif alert_category.lower() == "vital":
            alerts_stmt = alerts_stmt.where(Alert.vital_type.not_in(device_types))

    # 3. Compute Total Filtered Record Volume for Pagination Calculations
    count_stmt = select(func.count()).select_from(alerts_stmt.subquery())
    total_alerts = await db.scalar(count_stmt) or 0
    total_pages = math.ceil(total_alerts / limit) if total_alerts > 0 else 1

    # 4. Apply Limit/Offset Window constraints to extract targeted subset row page
    offset = (page - 1) * limit
    alerts_stmt = alerts_stmt.order_by(Alert.created_at.desc()).offset(offset).limit(limit)
    
    alerts_result = await db.execute(alerts_stmt)
    alerts_list = alerts_result.scalars().all()

    # 5. Eagerly collect mitigation actions specifically belonging to the paginated alert subset
    if alerts_list:
        alert_ids = [alert.id for alert in alerts_list]
        actions_stmt = (
            select(Action)
            .where(Action.alert_id.in_(alert_ids))
            .order_by(Action.performed_at.asc())
        )
        actions_result = await db.execute(actions_stmt)
        actions_list = actions_result.scalars().all()
    else:
        actions_list = []

    # Map target rows back onto in-memory properties safely
    alert_map = {alert.id: alert for alert in alerts_list}
    for alert in alerts_list:
        alert.actions_taken = []
        
    for action in actions_list:
        if action.alert_id in alert_map:
            alert_map[action.alert_id].actions_taken.append(action)

    # 6. Fetch Clinical Notes (Filtered or proportional to query context bounds)
    notes_stmt = (
        select(ClinicalNote)
        .where(ClinicalNote.patient_id == patient_id)
        .order_by(ClinicalNote.event_timestamp.desc())
        # To maintain alignment with pagination boundaries, we cap or match limit size
        .limit(limit) 
    )
    notes_result = await db.execute(notes_stmt)
    notes_list = notes_result.scalars().all()

    # 7. Package paginated structural matrix response
    return {
        "patient_id": patient_id,
        "page": page,
        "limit": limit,
        "total_alerts": total_alerts,
        "total_pages": total_pages,
        "alerts": alerts_list,
        "clinical_notes": notes_list
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
    """
    Fetches active patients assigned to the calling medical clinician.
    Explicitly filters out archived or formally discharged records.
    """
    # 1. Base Query: Added joinedload(Patient.room) to prevent MissingGreenlet crash
    query = (
        select(Patient)
        .options(
            joinedload(Patient.assigned_nurse),
            joinedload(Patient.assigned_doctor),
            joinedload(Patient.room).joinedload(Room.ward)  # Pre-fetches room + ward name
        )
    )

    # 2. Roster Filtering Controls
    # Enforce strict compliance boundaries: Only pull active, in-bed hospitalizations
    query = query.where(User.is_active == True)
    query = query.where(Patient.is_discharged == False)
    query = query.where(Patient.archive_status == "active")

    # 3. Role-Based Data Partitioning Filters
    if current_user.role == UserRole.NURSE:
        query = query.where(Patient.nurse_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        query = query.where(Patient.doctor_id == current_user.id)
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN]:
        query = query.where(User.organization_id == current_user.organization_id)
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    # 4. Apply Search Filter
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Patient.full_name.ilike(search_filter),
                Patient.user_id.ilike(search_filter)
            )
        )

    result = await db.execute(query)
    patients = result.scalars().all()

    response_data = []
    for p in patients:
        # 5. Fetch the 20 latest vitals logs
        vitals_query = (
            select(Vitals)
            .where(Vitals.patient_id == p.id)
            .order_by(Vitals.created_at.desc())
            .limit(20)
        )
        vitals_result = await db.execute(vitals_query)
        latest_20_vitals = vitals_result.scalars().all()
        
        # Inject dynamically calculated statuses into vitals_history
        latest_20_with_statuses = []
        for v in latest_20_vitals:
            v_dict = {c.name: getattr(v, c.name) for c in v.__table__.columns}
            v_dict.update(get_vital_statuses(v))
            latest_20_with_statuses.append(v_dict)

        latest = latest_20_vitals[0] if latest_20_vitals else None

        response_data.append({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,

            "alt_phone": p.alt_phone,
            "phone_number": p.phone_number,

            
            # This line will now evaluate completely in-memory without throwing 500 errors!
            "room_no": p.room.room_number if p.room else "N/A",
            "ward_name": p.room.ward.name if (p.room and p.room.ward) else "N/A",
            "phone_number": p.phone_number or "",
            "alt_phone": p.alt_phone or "",
            
            "assigned_doctor": p.assigned_doctor.full_name if p.assigned_doctor else None,
            "assigned_nurse": p.assigned_nurse.full_name if p.assigned_nurse else None,
            "vitals_history": latest_20_with_statuses,

            # --- DYNAMIC TELEMETRY STATUS VALUES ---
            "news2_score": latest.news2_score if latest else 0,
            "af_warning": latest.af_warning if latest else "Normal",
            "is_connected": latest.is_connected if latest else False,
            "is_removed": latest.is_removed if latest else False,
            "is_monitoring_paused": p.is_monitoring_paused
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

@router.get("/share/patient/{patient_id}")
async def get_patient_shared_vitals(
    patient_id: int,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    scale_minutes: int = Query(1, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    # 1. Security Check: Assigned Doctor or Nurse only
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalars().first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # RBAC: Verify assignment
    # if current_user.role == UserRole.NURSE and patient.nurse_id != current_user.id:
    #     raise HTTPException(status_code=403, detail="Not authorized to view this patient")

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

@router.get("/share/patient/{patient_id}/{metric_name}")
async def get_shared_dynamic_metric_history(
    patient_id: int,
    metric_name: str,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    scale_minutes: int = Query(1, ge=1, le=1440),
    db: AsyncSession = Depends(get_db),
    # current_user: User = Depends(get_current_user)
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
    
    # if current_user.role == UserRole.NURSE and patient.nurse_id != current_user.id:
    #     raise HTTPException(status_code=403, detail="Unauthorized access to this patient")

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
            ward_label = f"Ward {room.ward_id}" if str(room.ward_id).isdigit() else str(room.ward_id)

    location_string = f"{ward_label} - Room {room_name}"

    # 3. Fetch Latest Vitals
    v_res = await db.execute(
        select(Vitals)
        .where(Vitals.patient_id == patient_id)
        .order_by(Vitals.created_at.desc())
        .limit(1)
    )
    vitals = v_res.scalars().first()
    
    # Format the multi-line observations string for template parameter {{5}}
    if vitals:
        # Round safely matching your prior business logic
        hr_val = int(float(vitals.heart_rate)) if vitals.heart_rate else "N/A"
        spo2_val = f"{float(vitals.spo2):.1f}%" if vitals.spo2 else "N/A"
        news2_val = int(float(vitals.news2_score)) if vitals.news2_score else "N/A"
        
        observations_payload = (
            f"• HR: {hr_val} bpm\n"
            f"• SpO₂: {spo2_val}\n"
            f"• NEWS2 Score: {news2_val}"
        )
    else:
        observations_payload = "• Vitals: No recent vitals data captured on dashboard."

    # 4. Identify Doctor to Notify
    doc_id = selected_doctor_id or patient.doctor_id
    if not doc_id:
        raise HTTPException(status_code=400, detail="No doctor assigned to this patient")

    # 5. Create Alert Record for Auditing
    new_alert = Alert(
        patient_id=patient_id,
        ward_id=int(room.ward_id) if (patient.room_id and str(room.ward_id).isdigit()) else None,
        vital_type="MANUAL_FLAG",
        triggered_value="NURSE_ESC",
        severity="CRITICAL",
        status="active"
    )
    db.add(new_alert)

    # 6. Notify via the Consolidated WhatsApp Template Structure
    doc_user = (await db.execute(select(User).where(User.id == doc_id))).scalars().first()
    
    if doc_user and doc_user.phone_number:
        background_tasks.add_task(
            send_consolidated_vitalvue_alert,
            doc_user.phone_number,              # doctor_phone
            "🚨 CRITICAL",                       # severity ({{1}})
            "Nurse Escalation Flag",            # alert_title ({{2}})
            patient.full_name,                  # patient_name ({{3}})
            location_string,                    # location ({{4}})
            observations_payload,               # observations ({{5}})
            f"Manual escalation: {reason[:50]}", # concern ({{6}})
            "Immediate bedside assessment required. Evaluate patient status." # action_required ({{7}})
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

@router.post("/patients/{patient_id}/alerts/{alert_id}/snooze")
async def snooze_alert(
    patient_id: int,
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    alert_result = await db.execute(select(Alert).where(Alert.id == alert_id, Alert.patient_id == patient_id))
    alert = alert_result.scalars().first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    from datetime import timedelta
    alert.status = "snoozed"
    alert.snoozed_until = datetime.utcnow() + timedelta(minutes=10)
    
    # Broadcast snooze signal
    snooze_payload = {
        "event": "ALERT_SNOOZED",
        "alert_id": alert_id,
        "patient_id": patient_id,
        "snoozed_until": alert.snoozed_until.isoformat()
    }
    await redis.publish(f"patient:{patient_id}:alerts", json.dumps(snooze_payload))
    await redis.publish("ward_vitals_stream", json.dumps(snooze_payload))
    
    await db.commit()
    return {"status": "success", "message": "Alert snoozed for 10 minutes"}

@router.get("/notifications")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unread_only: bool = Query(False, description="If true, returns only active or snoozed alerts"),
    alert_category: Optional[str] = Query(None, description="Filter categories: 'vital', 'device'"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution state: true/false"),
    page: int = Query(1, ge=1, description="Page number, starting from 1"),
    limit: int = Query(50, ge=1, le=100, description="Items per page (max 100)")
):
    """
    Retrieves paginated alerts assigned to the current staff member with advanced filtering:
    - unread_only: Filters statuses to ['active', 'snoozed']
    - alert_category: 'vital' (clinical metrics) vs 'device' (hardware/network drops)
    - is_resolved: True (Solved entries) vs False (Unsolved entries)
    """
    # 1. Fetch patients assigned to the current user based on role partitions
    patient_query = select(Patient.id)
    if current_user.role == UserRole.NURSE:
        patient_query = patient_query.where(Patient.nurse_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        patient_query = patient_query.where(Patient.doctor_id == current_user.id)
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN]:
        patient_query = patient_query.join(User, Patient.user_id == User.id).where(
            User.organization_id == current_user.organization_id
        )
        
    patient_ids_result = await db.execute(patient_query)
    patient_ids = patient_ids_result.scalars().all()
    
    if not patient_ids:
        return {
            "total_count": 0, 
            "page": page,
            "limit": limit,
            "notifications": []
        }

    # 2. Build the Base Alert Filter Conditions Matrix
    # We construct this dynamically so both the COUNT query and the ROW query use identical rules
    base_filters = [Alert.patient_id.in_(patient_ids)]

    # Filter A: Unread Only Status Filter
    if unread_only:
        base_filters.append(Alert.status.in_(["active", "snoozed"]))

    # Filter B: Resolution State Filter (Protects against Boolean NULL/False validation gaps)
    if is_resolved is not None:
        if is_resolved:
            base_filters.append(Alert.is_resolved == True)
        else:
            base_filters.append(or_(Alert.is_resolved == False, Alert.is_resolved == None))

    # Filter C: Category Partitioning Filter
    if alert_category:
        device_types = ["Connectivity", "Band Status"]
        if alert_category.lower() == "device":
            base_filters.append(Alert.vital_type.in_(device_types))
        elif alert_category.lower() == "vital":
            base_filters.append(Alert.vital_type.not_in(device_types))

    # 3. Total Filtered Count Query (Crucial for computing accurate frontend pagination limits)
    count_query = select(func.count(Alert.id)).where(*base_filters)
    total_count_result = await db.execute(count_query)
    total_count = total_count_result.scalar() or 0
        
    # 2. Main Alert Query with Pagination Logic
    from sqlalchemy.orm import aliased
    Resolver = aliased(User)
    
    alert_query = (
        select(Alert, Patient.full_name, Patient.room_id, Resolver.full_name)
        .join(Patient, Alert.patient_id == Patient.id)
        .outerjoin(Resolver, Alert.resolved_by == Resolver.id)
        .where(Alert.patient_id.in_(patient_ids))
        .order_by(Alert.created_at.desc())
    )
    
    # --- PAGINATION CONSTRAINT MATH ---
    offset = (page - 1) * limit
    alert_query = alert_query.offset(offset).limit(limit)
    # ----------------------------------
        
    alerts_result = await db.execute(alert_query)
    rows = alerts_result.all()
    
    # 3. Fetch actions for the returned alerts
    alert_ids = [row[0].id for row in rows]
    action_map = {}
    if alert_ids:
        action_query = select(Action).where(Action.alert_id.in_(alert_ids)).order_by(Action.performed_at.asc())
        actions_result = await db.execute(action_query)
        for action in actions_result.scalars().all():
            action_map[action.alert_id] = action.action_type
            
    notifications = []
    for alert, patient_name, room_id, resolver_name in rows:
        notifications.append({
            "id": alert.id,
            "patient_id": alert.patient_id,
            "patient_name": patient_name,
            "room_id": room_id,
            "ward_id": alert.ward_id,
            "vital_type": alert.vital_type,
            "triggered_value": alert.triggered_value,
            "status": alert.status,
            "severity": alert.severity,
            "is_flagged": alert.is_flagged if alert.is_flagged is not None else False,
            "snoozed_until": alert.snoozed_until.isoformat() if alert.snoozed_until else None,
            "is_resolved": alert.is_resolved if alert.is_resolved is not None else False,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
            "resolved_by_name": resolver_name,
            "action_taken": action_map.get(alert.id),
        })
        
    return {
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "notifications": notifications
    }

@router.post("/{patient_id}/toggle-monitoring", status_code=status.HTTP_200_OK)
async def toggle_patient_monitoring(
    patient_id: int,
    payload: MonitoringToggleSchema,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    """
    Toggles transient monitoring states. Suspends warning generation flags 
    during diagnostic breaks or patient leaves without unlinking assets.
    """
    # 1. Retrieve the exact patient row entity
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Patient tracking record not found"
        )
        
    if patient.is_discharged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Operation invalid: Patient care track has already been formally discharged"
        )

    # 2. Update the updated table flag
    patient.is_monitoring_paused = payload.pause
    
    # 3. Handle Hot-Cache State Maintenance Transitions
    if payload.pause:
        # Prevent the 3-minute cron watchdog from tripping on upcoming missing pings
        await redis.delete(f"patient_active:{patient_id}")
        await redis.delete(f"patient_dead_state:{patient_id}")
        
        # Immediate cleanup of active flashing alerts on the frontend station panels
        await redis.delete(f"alert_lock:{patient_id}:Network")
        await redis.delete(f"alert_lock:{patient_id}:Connectivity")
        await redis.delete(f"alert_lock:{patient_id}:Band Status")
        
        # Broadcast the monitoring interruption notice down the SSE channel
        await redis.publish(
            f"patient:{patient_id}:stream",
            json.dumps({"patient_id": patient_id, "event": "MONITORING_PAUSED", "timestamp": datetime.utcnow().isoformat()})
        )
    else:
        # Instantly refresh the watchdog TTL buffer to allow the device 3 minutes to check back in
        await redis.setex(f"patient_active:{patient_id}", 180, "online")
        
        await redis.publish(
            f"patient:{patient_id}:stream",
            json.dumps({"patient_id": patient_id, "event": "MONITORING_RESUMED", "timestamp": datetime.utcnow().isoformat()})
        )

    await db.commit()
    return {
        "status": "success",
        "patient_id": patient_id,
        "is_monitoring_paused": patient.is_monitoring_paused
    }


@router.post("/{patient_id}/discharge", response_model=PatientDischargeResponseSchema)
async def discharge_and_archive_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    """
    Formally terminates the care cycle, updates legal compliance archive flags, 
    and frees up physical facility parameters (Beds, Rooms, Telemetry Hardware addresses).
    """
    # 1. Fetch patient record from database
    patient = await db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Patient tracking record not found"
        )
        
    if patient.is_discharged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Validation failed: Selected profile is already discharged and archived"
        )

    # 2. Assert Permanent Compliance and Archival States 
    patient.is_discharged = True
    patient.discharged_at = datetime.utcnow()
    patient.archive_status = "archived"  # Transitioning profile lifecycle to immutable reference track
    
    # 3. Asymmetric Asset Liberation Actions (Safely setting fields to None)
    patient.room_id = None            # Free up room/bed mapping for incoming active admissions
    patient.device_id = None          # Unbind physical telemetry hardware band for redevelopment
    patient.is_monitoring_paused = False # Reset pause parameter
    
    # 4. Flush Redis Realtime Hot State Elements
    await redis.delete(f"patient_active:{patient_id}")
    await redis.delete(f"patient_dead_state:{patient_id}")
    await redis.delete(f"alert_lock:{patient_id}:Network")
    await redis.delete(f"alert_lock:{patient_id}:Connectivity")
    await redis.delete(f"alert_lock:{patient_id}:Band Status")
    
    # 5. Broadcast Terminal Lifecycle Stream Notice to Station Viewports
    discharge_payload = {
        "patient_id": patient_id,
        "event": "DISCHARGED",
        "archive_status": "archived",
        "timestamp": datetime.utcnow().isoformat()
    }
    await redis.publish(f"patient:{patient_id}:stream", json.dumps(discharge_payload))

    # Commit transactions cleanly to PostgreSQL
    await db.commit()
    
    return {
        "status": "success",
        "message": "Patient lifecycle finalized: Care path closed, facility assets liberated, historical tracking archived.",
        "patient_id": patient_id,
        "archive_status": patient.archive_status,
        "is_discharged": patient.is_discharged
    }

@router.post("/readmit", status_code=status.HTTP_200_OK)
async def readmit_historical_patient(
    payload: PatientReadmitSchema,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    """
    Modifies an archived patient record directly to reactivate it for a new stay.
    Resets administrative lifecycle fields to active defaults while keeping identities intact.
    """
    # 1. Fetch the exact existing patient record row
    patient = await db.get(Patient, payload.archived_patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Archived patient record not found"
        )
        
    # Check if they are actually discharged/archived before allowing reactivation
    if patient.archive_status != "archived" or not patient.is_discharged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Operation rejected: This patient record profile is already active in the system."
        )

    # 2. UPDATE FIELDS IN PLACE (Reversing the discharge parameters)
    # Re-initializes them back into active tracking loops
    patient.is_discharged = False
    patient.archive_status = "active"
    patient.is_monitoring_paused = False
    patient.discharged_at = None       # Clear out past checkout timestamp metadata
    
    # Reset structural asset parameters to clear placeholders
    # They stay None here so clinicians can triage assignments using patch requests later
    # patient.room_id = None
    # patient.device_id = None
    # patient.doctor_id = None
    # patient.nurse_id = None
    
    # 3. Clean up Redis Hot Cache State Tracks
    # Delete past dead-state indicators so background workers know this row has returned to life
    await redis.delete(f"patient_dead_state:{payload.archived_patient_id}")
    
    # Clear any past flashing network alarm references remaining from their previous stay
    await redis.delete(f"alert_lock:{payload.archived_patient_id}:Network")
    await redis.delete(f"alert_lock:{payload.archived_patient_id}:Connectivity")
    await redis.delete(f"alert_lock:{payload.archived_patient_id}:Band Status")

    # 4. Commit updates to PostgreSQL
    await db.commit()
    
    return {
        "status": "success",
        "message": "Patient record reactivated successfully in place. Status moved back to active pending triage allocation.",
        "patient_id": patient.id,
        "archive_status": patient.archive_status,
        "is_discharged": patient.is_discharged
    }

# @router.post("/readmit", status_code=status.HTTP_201_CREATED)
# async def readmit_historical_patient(
#     payload: PatientReadmitSchema,
#     db: AsyncSession = Depends(get_db),
#     redis = Depends(get_redis),
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Clones demographic parameters from a past archived record to initialize a clean,
#     active care tracking sequence for a returning readmitted patient.
#     """
#     # 1. Fetch the past archived record
#     archived_patient = await db.get(Patient, payload.archived_patient_id)
#     if not archived_patient:
#         raise HTTPException(status_code=404, detail="Archived patient template reference not found")
        
#     if archived_patient.archive_status != "archived" or not archived_patient.is_discharged:
#         raise HTTPException(
#             status_code=400, 
#             detail="Operation rejected: This patient record is currently active and cannot be readmitted."
#         )

#     # 2. Safety Verification: Ensure the new hardware band address isn't already assigned elsewhere
#     device_in_use = await db.scalar(
#         select(Patient.id)
#         .where(Patient.device_id == payload.device_id)
#         .where(Patient.archive_status == "active")
#     )
#     if device_in_use:
#         raise HTTPException(status_code=400, detail="Hardware assignment collision: That band device is currently tied to an active ward bed.")

#     # 3. CLONE PROCESS: Create a fresh new care timeline entry
#     # This copies the immutable data fields but assigns a brand new database ID instance
#     new_stay_record = Patient(
#         # --- Base User Class Variables ---
#         full_name=archived_patient.full_name,
#         email=f"readmit_{payload.archived_patient_id}_{int(datetime.utcnow().timestamp())}@vitalvue.local", # Prevent login mapping collisions
#         phone_number=archived_patient.phone_number,
#         role=archived_patient.role,
#         organization_id=archived_patient.organization_id,
#         is_active=True,
        
#         # --- Patient Demographics Cloned ---
#         age=archived_patient.age,
#         gender=archived_patient.gender,
#         height=archived_patient.height,
#         weight=archived_patient.weight,
#         blood_group=archived_patient.blood_group,
#         alt_phone=archived_patient.alt_phone,
        
#         # --- Fresh Stay Assets Configuration ---
#         room_id=payload.room_id,
#         device_id=payload.device_id,
#         doctor_id=payload.doctor_id,
#         nurse_id=payload.nurse_id,
        
#         # --- Clean Active Lifecycle State Initializations ---
#         is_monitoring_paused=False,
#         is_discharged=False,
#         discharged_at=None,
#         archive_status="active"
#     )

#     db.add(new_stay_record)
#     await db.flush() # Flushes record state to generate the new transaction ID row inside PostgreSQL

#     # 4. Initialize Hot Cache Controls for the new ID
#     # Kicks off the active tracking window for our background 3-minute cron monitor loop
#     await redis.setex(f"patient_active:{new_stay_record.id}", 180, "online")
#     await redis.delete(f"patient_dead_state:{new_stay_record.id}")

#     await db.commit()
    
#     return {
#         "status": "success",
#         "message": "Patient readmission complete. Clean historical tracking lane generated successfully.",
#         "new_patient_id": new_stay_record.id,
#         "archive_status": new_stay_record.archive_status
#     }

@router.get("/lifecycle-registry", response_model=PaginatedPatientArchiveResponse)
async def get_patient_lifecycle_registry(
    view_type: str = Query("archived", description="Filter views: 'archived', 'paused', 'all'"),
    page: int = Query(1, ge=1, description="Page index parameter"),
    limit: int = Query(20, ge=1, le=100, description="Items per window slice"),
    search: Optional[str] = Query(None, description="Search filter string by name or internal ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exposes an administrative tracking registry to review historical archived checkouts,
    transient monitoring pause windows, or a systemic layout tracking path.
    """
    # 1. Base Query Construction with Safe Eager Joins to prevent MissingGreenlet errors
    stmt = (
        select(Patient)
        .options(joinedload(Patient.room)) # Pre-fetches room object data safely
    )

    # 2. Assert Dynamic View Filter Rules
    if view_type.lower() == "paused":
        # Monitoring suspended, but still active admissions inside beds
        stmt = stmt.where(Patient.is_monitoring_paused == True)
        stmt = stmt.where(Patient.is_discharged == False)
        stmt = stmt.where(Patient.archive_status == "active")
        
    elif view_type.lower() == "archived":
        # Formally checked-out lifecycle instances
        stmt = stmt.where(Patient.is_discharged == True)
        stmt = stmt.where(Patient.archive_status == "archived")
        
    elif view_type.lower() == "all":
        # Master trace view across all lifecycle variants (ignores limits)
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid view_type parameter. Allowed: 'archived', 'paused', 'all'"
        )

    # 3. Apply Multi-Tenant Organizational Role Security Boundaries
    if current_user.role == UserRole.NURSE:
        stmt = stmt.where(Patient.nurse_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        stmt = stmt.where(Patient.doctor_id == current_user.id)
    elif current_user.role in [UserRole.ORG_ADMIN, UserRole.MASTER_ADMIN]:
        stmt = stmt.where(User.organization_id == current_user.organization_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access unauthorized")

    # 4. Inject Search Modifier
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Patient.full_name.ilike(search_pattern),
                Patient.user_id.ilike(search_pattern)
            )
        )

    # 5. Extract Accurate Record Counters for Frontend Pagination Bars
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = await db.scalar(count_stmt) or 0
    total_pages = math.ceil(total_count / limit) if total_count > 0 else 1

    # 6. Apply Windows Limits and Offsets for target slicing
    offset = (page - 1) * limit
    stmt = stmt.order_by(Patient.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    patient_rows = result.scalars().all()

    # 7. Formulate Output Payload Arrays
    serialized_patients = []
    for p in patient_rows:
        serialized_patients.append({
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,
            # If discharged, room_id is None, so p.room evaluates cleanly to N/A without lazy-load exceptions
            "room_no": p.room.room_number if p.room else "Discharged/No Room",
            "device_id": p.device_id,
            "is_monitoring_paused": p.is_monitoring_paused,
            "is_discharged": p.is_discharged,
            "discharged_at": p.discharged_at,
            "archive_status": p.archive_status,
            "created_at": p.created_at
        })

    return {
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "patients": serialized_patients
    }
