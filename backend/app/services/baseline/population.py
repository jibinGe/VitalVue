"""Population template (Mode 1) and per-vital engine settings.

Every number here is a phase-1 default awaiting clinical sign-off:
  low / high      population normal range (None = open-ended / not defined in the spec)
  bad             which direction is deterioration: "up", "down" or "both"
  mad_floor       minimum variability used for z-scores, so a very flat baseline can't turn a
                  small change into a huge score (same unit as the vital)
  critical_low/high  today's fixed critical thresholds (mirrors check_baseline_deviations)
"""

# Observations are 10-minute windows; 12 of them = the 2-hour learning phase.
WINDOW_MINUTES = 10
LEARNING_OBSERVATIONS = 12
ADAPTIVE_AFTER_HOURS = 24
ROLLING_BUFFER = 12
# A monitoring gap longer than this starts a new episode (e.g. discharge + readmit).
NEW_EPISODE_GAP_HOURS = 6

# Status bands on |robust z| in the "bad" direction.
STATUS_BANDS = [(4.0, "Severe deviation"), (3.0, "Moderate deviation"), (2.0, "Mild deviation")]
STATUS_LEVEL = {
    "Unknown": -1, "Normal": 0, "Mild deviation": 1, "Moderate deviation": 2,
    "Severe deviation": 3, "Critical": 4,
}

# Activity state from the band's movement index (1–10).
RESTING_MAX_MOVEMENT = 3
ACTIVE_MIN_MOVEMENT = 7

VITALS = {
    "hr":     {"label": "Heart Rate",  "unit": "bpm",  "low": 60,  "high": 100, "bad": "both", "mad_floor": 3,
               "critical_low": 40, "critical_high": 140},
    "spo2":   {"label": "SpO2",        "unit": "%",    "low": 94,  "high": None, "bad": "down", "mad_floor": 1,
               "critical_low": 90, "critical_high": None},
    "sbp":    {"label": "Systolic BP", "unit": "mmHg", "low": 100, "high": 140, "bad": "both", "mad_floor": 5,
               "critical_low": 80, "critical_high": 200},
    "dbp":    {"label": "Diastolic BP", "unit": "mmHg", "low": 60, "high": 90,  "bad": "both", "mad_floor": 4,
               "critical_low": 50, "critical_high": 120},
    "map":    {"label": "MAP",         "unit": "mmHg", "low": 65,  "high": None, "bad": "down", "mad_floor": 4,
               "critical_low": None, "critical_high": None},
    "hrv":    {"label": "HRV",         "unit": "ms",   "low": None, "high": None, "bad": "down", "mad_floor": 5,
               "critical_low": None, "critical_high": None},
    "stress": {"label": "Stress",      "unit": "",     "low": None, "high": None, "bad": "up", "mad_floor": 5,
               "critical_low": None, "critical_high": None},
    # The band measures SKIN temperature (~33–35 °C), not core, so there is no population
    # range: it is judged only against the patient's own baseline.
    "temp":   {"label": "Skin temp",   "unit": "°C",   "low": None, "high": None, "bad": "both", "mad_floor": 0.3,
               "critical_low": None, "critical_high": None},
}

# ── Health score (0–100) ─────────────────────────────────────────────────────────
# 100 minus a penalty per vital by status, and an extra penalty per vital that is rapidly
# worsening; floored at 0. Only computed once a personal baseline exists.
SCORE_PENALTY = {"Mild deviation": 5, "Moderate deviation": 12, "Severe deviation": 20, "Critical": 35}
RAPID_WORSENING_PENALTY = 5
# Score bands shown on screen.
SCORE_WITHIN_BASELINE = 80      # ≥ 80  "Within baseline"
SCORE_SIGNIFICANT = 60          # < 60  "Significant change"; 60–79 "Deviating"
# A run of windows below this score is a deterioration episode (one marker at its lowest point).
DETERIORATION_SCORE = 70
