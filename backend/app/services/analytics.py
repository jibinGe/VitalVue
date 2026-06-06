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

    # --- NEWS2: Temperature (Using the +2.2 Adjusted Value) ---
    # Standard NEWS2 thresholds applied to the calibrated temp
    if vitals.temp <= 35.0: news2 += 3
    elif vitals.temp >= 39.1: news2 += 2
    elif vitals.temp <= 36.0 or vitals.temp >= 38.1: news2 += 1

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

# def check_baseline_deviations(vitals):
#     """
#     Triggers critical alerts for dashboard broadcast.
#     Removed 'message' to maintain Backend Model integrity.
#     """
#     alerts = []
    
#     # 1. SpO2 Critical (Hypoxia)
#     if vitals.spo2 < 90:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "SpO2",
#             "triggered_value": f"{vitals.spo2}%",
#             "severity": "critical"
#         })

#     # 2. Heart Rate (Tachycardia/Bradycardia)
#     if vitals.heart_rate > 140 or vitals.heart_rate < 40:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "Heart Rate",
#             "triggered_value": f"{vitals.heart_rate} bpm",
#             "severity": "critical"
#         })

#     # 3. Blood Pressure (Hypertensive Crisis / Shock)
#     if vitals.bp_systolic > 200 or vitals.bp_systolic < 80:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "Blood Pressure",
#             "triggered_value": f"{vitals.bp_systolic}/{vitals.bp_diastolic}",
#             "severity": "critical"
#         })

#     # 4. Temperature (Hyperpyrexia)
#     # if vitals.temp > 40.0 or vitals.temp < 35.0:
#     #     alerts.append({
#     #         "patient_id": vitals.patient_id,
#     #         "vital_type": "Temperature",
#     #         "triggered_value": f"{vitals.temp}°C",
#     #         "severity": "critical"
#     #     })

#     # 5. High NEWS2 Alert
#     # Using the result from the previous function if possible, or re-calculating
#     # For standalone use, we check the HR/SpO2 combination
#     if vitals.heart_rate > 120 and vitals.spo2 < 92:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "NEWS2 Status",
#             "triggered_value": "Critical Elevation",
#             "severity": "critical"
#         })

#     # 1. Battery Critical Alert (< 20%)
#     if vitals.battery_percent < 20:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "Device Battery",
#             "triggered_value": f"{vitals.battery_percent}%",
#             "severity": "warning"
#         })

#     # 2. Connection Lost Alert
#     if vitals.is_connected is False:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "Connectivity",
#             "triggered_value": "Disconnected",
#             "severity": "critical"
#         })

#     # 3. Band Removal Alert (Tamper Detection)
#     if vitals.is_removed is True:
#         alerts.append({
#             "patient_id": vitals.patient_id,
#             "vital_type": "Band Status",
#             "triggered_value": "Removed",
#             "severity": "critical"
#         })

#     return alerts


# def check_baseline_deviations(vitals):
#     """
#     Identifies clinical and hardware deviations.
#     Logic: If disconnected/removed, we return only that status.
#     If connected, we run clinical checks.
#     """
#     alerts = []
    
#     # 1. Hardware Status (High Priority)
#     if not getattr(vitals, 'is_connected', True):
#         return [{
#             "patient_id": vitals.patient_id,
#             "vital_type": "Connectivity",
#             "triggered_value": "Disconnected",
#             "severity": "critical"
#         }]

#     if getattr(vitals, 'is_removed', False):
#         return [{
#             "patient_id": vitals.patient_id,
#             "vital_type": "Band Status",
#             "triggered_value": "Removed",
#             "severity": "critical"
#         }]

#     # 2. Clinical Vital Checks (Only if hardware is OK)
#     if vitals.spo2 < 90:
#         alerts.append({"patient_id": vitals.patient_id, "vital_type": "SpO2", "triggered_value": f"{vitals.spo2}%", "severity": "critical"})

#     if vitals.heart_rate > 140 or vitals.heart_rate < 40:
#         alerts.append({"patient_id": vitals.patient_id, "vital_type": "Heart Rate", "triggered_value": f"{vitals.heart_rate} bpm", "severity": "critical"})

#     if vitals.bp_systolic > 200 or vitals.bp_systolic < 80:
#         alerts.append({"patient_id": vitals.patient_id, "vital_type": "Blood Pressure", "triggered_value": f"{vitals.bp_systolic}/{vitals.bp_diastolic}", "severity": "critical"})

#     return alerts



def check_baseline_deviations(vitals, user_created_at, ward_name, room_number, phone_number, last_failure_at=None):
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

    # 1. Hardware Status
    if not getattr(vitals, 'is_connected', True):
        return [{**meta, "vital_type": "Connectivity", "triggered_value": "Disconnected"}]

    if getattr(vitals, 'is_removed', False):
        return [{**meta, "vital_type": "Band Status", "triggered_value": "Removed"}]

    # 2. Mute Logic
    if (now - user_created_at) < timedelta(minutes=15) or \
       (last_failure_at and (now - last_failure_at) < timedelta(minutes=15)):
        return []

    # 3. Clinical Checks
    alerts = []
    if vitals.spo2 < 90:
        alerts.append({**meta, "vital_type": "SpO2", "triggered_value": f"{vitals.spo2}%"})
    if vitals.heart_rate > 140 or vitals.heart_rate < 40:
        alerts.append({**meta, "vital_type": "Heart Rate", "triggered_value": f"{vitals.heart_rate} bpm"})
    if vitals.bp_systolic > 200 or vitals.bp_systolic < 80:
        alerts.append({**meta, "vital_type": "Blood Pressure", "triggered_value": f"{vitals.bp_systolic}/{vitals.bp_diastolic}"})

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
        statuses["temperature_status"] = "Critical"
    elif vitals.temp >= 39.1:
        statuses["temperature_status"] = "Warning"
    elif vitals.temp <= 36.0 or vitals.temp >= 38.1:
        statuses["temperature_status"] = "Warning"
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
