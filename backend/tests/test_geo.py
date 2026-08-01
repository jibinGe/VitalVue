from app.services.geo import haversine_m

def test_haversine_known_distance():
    d = haversine_m(0.0, 0.0, 0.001, 0.0)   # ~111 m for 0.001 deg latitude
    assert 100 < d < 120

def test_haversine_zero():
    assert haversine_m(10, 10, 10, 10) == 0.0

def test_haversine_symmetric():
    a = haversine_m(10.0459, 76.3090, 10.05, 76.31)
    b = haversine_m(10.05, 76.31, 10.0459, 76.3090)
    assert abs(a - b) < 1e-6
