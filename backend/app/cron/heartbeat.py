import json
from datetime import datetime
from argparse import Namespace
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db, get_redis
from app.models.user import Patient, User, Room
from app.models.organization import Ward
from app.models.vitals import Vitals, Alert
from app.services.analytics import calculate_risks

async def monitor_device_heartbeats():
    """
    Sweeps all active patients. If a patient hasn't called the ingest API 
    within the last 3 minutes, zero out their vitals and trigger a Disconnected alert.
    """
    async for db in get_db(): # Yield db session context safely
        redis = await get_redis()
        
        # 1. Fetch all patients currently registered in system
        # (Using selectinload or regular polymorphic query for properties)
        stmt = (
            select(Patient, User.created_at, Ward.id, Ward.name, Room.room_number, User.phone_number)
            .join(Room, Patient.room_id == Room.id)
            .join(Ward, Room.ward_id == Ward.id)
        )
        result = await db.execute(stmt)
        active_patients = result.all()
        
        for row in active_patients:
            patient, user_created_at, ward_id, ward_name, room_number, phone_number = row
            
            # 2. Check if device is tracking in Redis
            active_key = f"patient_active:{patient.id}"
            is_active = await redis.get(active_key)
            
            if not is_active:
                # Device HAS NOT reported in over 3 minutes!
                
                # Check if we already registered a disconnected state to avoid duplicate entries
                dead_lock_key = f"patient_dead_state:{patient.id}"
                already_dead = await redis.get(dead_lock_key)
                
                if not already_dead:
                    # A. Formulate a flat zeroed vital dictionary
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
                        "created_at": datetime.utcnow()
                    }
                    
                    # B. Calculate risks using zeros
                    vitals_obj = Namespace(**zero_vitals_dict)
                    calculated_data = calculate_risks(vitals_obj)
                    
                    # C. Commit flat zero vital row to DB history to flatline charts
                    stale_vitals = Vitals(**zero_vitals_dict, **calculated_data)
                    db.add(stale_vitals)
                    
                    # D. Generate Critical Network Disconnect Alert
                    alert_meta = {
                        "patient_id": patient.id,
                        "ward_name": ward_name,
                        "room_number": room_number,
                        "phone_number": phone_number,
                        "severity": "critical",
                        "vital_type": "Connectivity",
                        "triggered_value": "Network Disconnected"
                    }
                    
                    # Save alert object to database tracking
                    new_alert = Alert(
                        patient_id=patient.id,
                        ward_id=ward_id,
                        vital_type=alert_meta["vital_type"],
                        triggered_value=alert_meta["triggered_value"],
                        severity=alert_meta["severity"]
                    )
                    db.add(new_alert)
                    
                    # Lock the dead state so it doesn't repeatedly write zero rows every execution loop
                    await redis.set(dead_lock_key, "offline")
                    
                    # E. Publish real-time notifications via Redis Pub/Sub channels
                    alert_channel = f"patient:{patient.id}:alerts"
                    stream_channel = f"patient:{patient.id}:stream"
                    
                    await redis.publish(alert_channel, json.dumps(alert_meta))
                    await redis.publish(stream_channel, json.dumps({
                        "patient_id": patient.id,
                        "vitals": {**zero_vitals_dict, **calculated_data},
                        "ward_name": ward_name,
                        "room_number": room_number,
                        "timestamp": str(datetime.utcnow())
                    }))
                    
        await db.commit()