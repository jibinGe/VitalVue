from datetime import datetime, timedelta

def calculate_risks(vitals):
    """
    Business logic for NEWS2 and clinical Risk Scores.
    Suppresses scores if the device is removed or disconnected to prevent false alarms.
    """
    # 1. Hardware Guard: If device is off-body or disconnected, return neutral risks
    # This prevents a 'Heart Rate: 0' (from a disconnect) from being treated as Cardiac Arrest.
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

    # AF Warning Rule: Instant trigger check based on clinical indicators or strict threshold
    is_af_detected = getattr(vitals, 'is_af_detected', False) or (vitals.heart_rate >= 140)

    return {
        "news2_score": news2,
        "stroke_risk": stroke_risk,
        "af_warning": "Detected" if is_af_detected else "Normal",
        "seizure_risk": seizure_risk
    }


def check_baseline_deviations(vitals, user_created_at, ward_name, room_number, phone_number, last_failure_at=None, wifi_cut_at=None, bluetooth_disconnected_at=None, hr_zero_since=None, vitals_history_duration_mins=0, vitals_history_counts=None):
    """
    Logic: Includes Ward Name, Room Number, and Phone Number.
    Clinical alerts are MUTED for 15 mins during stabilization/new registration.
    """
    now = datetime.utcnow()
    
    meta = {
        "patient_id": vitals.patient_id,
        "ward_name": ward_name,
        "room_number": room_number,
        "phone_number": phone_number,
        "severity": "critical"
    }

    # 1. Registration Grace Period: Clinical & Hardware rules are muted for the first 15 mins
    if (now - user_created_at) < timedelta(minutes=15) or \
       (last_failure_at and (now - last_failure_at) < timedelta(minutes=15)):
        return []

    # 2. AF Warning: Instant red alert, IVR call to Nurse and auto Doc flag message
    is_af_detected = getattr(vitals, 'is_af_detected', False) or (vitals.heart_rate >= 140)
    if is_af_detected and not getattr(vitals, 'is_removed', False) and getattr(vitals, 'is_connected', True):
        return [{
            **meta,
            "vital_type": "AF Warning",
            "triggered_value": "AF Detected",
            "actions": ["ivr_to_nurse", "whatsapp_doctor_flag"]
        }]

    # 3. Band Removal Alert (Tamper Detection): HR=0 >60 secs, send IVR to patient and Nursing station
    if vitals.heart_rate == 0 or getattr(vitals, 'is_removed', False):
        if hr_zero_since and (now - hr_zero_since) > timedelta(seconds=60):
            return [{
                **meta,
                "vital_type": "Band Status",
                "triggered_value": "Removed",
                "actions": ["ivr_to_patient", "ivr_to_nurse"]
            }]
        return []

    # 4. Connection Lost Alert (Internet WiFi Cut Rules)
    if getattr(vitals, 'is_wifi_cut', False) and wifi_cut_at:
        wifi_duration = now - wifi_cut_at
        if wifi_duration >= timedelta(minutes=10):
            return [{
                **meta,
                "vital_type": "Connectivity",
                "triggered_value": "WiFi Cut > 10 Mins",
                "actions": ["ivr_to_nursing_station"]
            }]
        elif wifi_duration >= timedelta(minutes=5):
            return [{
                **meta,
                "vital_type": "Connectivity",
                "triggered_value": "WiFi Cut > 5 Mins",
                "actions": ["device_alert"]
            }]
        return []

    # 5. Bluetooth Out of range or disconnect rules (> 60 secs trigger)
    if not getattr(vitals, 'is_connected', True) or getattr(vitals, 'is_ble_disconnected', False):
        if bluetooth_disconnected_at and (now - bluetooth_disconnected_at) > timedelta(seconds=60):
            if not getattr(vitals, 'is_marked_outbound', False):
                return [{
                    **meta,
                    "vital_type": "Connectivity",
                    "triggered_value": "Disconnected",
                    "actions": ["ivr_to_nurse_mark_outbound"]
                }]
        return []

    # 6. Clinical Vitals Evaluation (Requires min 10 min evaluation or history requirements)
    has_clinical_deviation = (
        vitals.spo2 < 90 or 
        vitals.heart_rate > 140 or vitals.heart_rate < 40 or 
        vitals.bp_systolic > 200 or vitals.bp_systolic < 80
    )

    if has_clinical_deviation:
        counts = vitals_history_counts or {"hr": 0, "bp": 0, "hrv": 0, "spo2": 0}
        meets_history = (
            counts.get("hr", 0) >= 8 and 
            counts.get("bp", 0) >= 2 and 
            counts.get("hrv", 0) >= 1 and 
            counts.get("spo2", 0) >= 1
        )
        if vitals_history_duration_mins >= 10.0 or meets_history:
            alerts = []
            if vitals.spo2 < 90:
                alerts.append({**meta, "vital_type": "SpO2", "triggered_value": f"{vitals.spo2}%", "actions": ["ivr_to_nurse", "whatsapp_doctor_live_url"]})
            if vitals.heart_rate > 140 or vitals.heart_rate < 40:
                alerts.append({**meta, "vital_type": "Heart Rate", "triggered_value": f"{vitals.heart_rate} bpm", "actions": ["ivr_to_nurse", "whatsapp_doctor_live_url"]})
            if vitals.bp_systolic > 200 or vitals.bp_systolic < 80:
                alerts.append({**meta, "vital_type": "Blood Pressure", "triggered_value": f"{vitals.bp_systolic}/{vitals.bp_diastolic}", "actions": ["ivr_to_nurse", "whatsapp_doctor_live_url"]})
            return alerts

    return []


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
    elif vitals.heart_rate >= 91:
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
        
    # BP Status (Systolic only for standard warning limits)
    if vitals.bp_systolic <= 90 or vitals.bp_systolic >= 220:
        statuses["bp_status"] = "Critical"
    elif vitals.bp_systolic <= 110:
        statuses["bp_status"] = "Warning"
    else:
        statuses["bp_status"] = "Stable"
        
    # Temperature Status
    if vitals.temp <= 35.0:
        statuses["temperature_status"] = "Stable"
    elif vitals.temp >= 39.1:
        statuses["temperature_status"] = "Stable" # Temprorry because sensor is not working as expected
    elif vitals.temp <= 36.0 or vitals.temp >= 38.1:
        statuses["temperature_status"] = "Stable"
    else:
        statuses["temperature_status"] = "Stable" 
        
    return statuses


def get_patient_overall_status(vitals, vital_statuses=None, calculated_data=None):
    """
    Derives the patient's single overall triage status (Critical / Warning / Stable)
    from all per-vital statuses and the NEWS2 score.
    Disconnected / removed devices are treated as Critical so staff are alerted.
    """
    is_removed = getattr(vitals, 'is_removed', False)
    is_connected = getattr(vitals, 'is_connected', True)
    
    # Device failure is always escalated to Critical
    if is_removed or not is_connected:
        return "Critical"
    
    if vital_statuses is None:
        vital_statuses = get_vital_statuses(vitals)
    
    all_statuses = list(vital_statuses.values())
    
    # Any single critical vital → whole patient is Critical
    if "Critical" in all_statuses:
        return "Critical"
    
    # NEWS2 >= 7 → Critical
    news2 = calculated_data.get("news2_score", 0) if calculated_data else getattr(vitals, 'news2_score', 0)
    if news2 >= 7:
        return "Critical"
    
    # Any warning vital or NEWS2 5-6 → Warning
    if "Warning" in all_statuses or (news2 >= 5):
        return "Warning"
    
    return "Stable"