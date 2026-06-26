"""Canonical patient comorbidity list (org-hierarchy v2). Server-driven so the app never
hardcodes the set twice — exposed via GET /api/v1/discovery/comorbidities."""

COMORBIDITIES = [
    "Diabetes",
    "Hypertension",
    "Dyslipidemia",
    "COPD",
    "Asthma",
    "Obstructive Airway Disease (OAD)",
    "Coronary Artery Disease",
    "Congestive Heart Failure",
    "Hypothyroidism/Hyperthyroidism",
    "Rheumatoid Arthritis",
    "Osteoarthritis",
    "Chronic Kidney Disease",
    "Seizure",
    "Psychiatric issues",
    "Malignancy",
    "Chronic Liver Disease",
]

_SET = set(COMORBIDITIES)


def validate_comorbidities(items):
    """Keep only recognised comorbidities (drops unknown/garbage); None -> []."""
    if not items:
        return []
    return [c for c in items if c in _SET]
