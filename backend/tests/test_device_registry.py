import pytest

from app.devices.registry import TYPES, get_type, luhn_ok, validate_imei, validate_mac_number
from app.models.device import DEVICE_4G, DEVICE_BPW8, DEVICE_WONLEX

# IMEIs from the vendor protocol documents that pass the Luhn check. The Wonlex document's other
# sample, 865028000000306, is a placeholder that fails it (a real IMEI always passes).
WONLEX_IMEI = "352273017386001"
BPW8_IMEI = "867956070000018"
PLACEHOLDER_IMEI = "865028000000306"


def test_vendor_sample_imeis_are_valid():
    assert validate_imei(WONLEX_IMEI) == WONLEX_IMEI
    assert validate_imei(BPW8_IMEI) == BPW8_IMEI


def test_imei_is_normalised():
    assert validate_imei(" 3522-7301 7386001 ") == WONLEX_IMEI


@pytest.mark.parametrize("bad", ["", "35227301738600", "3522730173860011", "35227301738600A", "352273017386002", PLACEHOLDER_IMEI])
def test_bad_imeis_rejected(bad):
    with pytest.raises(ValueError):
        validate_imei(bad)


def test_luhn():
    assert luhn_ok("490154203237518")
    assert not luhn_ok("490154203237519")


def test_veepoo_client_id():
    assert validate_mac_number("f1f2f3f4f5f6_9999") == "F1F2F3F4F5F6_9999"
    with pytest.raises(ValueError):
        validate_mac_number(WONLEX_IMEI)


def test_registry_covers_all_types():
    assert set(TYPES) == {DEVICE_4G, DEVICE_WONLEX, DEVICE_BPW8}
    for t in TYPES.values():
        assert len(t.source) <= 10                  # vitals.source is String(10)
        assert t.transport in ("mqtt", "tcp")
        if t.transport == "tcp":
            assert t.port_setting


def test_bpw8_limits():
    bpw8 = get_type(DEVICE_BPW8)
    assert bpw8.limit("hr").min_interval == 10
    assert not bpw8.limit("temp").native and bpw8.limit("temp").requestable
    assert not bpw8.confirms_schedule
    assert not bpw8.limit("stress").native and not bpw8.limit("stress").requestable


def test_public_info_shape():
    info = get_type(DEVICE_WONLEX).public()
    assert info["measure_now"] == ["hr", "bp", "spo2", "temp", "hrv"]
    assert info["vitals"]["hr"]["native"] is True


def test_unknown_type():
    with pytest.raises(ValueError):
        get_type("nokia_3310")
