from datetime import datetime, timedelta

def calculate_risks(vitals):
    """
    Business logic for NEWS2 and clinical Risk Scores.
    Suppresses scores if the device is removed or disconnected to prevent false alarms.
    """
    if getattr(vitals, 'is_removed', False) or not getattr(vitals, 'is_connected', True):
        return {
            "news2_score": 0,
            "stroke_risk": "N/A",
            "af_warning": "N/A",
            "seizure_risk": "N/A"
        }

    news2 = 0
    
    # --- NEWS2: Heart Rate ---
    if vitals.heart_rate >= 131 or vitals.heart_rate <= 40: news2 += 3
    elif vitals.heart_rate >= 111 or vitals.heart_rate <= 50: news2 += 2
    elif vitals.heart_rate >= 91: news2 += 1

    # --- NEWS2: SpO2 ---
    if vitals.spo2 <= 91: news2 += 3
    elif vitals.spo2 <= 93: news2 += 2
    elif vitals.spo2 <= 95: news2 += 1

    # --- NEWS2: Systolic BP ---
    if vitals.bp_systolic <= 90 or vitals.bp_systolic >= 220: news2 += 3
    elif vitals.bp_systolic <= 100: news2 += 2
    elif vitals.bp_systolic <= 110: news2 += 1

    # --- Advanced Risk Logic ---
    stroke_risk = "Low"
    if vitals.bp_systolic > 160 and vitals.heart_rate > 110:
        stroke_risk = "High"
    elif vitals.bp_systolic > 140:
        stroke_risk = "Moderate"

    seizure_risk = "Low"
    if vitals.movement > 8 and vitals.heart_rate > 120:
        seizure_risk = "High"

    return {
        "news2_score": news2,
        "stroke_risk": stroke_risk,
        "af_warning": "Normal" if vitals.heart_rate < 120 else "Detected",
        "seizure_risk": seizure_risk
    }


def check_baseline_deviations(
    vitals, 
    user_created_at, 
    ward_name, 
    room_number, 
    phone_number, 
    last_failure_at=None, 
    disconnected_since=None
):
    """
    Evaluates baseline deviations.
    - Suppresses clinical alerts if vitals are <= 0 (invalid/sensor drop/zeroed).
    - Mutes clinical alerts for 15 mins post-registration and post-reconnection.
    - Sends Hardware Connectivity alert only if disconnected for >= 10 mins.
    """
    now = datetime.utcnow()
    
    meta = {
        "patient_id": vitals.patient_id,
        "ward_name": ward_name,
        "room_number": room_number,
        "phone_number": phone_number,
        "severity": "critical"
    }

    is_connected = getattr(vitals, 'is_connected', True)
    is_removed = getattr(vitals, 'is_removed', False)

    # 1. Hardware Status Checks
    if not is_connected:
        if disconnected_since and (now - disconnected_since) >= timedelta(minutes=10):
            return [{**meta, "vital_type": "Connectivity", "triggered_value": "Disconnected"}]
        return []

    if is_removed:
        return [{**meta, "vital_type": "Band Status", "triggered_value": "Removed"}]

    # 2. 15-Minute Mute Logic (New registration & Stabilization)
    if (now - user_created_at) < timedelta(minutes=15) or \
       (last_failure_at and (now - last_failure_at) < timedelta(minutes=15)):
        return []

    # 3. Clinical Checks (Trigger only if vital values are strictly > 0)
    alerts = []
    
    # SpO2 Check (> 0 and < 90)
    spo2 = getattr(vitals, 'spo2', 0)
    if spo2 > 0 and spo2 < 90:
        alerts.append({**meta, "vital_type": "SpO2", "triggered_value": f"{spo2}%"})

    # Heart Rate Check (> 0 and ( > 140 or < 40 ))
    hr = getattr(vitals, 'heart_rate', 0)
    if hr > 0 and (hr > 140 or hr < 40):
        alerts.append({**meta, "vital_type": "Heart Rate", "triggered_value": f"{hr} bpm"})

    # Blood Pressure Check (Both systolic and diastolic must be > 0)
    sys = getattr(vitals, 'bp_systolic', 0)
    dia = getattr(vitals, 'bp_diastolic', 0)
    if sys > 0 and dia > 0:
        if (sys > 200 or sys < 80) or (dia > 120 or dia < 50):
            alerts.append({
                **meta, 
                "vital_type": "Blood Pressure", 
                "triggered_value": f"{sys}/{dia}"
            })

    return alerts

def get_vital_statuses(vitals):
    """
    Returns the visual status for each vital sign based on NEWS2 thresholds.
    If the device is removed or disconnected, returns Stable to avoid UI false alarms.
    """
    if getattr(vitals, 'is_removed', False) or not getattr(vitals, 'is_connected', True):
        return {
            "heart_rate_status": "Stable",
            "spo2_status": "Stable",
            "bp_status": "Stable",
            "temperature_status": "Stable",
        }
    
    statuses = {}
    
    # Heart Rate Status
    if vitals.heart_rate >= 131 or vitals.heart_rate <= 40:
        statuses["heart_rate_status"] = "Critical"
    elif vitals.heart_rate >= 111 or vitals.heart_rate <= 50:
        statuses["heart_rate_status"] = "Warning"
    else:
        statuses["heart_rate_status"] = "Stable"
        
    # SpO2 Status
    if vitals.spo2 <= 91:
        statuses["spo2_status"] = "Critical"
    elif vitals.spo2 <= 95:
        statuses["spo2_status"] = "Warning"
    else:
        statuses["spo2_status"] = "Stable"
        
    # BP Status
    if (vitals.bp_systolic <= 90 or vitals.bp_systolic >= 220) or \
       (vitals.bp_diastolic <= 50 or vitals.bp_diastolic >= 120):
        statuses["bp_status"] = "Critical"
    elif (vitals.bp_systolic <= 110) or (vitals.bp_diastolic <= 60):
        statuses["bp_status"] = "Warning"
    else:
        statuses["bp_status"] = "Stable"
        
    # Temperature Status
    if vitals.temp <= 35.0:
        statuses["temperature_status"] = "Stable"
    elif vitals.temp >= 39.1:
        statuses["temperature_status"] = "Warning"
    else:
        statuses["temperature_status"] = "Stable" 
        
    return statuses


def get_patient_overall_status(vitals, vital_statuses=None, calculated_data=None, disconnected_since=None):
    """
    Derives the patient's single overall triage status.
    Device disconnection is escalated to Critical ONLY if it exceeds 10 minutes.
    """
    is_removed = getattr(vitals, 'is_removed', False)
    is_connected = getattr(vitals, 'is_connected', True)
    now = datetime.utcnow()
    
    # Band removed is immediately Critical
    if is_removed:
        return "Critical"

    # Disconnected escalation check
    if not is_connected:
        if disconnected_since and (now - disconnected_since) >= timedelta(minutes=10):
            return "Critical"
        return "Warning"  # Or "Stable" depending on your intermediate display requirement
    
    if vital_statuses is None:
        vital_statuses = get_vital_statuses(vitals)
    
    all_statuses = list(vital_statuses.values())
    
    if "Critical" in all_statuses:
        return "Critical"
    
    news2 = calculated_data.get("news2_score", 0) if calculated_data else getattr(vitals, 'news2_score', 0)
    if news2 >= 7:
        return "Critical"
    
    if "Warning" in all_statuses or (news2 >= 5):
        return "Warning"
    
    return "Stable"