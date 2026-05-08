def calculate_risks(vitals):
    """
    Business logic for NEWS2 and Risk Scores.
    """
    # Example NEWS2 Logic (Simplified)
    news2 = 0
    if vitals.heart_rate > 130 or vitals.heart_rate < 40: news2 += 3
    if vitals.spo2 < 91: news2 += 3
    
    # Example Stroke/Seizure logic based on BP and Heart Rate
    stroke_risk = "Low"
    if vitals.bp_systolic > 160 and vitals.heart_rate > 110:
        stroke_risk = "High"

    return {
        "news2_score": news2,
        "stroke_risk": stroke_risk,
        "af_warning": "Normal" if vitals.heart_rate < 120 else "Detected",
        "seizure_risk": "Low" # Add your logic here
    }

def check_baseline_deviations(vitals):
    """
    Returns a list of alerts. 
    REMOVED 'message' to prevent Backend TypeError.
    """
    alerts = []
    
    # SpO2 Critical Alert
    if vitals.spo2 < 90:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "SpO2",
            "triggered_value": f"{vitals.spo2}%",
            "severity": "critical"
        })

    # Heart Rate Critical Alert
    if vitals.heart_rate > 140 or vitals.heart_rate < 40:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Heart Rate",
            "triggered_value": f"{vitals.heart_rate} bpm",
            "severity": "critical"
        })

    # Blood Pressure Critical Alert
    if vitals.bp_systolic > 190 or vitals.bp_systolic < 80:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Blood Pressure",
            "triggered_value": f"{vitals.bp_systolic}/{vitals.bp_diastolic}",
            "severity": "critical"
        })

    # Temperature Critical Alert
    if vitals.temp > 40.0 or vitals.temp < 35.0:
        alerts.append({
            "patient_id": vitals.patient_id,
            "vital_type": "Temperature",
            "triggered_value": f"{vitals.temp}°C",
            "severity": "critical"
        })

    return alerts



