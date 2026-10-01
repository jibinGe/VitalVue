from argparse import Namespace
from datetime import datetime, timedelta

from app.services.latest_vitals import latest_measured

T = datetime(2026, 10, 1, 12, 0)


def row(minutes_ago, hr=0, spo2=0.0, sbp=0, dbp=0, temp=0.0, af=None, connected=True, removed=False):
    return Namespace(patient_id=1, is_connected=connected, is_removed=removed, created_at=T - timedelta(minutes=minutes_ago),
                     news2_score=0, af_warning=af, stroke_risk="Low", seizure_risk="Low", movement=0, battery_percent=80,
                     heart_rate=hr, spo2=spo2, temp=temp, bp_systolic=sbp, bp_diastolic=dbp, hrv_score=0)


def test_each_vital_from_the_newest_row_that_measured_it():
    rows = [row(0, spo2=97), row(1, hr=82, af="Normal"), row(5, sbp=124, dbp=80), row(9, temp=33.4), row(12, hr=90)]
    v = latest_measured(rows)
    assert (v.spo2, v.heart_rate, v.bp_systolic, v.bp_diastolic, v.temp) == (97, 82, 124, 80, 33.4)
    assert v.af_warning == "Normal" and v.created_at == T


def test_removed_watch_is_shown_as_it_is():
    v = latest_measured([row(0, removed=True), row(1, hr=82)])
    assert v.is_removed and v.heart_rate == 0


def test_rows_from_before_a_removal_still_count_while_worn():
    v = latest_measured([row(0, spo2=96), row(1, removed=True), row(2, hr=80)])
    assert v.heart_rate == 80


def test_empty():
    assert latest_measured([]) is None
