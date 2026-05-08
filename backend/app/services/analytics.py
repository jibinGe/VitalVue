def calculate_risks(vitals):
    """
    Advanced Business logic for NEWS2 and clinical Risk Scores.
    """
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

    # --- NEWS2: Temperature ---
    if vitals.temp <= 35.0: news2 += 3
    elif vitals.temp >= 39.1: news2 += 2
    elif vitals.temp <= 36.0 or vitals.temp >= 38.1: news2 += 1

    # --- Stroke Risk Logic ---
    # High BP + High HR + Low HRV is a strong indicator
    stroke_risk = "Low"
    if vitals.bp_systolic > 160 and vitals.heart_rate > 110:
        stroke_risk = "High"
    elif vitals.bp_systolic > 140:
        stroke_risk = "Moderate"

    # --- Seizure Risk Logic ---
    # Sudden spikes in movement + High HR + Temperature instability
    seizure_risk = "Low"
    if vitals.movement > 8 and vitals.heart_rate > 120:
        seizure_risk = "High"
    elif vitals.temp > 39.0:
        seizure_risk = "Moderate"

    return {
        "news2_score": news2,
        "stroke_risk": stroke_risk,
        "af_warning": "Normal" if vitals.heart_rate < 120 else "Detected",
        "seizure_risk": seizure_risk
    }

def check_baseline_deviations(vitals):
    """
    Triggers critical alerts for dashboard broadcast.
    Removed 'message' to maintain Backend Model integrity.
    """
    alerts = []
    
    # 1. SpO2 Critical (Hypoxia)
    if vitals.spo2 < 90:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "SpO2",
            "triggered_value": f"{vitals.spo2}%",
            "severity": "critical"
        })

    # 2. Heart Rate (Tachycardia/Bradycardia)
    if vitals.heart_rate > 140 or vitals.heart_rate < 40:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Heart Rate",
            "triggered_value": f"{vitals.heart_rate} bpm",
            "severity": "critical"
        })

    # 3. Blood Pressure (Hypertensive Crisis / Shock)
    if vitals.bp_systolic > 200 or vitals.bp_systolic < 80:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Blood Pressure",
            "triggered_value": f"{vitals.bp_systolic}/{vitals.bp_diastolic}",
            "severity": "critical"
        })

    # 4. Temperature (Hyperpyrexia)
    if vitals.temp > 40.0 or vitals.temp < 35.0:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Temperature",
            "triggered_value": f"{vitals.temp}°C",
            "severity": "critical"
        })

    # 5. High NEWS2 Alert
    # Using the result from the previous function if possible, or re-calculating
    # For standalone use, we check the HR/SpO2 combination
    if vitals.heart_rate > 120 and vitals.spo2 < 92:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "NEWS2 Status",
            "triggered_value": "Critical Elevation",
            "severity": "critical"
        })

    # 1. Battery Critical Alert (< 20%)
    if vitals.battery_percent < 20:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Device Battery",
            "triggered_value": f"{vitals.battery_percent}%",
            "severity": "warning"
        })

    # 2. Connection Lost Alert
    if vitals.is_connected is False:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Connectivity",
            "triggered_value": "Disconnected",
            "severity": "critical"
        })

    # 3. Band Removal Alert (Tamper Detection)
    if vitals.is_removed is True:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Band Status",
            "triggered_value": "Removed",
            "severity": "critical"
        })

    return alerts


