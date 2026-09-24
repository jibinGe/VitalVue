from datetime import datetime

from app.services.baseline import stats as st
from app.services.baseline.engine import (
    build_baseline_stats, build_observation, classify_status, compute_vpo, is_stable,
)
from app.services.baseline.job import latest_closed_window
from app.services.baseline.trend import classify_trend, persistence

# Spec example: twelve HR readings with one 120 outlier.
SPEC_HR = [82, 81, 83, 82, 81, 82, 84, 82, 83, 81, 82, 120]


def _raw(hr=82, spo2=97, sbp=124, dbp=80, hrv=42, stress="30", movement=2, connected=True, removed=False):
    return {"heart_rate": hr, "spo2": spo2, "bp_systolic": sbp, "bp_diastolic": dbp, "hrv_score": hrv,
            "stress_level": stress, "movement": movement, "is_connected": connected, "is_removed": removed}


def _obs(hr=82.0, **kw):
    base = {"hr": hr, "spo2": 97.0, "sbp": 124.0, "dbp": 80.0, "map": 94.7, "hrv": 42.0, "stress": 30.0,
            "movement": 2.0, "good_ratio": 1.0, "signal_quality": "good", "activity_state": "resting",
            "stuck_sensor": False}
    base.update(kw)
    return base


# --- stats (spec pages 4–7) ---

def test_median_ignores_outlier():
    assert st.median(SPEC_HR) == 82


def test_mad_is_one_bpm():
    assert st.mad(SPEC_HR) == 1


def test_delta_percent_and_z():
    assert 97 - 82 == 15
    assert round(st.percent_dev(97, 82)) == 18
    assert st.z_score(97, 82, 2, floor=1) == 7.5


def test_robust_z_uses_floor_for_flat_baseline():
    # MAD 0 would divide by zero; the floor keeps the score finite.
    assert st.robust_z(85, 82, 0, floor=3) == 1.0


# --- trend (spec pages 8–9, 14–15) ---

def test_trend_increasing_is_worsening():
    assert classify_trend([82, 86, 92], "both", 80, floor=3)["trend"] in ("Slow worsening", "Rapid worsening")


def test_trend_improving():
    assert classify_trend([92, 87, 82], "both", 80, floor=3)["trend"] == "Improving"


def test_trend_stable():
    assert classify_trend([82, 82, 83], "both", 82, floor=3)["trend"] == "Stable"


def test_trend_oscillating():
    assert classify_trend([90, 102, 92, 108, 91], "both", 82, floor=3)["trend"] == "Oscillating"


def test_trend_unknown_with_too_few_points():
    assert classify_trend([82, 90], "both", 82, floor=3)["trend"] == "Unknown"


def test_trend_rate_per_minute():
    # 82 → 92 over two 10-minute steps (spec: 1 bpm/min over 10 min; here 10 bpm over 20 min).
    assert classify_trend([82, 87, 92], "up", 82, floor=3)["rate"] == 0.5


def test_spo2_falling_is_worsening():
    # "Rapid" = at least 3 × the MAD floor (SpO2: 1%) per 10-minute window.
    assert classify_trend([97, 95, 92], "down", 97, floor=1)["trend"] == "Slow worsening"   # 2.5 %/window
    assert classify_trend([97, 93, 89], "down", 97, floor=1)["trend"] == "Rapid worsening"  # 4 %/window


def test_persistence_counts_consecutive_abnormal():
    assert persistence(["Normal", "Mild deviation", "Moderate deviation"], "Moderate deviation") == 3
    assert persistence(["Mild deviation"], "Normal") == 0


# --- observation building ---

def test_observation_takes_medians_and_drops_disconnected():
    rows = [_raw(hr=h) for h in SPEC_HR] + [_raw(hr=0, connected=False)]
    obs = build_observation(rows)
    assert obs["hr"] == 82
    assert obs["sample_count"] == 13
    assert obs["signal_quality"] == "good"
    assert round(obs["map"], 1) == round((124 + 2 * 80) / 3, 1)


def test_observation_poor_signal_when_mostly_disconnected():
    rows = [_raw(connected=False) for _ in range(8)] + [_raw() for _ in range(2)]
    assert build_observation(rows)["signal_quality"] == "poor"


def test_observation_flags_stuck_sensor():
    obs = build_observation([_raw(hr=75) for _ in range(30)])
    assert obs["stuck_sensor"] and obs["signal_quality"] == "poor"


def test_observation_skips_stress_labels():
    obs = build_observation([_raw(stress="Low"), _raw(stress="40")])
    assert obs["stress"] == 40


def test_empty_window_is_none():
    assert build_observation([]) is None


# --- status ---

def test_population_status_uses_template():
    assert classify_status("hr", 55, None)[0] == "Mild deviation"   # outside 60–100
    assert classify_status("hr", 92, None)[0] == "Normal"
    assert classify_status("spo2", 88, None)[0] == "Critical"       # below the fixed 90 threshold


def test_personal_status_bands():
    baseline = {"median": 82, "mad": 1}
    assert classify_status("hr", 84, baseline)[0] == "Normal"
    assert classify_status("hr", 91, baseline)[0] == "Moderate deviation"   # (91−82)/3 = 3
    assert classify_status("hr", 97, baseline)[0] == "Severe deviation"     # 15/3 = 5


def test_spo2_above_baseline_is_not_a_deviation():
    assert classify_status("spo2", 100, {"median": 94, "mad": 0.5})[0] == "Normal"


# --- VPO + freeze logic (spec pages 11–12, 22–23) ---

def test_vpo_fields_in_personal_mode():
    stats, _ = build_baseline_stats([_obs(hr=h) for h in SPEC_HR])
    vpo = compute_vpo(_obs(hr=108), "personal", stats, [_obs(hr=82), _obs(hr=95)], learning_confidence=1.0)
    hr = vpo["hr"]
    assert hr["baseline"] == 82 and hr["delta"] == 26
    assert hr["percentDeviation"] == 31.7
    assert hr["status"] == "Severe deviation"
    assert hr["trend"] == "Rapid worsening"


def test_deteriorating_window_is_frozen_out():
    stats, _ = build_baseline_stats([_obs(hr=h) for h in SPEC_HR])
    for hr in (110, 112, 115):
        vpo = compute_vpo(_obs(hr=hr), "personal", stats, [], learning_confidence=1.0)
        assert is_stable(_obs(hr=hr), vpo, "personal", alert_in_window=False) == (False, "deterioration")


def test_alert_motion_and_signal_block_the_buffer():
    vpo = compute_vpo(_obs(), "population", {}, [], learning_confidence=0.0)
    assert is_stable(_obs(), vpo, "population", alert_in_window=True) == (False, "alert_active")
    assert is_stable(_obs(activity_state="active"), vpo, "population", False) == (False, "motion")
    assert is_stable(_obs(signal_quality="fair"), vpo, "population", False) == (False, "poor_signal")
    assert is_stable(_obs(), vpo, "population", False) == (True, None)


def test_population_mode_does_not_freeze_on_low_normal_hr():
    # HR 55 may be this patient's normal: only a critical value freezes during learning.
    vpo = compute_vpo(_obs(hr=55), "population", {}, [], learning_confidence=0.5)
    assert is_stable(_obs(hr=55), vpo, "population", False) == (True, None)


def test_baseline_confidence_grows_with_readings():
    _, few = build_baseline_stats([_obs() for _ in range(4)])
    _, full = build_baseline_stats([_obs() for _ in range(12)])
    assert few < full and full == 1.0


# --- scheduling ---

def test_latest_closed_window():
    assert latest_closed_window(datetime(2026, 9, 24, 17, 27, 30)) == datetime(2026, 9, 24, 17, 10)
    assert latest_closed_window(datetime(2026, 9, 24, 17, 30, 0)) == datetime(2026, 9, 24, 17, 20)
