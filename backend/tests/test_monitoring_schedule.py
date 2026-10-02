import asyncio

import pytest

from app.api.v1 import internal_emqx
from app.core.config import settings
from app.services.monitoring import profile_hash, to_auto_measure_records, validate_profile

BASE = {"hr_interval_min": 5, "bp_interval_min": 60, "spo2_interval_min": 5, "temp_interval_min": 30,
        "hrv_interval_min": 30, "stress_interval_min": 30, "upload_interval_min": 5,
        "window_start": None, "window_end": None}


def test_validate_off_and_bounds():
    out = validate_profile({**BASE, "temp_interval_min": None, "stress_interval_min": ""})
    assert out["temp_interval_min"] is None and out["stress_interval_min"] is None
    with pytest.raises(ValueError):
        validate_profile({**BASE, "hr_interval_min": 2000})
    with pytest.raises(ValueError):
        validate_profile({**BASE, "upload_interval_min": 300})


def test_validate_window_needs_both_ends():
    assert validate_profile({**BASE, "window_start": "8:0", "window_end": "20:30"})["window_start"] == "08:00"
    with pytest.raises(ValueError):
        validate_profile({**BASE, "window_start": "08:00"})


def test_records_round_up_to_watch_step_and_skip_unsupported():
    limits = {"hr": {"step_min": 5}, "bp": {"step_min": 15}, "spo2": {"step_min": 1}, "temp": {"step_min": 10},
              "hrv": {"step_min": 1}}                       # stress not reported by this watch
    recs = {r.function: r for r in to_auto_measure_records({**BASE, "hr_interval_min": 7, "bp_interval_min": 20}, limits)}
    assert recs["hr"].interval_min == 10 and recs["bp"].interval_min == 30
    assert "stress" not in recs


def test_records_off_and_window():
    recs = {r.function: r for r in to_auto_measure_records(
        {**BASE, "temp_interval_min": None, "window_start": "22:00", "window_end": "06:00"})}
    assert not recs["temp"].enabled
    assert recs["hr"].window_start == (22, 0) and recs["hr"].window_end == (6, 0)


def test_profile_hash_changes_with_schedule():
    assert profile_hash(BASE) != profile_hash({**BASE, "bp_interval_min": 30})


def test_authz_limits_watch_to_its_own_topics(monkeypatch):
    monkeypatch.setattr(settings, "EMQX_HOOK_SECRET", "s3cret")
    run = lambda **kw: asyncio.run(internal_emqx.emqx_authz(internal_emqx.AuthzIn(**kw), x_emqx_secret="s3cret"))
    assert run(clientid="AA_1", topic="vpwatch/AA_1/v1/daily_data_report", action="publish")["result"] == "allow"
    assert run(clientid="AA_1", topic="server/AA_1/v1/cmd_notify", action="subscribe")["result"] == "allow"
    assert run(clientid="AA_1", topic="vpwatch/BB_2/v1/daily_data_report", action="publish")["result"] == "deny"
    assert run(clientid="AA_1", topic="server/AA_1/v1/cmd_notify", action="publish")["result"] == "deny"
    assert run(clientid="AA_1", topic="vpwatch/+/v1/#", action="subscribe")["result"] == "deny"


def test_hooks_reject_missing_or_placeholder_secret(monkeypatch):
    body = internal_emqx.AuthzIn(clientid="AA_1", topic="vpwatch/AA_1/v1/x", action="publish")
    monkeypatch.setattr(settings, "EMQX_HOOK_SECRET", "s3cret")
    assert asyncio.run(internal_emqx.emqx_authz(body, x_emqx_secret="wrong"))["result"] == "deny"
    monkeypatch.setattr(settings, "EMQX_HOOK_SECRET", "not-set")
    assert asyncio.run(internal_emqx.emqx_authz(body, x_emqx_secret="not-set"))["result"] == "deny"
