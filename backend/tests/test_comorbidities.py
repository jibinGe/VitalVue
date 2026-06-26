from app.core.comorbidities import COMORBIDITIES, validate_comorbidities

def test_has_16():
    assert len(COMORBIDITIES) == 16
    assert "Diabetes" in COMORBIDITIES and "Chronic Liver Disease" in COMORBIDITIES

def test_validate_filters_unknown():
    assert validate_comorbidities(["Diabetes", "Bogus", "Asthma"]) == ["Diabetes", "Asthma"]

def test_validate_none_and_empty():
    assert validate_comorbidities(None) == []
    assert validate_comorbidities([]) == []
