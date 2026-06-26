import json
import asyncio
from datetime import datetime, timedelta
from argparse import Namespace
from sqlalchemy import select, delete
from app.services.push import send_critical_push, staff_tokens_for_patient
from app.models.api_log import ApiLog
from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, get_redis
from app.models.user import Patient, User
from app.models.organization import Ward, Room
from app.models.vitals import Vitals
from app.models.clinical import Alert
from app.services.analytics import calculate_risks

async def monitor_device_heartbeats():
    """
    Sweeps active patients. If a device misses its 3-minute ingest payload window,
    programmatically sets is_connected to False, zeroes clinical metrics, skips
    default hardware alarms, and explicitly triggers a "Network Disconnected" event.
    """
    async for db in get_db():
        redis = await get_redis()
        
        # 1. Fetch active client registration layout
        stmt = (
            select(Patient, User.created_at, Ward.id, Ward.name, Room.room_number, User.phone_number)
            .join(Room, Patient.room_id == Room.id)
            .join(Ward, Room.ward_id == Ward.id)
            # --- RIGOROUS OPERATIONAL BOUNDS CHECK ---
            .where(Patient.is_monitoring_paused == False)
            .where(Patient.is_discharged == False)
            .where(Patient.archive_status == "active")
        )
        result = await db.execute(stmt)
        active_patients = result.all()
        
        for row in active_patients:
            patient, user_created_at, ward_id, ward_name, room_number, phone_number = row
            
            active_key = f"patient_active:{patient.id}"
            is_active = await redis.get(active_key)
            
            if not is_active:
                # Target dead state gate to prevent duplicate historical entries across runs
                dead_lock_key = f"patient_dead_state:{patient.id}"
                already_dead = await redis.get(dead_lock_key)
                
                if not already_dead:
                    # Capture exact string isoformat for JSON payload delivery
                    timestamp_str = datetime.utcnow().isoformat()
                    
                    # Resolve a safe device_id fallback string
                    safe_device_str = getattr(patient, 'device_id', 'OFFLINE')
                    if not safe_device_str:
                        safe_device_str = "OFFLINE"
                    
                    # A. Force connection flag to False, drop metrics, and insert concrete Option B schemas
                    zero_vitals_dict = {
                        "patient_id": patient.id,
                        "heart_rate": 0,
                        "spo2": 0,
                        "bp_systolic": 0,
                        "bp_diastolic": 0,
                        "temp": 0.0,
                        "movement": 0,
                        "is_connected": False,  
                        "is_removed": False,
                        "created_at": datetime.utcnow(),
                        
                        # --- OPTION B: MANDATORY DATA CONSTRAINTS FOR SCHEMAS ---
                        "device_id": safe_device_str,
                        "hrv_score": 0,
                        "stress_level": "N/A",
                        "sleep_pattern": "N/A",
                        "battery_percent": 0
                        # --------------------------------------------------------
                    }
                    
                    # B. Standardize baseline risk parameters against structural zero inputs
                    vitals_obj = Namespace(**zero_vitals_dict)
                    calculated_data = calculate_risks(vitals_obj)
                    
                    # C. Insert zero-floor record into the database
                    stale_vitals = Vitals(**zero_vitals_dict, **calculated_data)
                    db.add(stale_vitals)
                    
                    # D. ENFORCE SPECIFIC ALERTER: Network Disconnected (Bypassing default checks)
                    alert_meta = {
                        "patient_id": patient.id,
                        "ward_name": ward_name,
                        "room_number": room_number,
                        "phone_number": phone_number,
                        "severity": "critical",
                        "vital_type": "Connectivity",
                        "triggered_value": "Network Disconnected",
                        "timestamp": timestamp_str
                    }
                    
                    new_alert = Alert(
                        patient_id=patient.id,
                        ward_id=ward_id,
                        vital_type=alert_meta["vital_type"],
                        triggered_value=alert_meta["triggered_value"],
                        severity=alert_meta["severity"]
                    )
                    db.add(new_alert)
                    await db.flush() # Generate ID for the alert before pub/sub
                    
                    alert_meta["id"] = new_alert.id
                    alert_meta["alert_id"] = new_alert.id
                    
                    # Set network lock state to block duplicates and show correct view indicators
                    await redis.set(dead_lock_key, "offline")
                    await redis.setex(f"alert_lock:{patient.id}:Network", 300, "active")
                    
                    # E. Sanitize nested datetime variables for clean JSON serialization
                    serializable_vitals = {**zero_vitals_dict, **calculated_data}
                    serializable_vitals["created_at"] = timestamp_str 
                    
                    alert_channel = f"patient:{patient.id}:alerts"
                    stream_channel = f"patient:{patient.id}:stream"
                    
                    await redis.publish(alert_channel, json.dumps(alert_meta))

                    # Plan D (RUN-024): push the device-offline alert to the patient's staff.
                    _push_tokens = await staff_tokens_for_patient(db, patient.id)
                    if _push_tokens:
                        asyncio.create_task(asyncio.to_thread(send_critical_push, _push_tokens, alert_meta))

                    await redis.publish(stream_channel, json.dumps({
                        "patient_id": patient.id,
                        "vitals": serializable_vitals,
                        "ward_name": ward_name,
                        "room_number": room_number,
                        "timestamp": timestamp_str
                    }))

        # API-log retention (RUN-024): purge entries older than the configured window (default 48h).
        try:
            cutoff = datetime.utcnow() - timedelta(hours=settings.API_LOG_RETENTION_HOURS)
            await db.execute(delete(ApiLog).where(ApiLog.created_at < cutoff))
        except Exception as e:
            print(f"api_log purge error: {e}")

        await db.commit()
        


