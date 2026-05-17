from datetime import datetime, timedelta

def calculate_risks(vitals):
    if getattr(vitals, 'is_removed', False) or not getattr(vitals, 'is_connected', True):
        return {"news2_score": 0, "stroke_risk": "N/A", "af_warning": "N/A", "seizure_risk": "N/A"}

    # --- NEWS2 SCORING ENGINE ---
    score = 0
    
    # 1. Respiration (Assume 0 if not measured by band, or use payload if available)
    resp = getattr(vitals, 'respiration_rate', 15) # Default 15 is normal
    if resp >= 25 or resp <= 8: score += 3
    elif resp >= 21: score += 2
    elif resp <= 11: score += 1

    # 2. SpO2
    if vitals.spo2 <= 91: score += 3
    elif vitals.spo2 <= 93: score += 2
    elif vitals.spo2 <= 95: score += 1

    # 3. Temp
    if vitals.temp <= 35.0: score += 3
    elif vitals.temp >= 39.1: score += 2
    elif vitals.temp <= 36.0 or vitals.temp >= 38.1: score += 1

    # 4. Systolic BP
    if vitals.bp_systolic <= 90 or vitals.bp_systolic >= 220: score += 3
    elif vitals.bp_systolic <= 100: score += 2
    elif vitals.bp_systolic <= 110: score += 1

    # 5. Heart Rate
    if vitals.heart_rate >= 131 or vitals.heart_rate <= 40: score += 3
    elif vitals.heart_rate >= 111 or vitals.heart_rate <= 50: score += 2
    elif vitals.heart_rate >= 91: score += 1

    # --- CLINICAL WARNINGS ---
    af_warning = "Normal"
    if vitals.heart_rate > 120: af_warning = "High Risk"
    
    # Stroke Risk Calculation (BP + HR)
    stroke_risk = "Low"
    if vitals.bp_systolic > 160 or vitals.bp_diastolic > 100:
        stroke_risk = "High" if vitals.heart_rate > 100 else "Moderate"

    return {
        "news2_score": score,
        # "stroke_risk": stroke_risk,
        "af_warning": af_warning,
        # "seizure_risk": "High" if vitals.movement > 8 and vitals.heart_rate > 120 else "Low"
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



