import requests
import time
import random

# Configuration
API_URL = "https://vitalvue-api.genesysailabs.com/api/v1/vitals/ingest"

# Mapping: { Patient_ID: "Device_ID" }
PATIENT_CONFIG = {
    9:  "BAND-001",
    13: "BAND-002",
    # 11: "BAND-003",
    # 12: "BAND-004"
}

def generate_vitals(p_id, d_id):
    """Generates data for a specific patient/device pair"""
    return {
        "patient_id": p_id,
        "device_id": d_id,
        "heart_rate": random.randint(70, 145),
        "spo2": round(random.uniform(88.0, 99.0), 1),
        "temp": round(random.uniform(20, 39.0), 1),
        "bp_systolic": random.randint(110, 175),
        "bp_diastolic": random.randint(70, 110),
        "hrv_score": random.randint(30, 60),
        "stress_level": random.choice(["Low", "Moderate", "High"]),
        "movement": random.randint(1, 10),
        "sleep_pattern": "6h 30m",
        "battery_percent": random.randint(20, 95),
        "is_connected": True,
        "is_removed": False
    }

print(f"🚀 Starting Vitalvue Multi-Device Simulator...")
print(f"Monitoring {len(PATIENT_CONFIG)} devices...")

while True:
    # Iterate through the dictionary items (ID and Device)
    for p_id, d_id in PATIENT_CONFIG.items():
        data = generate_vitals(p_id, d_id)
        try:
            response = requests.post(API_URL, json=data, timeout=5)
            if response.status_code == 200:
                print(f"✅ [Patient {p_id} | {d_id}] HR:{data['heart_rate']} SpO2:{data['spo2']}%")
            else:
                print(f"❌ [Patient {p_id}] Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ [Patient {p_id}] Connection failed: {e}")
        
        # Stagger requests by 0.2s
        time.sleep(0.2) 
    
    print("-" * 50)
    time.sleep(2) # Send next batch in 2 seconds