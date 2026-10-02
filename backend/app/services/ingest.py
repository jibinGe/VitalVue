"""Shared vitals ingest pipeline — one code path for every device type.

BLE bands reach it through POST /vitals/bulk-ingest (via the mobile app); Veepoo 4G watches
reach it through the MQTT worker. Calibration, risk scores, alerts, live stream, push and the
online heartbeat therefore behave identically for both.
"""
import asyncio
import json
from argparse import Namespace
from datetime import datetime
from typing import Optional, Sequence

from sqlalchemy import or_, select

from app.models.clinical import Alert
from app.models.organization import Bed, Room, Ward
from app.models.user import Patient, User
from app.models.vitals import PatientCalibration, Vitals
from app.devices import event_log
from app.services.alerts import send_critical_alert
from app.services.analytics import calculate_risks, check_baseline_deviations, get_patient_overall_status, get_vital_statuses
from app.services.push import send_critical_push, staff_tokens_for_patient

# Seconds a patient counts as "online" after a reading (BLE bands stream continuously).
DEFAULT_ACTIVE_TTL = 65


async def ingest_readings(
    db,
    redis,
    payloads: Sequence,
    background_tasks=None,
    source: str = "ble",
    measured_at: Optional[Sequence[Optional[datetime]]] = None,
    active_ttl: int = DEFAULT_ACTIVE_TTL,
) -> dict:
    """Store and evaluate a batch of VitalIngestSchema readings.

    source       "ble" (mobile app) or "mqtt" (4G watch), stored on each vitals row
    measured_at  optional per-reading measurement time (4G data arrives minutes late); defaults
                 to now, which is what the BLE path has always used
    active_ttl   how long the patient counts as online afterwards; 4G watches upload every few
                 minutes, so the worker passes (upload interval + grace)
    background_tasks  FastAPI BackgroundTasks when called from a request; otherwise WhatsApp
                 alerts are scheduled on the running event loop
    """
    if not payloads:
        return {"status": "success", "processed_count": 0}

    patient_ids = list({p.patient_id for p in payloads})

    # 1. Batch Fetch Patient Context
    patient_res = await db.execute(
        select(Patient).where(Patient.id.in_(patient_ids))
    )
    patients_map = {p.id: p for p in patient_res.scalars().all()}

    # Batch Fetch Calibration Offsets
    cal_res = await db.execute(
        select(PatientCalibration).where(PatientCalibration.patient_id.in_(patient_ids))
    )
    cal_map = {c.patient_id: c for c in cal_res.scalars().all()}

    # Batch Fetch Room and Bed Context
    room_ids = [p.room_id for p in patients_map.values() if p.room_id]
    bed_ids = [p.bed_id for p in patients_map.values() if p.bed_id]

    rooms_map = {}
    if room_ids:
        r_res = await db.execute(select(Room).where(Room.id.in_(room_ids)))
        rooms_map = {r.id: r for r in r_res.scalars().all()}

    beds_map = {}
    if bed_ids:
        b_res = await db.execute(select(Bed).where(Bed.id.in_(bed_ids)))
        beds_map = {b.id: b for b in b_res.scalars().all()}

    ward_ids = [r.ward_id for r in rooms_map.values() if r.ward_id] + [b.ward_id for b in beds_map.values() if b.ward_id]
    wards_map = {}
    if ward_ids:
        w_res = await db.execute(select(Ward).where(Ward.id.in_(ward_ids)))
        wards_map = {w.id: w for w in w_res.scalars().all()}

    # Batch Fetch Assigned Doctors for WhatsApp Alerts
    doctor_ids = [p.doctor_id for p in patients_map.values() if p.doctor_id]
    doctors_map = {}
    if doctor_ids:
        d_res = await db.execute(select(User).where(User.id.in_(doctor_ids)))
        doctors_map = {d.id: d for d in d_res.scalars().all()}

    # 2. Most Recent Failure Timestamp per patient (for Stabilization Mute).
    # One LIMIT 1 lookup per patient on the ix_vitals_patient_failures partial index — never
    # read a patient's whole disconnect history (100k+ rows) just to find the newest one.
    last_failure_map = {}
    for p_id in patient_ids:
        last_failure = (await db.execute(
            select(Vitals.created_at)
            .where(Vitals.patient_id == p_id)
            .where(or_(Vitals.is_connected == False, Vitals.is_removed == True))
            .order_by(Vitals.created_at.desc())
            .limit(1)
        )).scalar_one_or_none()
        if last_failure is not None:
            last_failure_map[p_id] = last_failure

    new_vitals_list = []
    processed_count = 0
    now = datetime.utcnow()
    timestamp_str = now.isoformat()

    # 3. Process Each Ingest Record
    for index, payload in enumerate(payloads):
        patient = patients_map.get(payload.patient_id)
        if not patient:
            continue
        # Reading time: the measurement time when the device supplies it, otherwise now.
        reading_at = (measured_at[index] if measured_at and measured_at[index] else None) or now
        reading_at_str = reading_at.isoformat()

        ward_id, ward_name, room_number = None, None, None
        if patient.room_id and patient.room_id in rooms_map:
            room = rooms_map[patient.room_id]
            room_number = room.room_number
            ward = wards_map.get(room.ward_id)
            if ward:
                ward_id, ward_name = ward.id, ward.name
        elif patient.bed_id and patient.bed_id in beds_map:
            bed = beds_map[patient.bed_id]
            room_number = bed.bed_no
            ward = wards_map.get(bed.ward_id)
            if ward:
                ward_id, ward_name = ward.id, ward.name

        cal = cal_map.get(patient.id)
        vital_dict = payload.model_dump(
            exclude={"heart_rate_status", "spo2_status", "bp_status", "temperature_status"}
        )

        # Hardware Safeguard: Zero out metrics if disconnected or removed
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

        # Early Warning Score & Clinical Logic
        vitals_obj = Namespace(**vital_dict)
        calculated_data = calculate_risks(vitals_obj)

        new_vitals = Vitals(**vital_dict, **calculated_data, source=source, created_at=reading_at)
        new_vitals_list.append(new_vitals)

        # Disconnection Duration Check (> 10 mins)
        disconn_key = f"disconnected_since:{payload.patient_id}"
        disconnected_since = None
        if not payload.is_connected:
            disconn_str = await redis.get(disconn_key)
            if not disconn_str:
                await redis.set(disconn_key, timestamp_str)
                disconnected_since = now
            else:
                disconnected_since = datetime.fromisoformat(
                    disconn_str.decode() if isinstance(disconn_str, bytes) else disconn_str
                )
        else:
            await redis.delete(disconn_key)

        # Deviation and Alert Evaluation
        last_failure_at = last_failure_map.get(payload.patient_id)
        detected_alerts = check_baseline_deviations(
            vitals=new_vitals,
            user_created_at=patient.created_at,
            ward_name=ward_name,
            room_number=room_number,
            phone_number=patient.phone_number,
            last_failure_at=last_failure_at,
            disconnected_since=disconnected_since
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
                    # Live alert to the dashboards' /stream subscriptions (restored; lost in 258c8b9)
                    await redis.publish(f"patient:{payload.patient_id}:alerts", json.dumps(alert_data))

                    _push_tokens = await staff_tokens_for_patient(db, payload.patient_id)
                    if _push_tokens:
                        asyncio.create_task(asyncio.to_thread(send_critical_push, _push_tokens, alert_data))

        # Reset Hardware Locks on Reconnect
        await redis.delete(f"patient_dead_state:{payload.patient_id}")
        await redis.delete(f"alert_lock:{payload.patient_id}:Network")
        if payload.is_connected and not payload.is_removed:
            await redis.delete(f"alert_lock:{payload.patient_id}:Connectivity")
            await redis.delete(f"alert_lock:{payload.patient_id}:Band Status")

        # Visual Status Mapping & Overall Triage
        serializable_vitals = {**vital_dict, **calculated_data}
        vital_statuses = get_vital_statuses(new_vitals)
        serializable_vitals.update(vital_statuses)

        patient_status = get_patient_overall_status(
            new_vitals,
            vital_statuses,
            calculated_data,
            disconnected_since=disconnected_since
        )

        # Trigger WhatsApp Alert via Background Tasks
        if patient_status in ["Warning", "Critical"]:
            wa_lock_key = f"whatsapp_alert_lock:{payload.patient_id}:{patient_status}"
            is_wa_locked = await redis.get(wa_lock_key)

            if not is_wa_locked:
                doctor = doctors_map.get(patient.doctor_id)
                if doctor and doctor.phone_number:
                    location_string = f"{ward_name or 'N/A'} - Room {room_number or 'N/A'}"
                    hr_val = str(int(float(new_vitals.heart_rate))) if new_vitals.heart_rate else "N/A"
                    spo2_val = f"{float(new_vitals.spo2):.1f}%" if new_vitals.spo2 else "N/A"
                    bp_val = f"{new_vitals.bp_systolic}/{new_vitals.bp_diastolic}" if (new_vitals.bp_systolic and new_vitals.bp_diastolic) else "N/A"

                    wa_kwargs = dict(
                        doctor_phone=doctor.phone_number,
                        patient_name=patient.full_name,
                        location=location_string,
                        hr_value=hr_val,
                        spo2_value=spo2_val,
                        bp_value=bp_val,
                        patient_id=str(payload.patient_id)
                    )
                    if background_tasks is not None:
                        background_tasks.add_task(send_critical_alert, **wa_kwargs)
                    else:
                        asyncio.create_task(send_critical_alert(**wa_kwargs))
                    await redis.setex(wa_lock_key, 900, "active")

        event_log.reading(source, payload.device_id, payload.patient_id, reading_at, vital_dict,
                          calculated_data.get("news2_score"), patient_status)

        # 4G watches send one vital per message: a 0 there means "not in this reading", so the
        # live stream carries null and the dashboards keep showing each vital's last value.
        # BLE readings are always complete and are streamed exactly as before.
        if source != "ble" and payload.is_connected and not payload.is_removed:
            for key in ("heart_rate", "spo2", "temp", "bp_systolic", "bp_diastolic", "hrv_score", "movement"):
                if not serializable_vitals.get(key):
                    serializable_vitals[key] = None

        # Stream telemetry to the dashboards' /stream subscriptions (restored; lost in 258c8b9)
        serializable_vitals["created_at"] = reading_at_str
        serializable_vitals["source"] = source
        stream_payload = json.dumps({
            "patient_id": payload.patient_id,
            "patient_status": patient_status,
            "vitals": serializable_vitals,
            "ward_name": ward_name,
            "room_number": room_number,
            "timestamp": reading_at_str
        })
        await redis.publish(f"patient:{payload.patient_id}:stream", stream_payload)

        # Maintain online heartbeat TTL in Redis
        await redis.setex(f"patient_active:{payload.patient_id}", active_ttl, "online")

        processed_count += 1

    # 4. Batch Commit Telemetry
    if new_vitals_list:
        db.add_all(new_vitals_list)
        await db.commit()

    return {"status": "success", "processed_count": processed_count}
