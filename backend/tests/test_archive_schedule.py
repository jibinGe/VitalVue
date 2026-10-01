from datetime import datetime, time

import pytest

from app.services.archive import last_slot, parse_schedule

IST = 330


def test_parse_schedule():
    days, at = parse_schedule("Mon, thursday", "2:30")
    assert days == {0, 3} and at == time(2, 30)
    assert parse_schedule("sun", "23")[1] == time(23, 0)
    for bad_days, bad_time in (("", "02:00"), ("mon,xyz", "02:00"), ("mon", "25:00"), ("mon", "aa")):
        with pytest.raises(ValueError):
            parse_schedule(bad_days, bad_time)


def test_last_slot_is_latest_scheduled_time_in_utc():
    days, at = parse_schedule("mon,thu", "02:00")
    # Thu 2026-10-01 02:00 IST = Wed 2026-09-30 20:30 UTC
    thu_slot = datetime(2026, 9, 30, 20, 30)
    assert last_slot(datetime(2026, 9, 30, 20, 30), days, at, IST) == thu_slot
    assert last_slot(datetime(2026, 10, 3, 12, 0), days, at, IST) == thu_slot      # Saturday
    # One minute before Thursday's slot → Monday's (Mon 2026-09-28 02:00 IST)
    assert last_slot(datetime(2026, 9, 30, 20, 29), days, at, IST) == datetime(2026, 9, 27, 20, 30)


def test_last_slot_single_day_looks_back_a_week():
    days, at = parse_schedule("thu", "02:00")
    assert last_slot(datetime(2026, 9, 30, 20, 0), days, at, IST) == datetime(2026, 9, 23, 20, 30)
