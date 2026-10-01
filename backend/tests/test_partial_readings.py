"""Readings that carry only some vitals (4G watches send one vital per message; 0 = not measured)
must not score or display as critical because of the vitals they don't carry."""
from argparse import Namespace

from app.services.analytics import calculate_risks, get_patient_overall_status, get_vital_statuses


def _v(hr=0, spo2=0.0, sbp=0, dbp=0, temp=0.0, movement=0, connected=True, removed=False):
    return Namespace(heart_rate=hr, spo2=spo2, bp_systolic=sbp, bp_diastolic=dbp, temp=temp,
                     movement=movement, is_connected=connected, is_removed=removed)


def _status(v):
    risks = calculate_risks(v)
    return get_patient_overall_status(v, get_vital_statuses(v), risks), risks


def test_heart_rate_only_reading_is_stable():
    status, risks = _status(_v(hr=95))
    assert risks["news2_score"] == 1          # HR 91–110 scores 1; missing SpO2/BP score nothing
    assert status == "Stable"


def test_spo2_only_reading_is_stable():
    status, risks = _status(_v(spo2=97))
    assert risks["news2_score"] == 0
    assert risks["af_warning"] is None                 # no heart rate → no AF assessment
    assert status == "Stable"


def test_bp_only_reading_is_stable():
    status, risks = _status(_v(sbp=124, dbp=80))
    assert risks["news2_score"] == 0
    assert status == "Stable"


def test_unmeasured_vitals_show_stable():
    s = get_vital_statuses(_v(hr=80))
    assert s["spo2_status"] == "Stable"
    assert s["bp_status"] == "Stable"


def test_measured_abnormal_values_still_score():
    status, risks = _status(_v(hr=135, spo2=90, sbp=88, dbp=55))
    assert risks["news2_score"] == 9
    assert status == "Critical"


def test_single_abnormal_vital_still_critical():
    status, _ = _status(_v(spo2=89))
    assert status == "Critical"
    status, _ = _status(_v(hr=35))
    assert status == "Critical"


def test_full_normal_reading_unchanged():
    status, risks = _status(_v(hr=75, spo2=98, sbp=120, dbp=80, temp=36.5))
    assert risks["news2_score"] == 0
    assert risks["af_warning"] == "Normal"
    assert status == "Stable"


def test_removed_band_still_critical():
    status, risks = _status(_v(removed=True))
    assert risks["news2_score"] == 0
    assert status == "Critical"
