"""Sky positions for Almaty, 1977-02-03 21:35 (UTC+6). Expected values were computed independently with
Skyfield 1.x and the JPL DE421 ephemeris (geometric altitude, no refraction)."""

import math

import pytest

from app.routes.sky import MATRIX_SIZE, sky
from app.sky.lightmap import NO_LED, cell_of, in_dome, magnitude_to_value, render

CREDS = {"email": "sky@example.com", "password": "correct horse"}
TOLERANCE_DEG = 0.05  # a light-matrix cell is ~6°


def _close(alt, az, want_alt, want_az):
    d_az = abs((az - want_az + 180) % 360 - 180) * math.cos(math.radians(want_alt))
    return abs(alt - want_alt) < TOLERANCE_DEG and d_az < TOLERANCE_DEG


def test_sun_is_below_the_horizon():
    sun = sky()["sun"]
    assert _close(sun["alt"], sun["az"], -38.017, 284.033)


def test_moon_is_up_and_nearly_full():
    moon = sky()["moon"]
    assert _close(moon["alt"], moon["az"], 40.457, 113.568)
    assert moon["illuminated"] > 0.99


@pytest.mark.parametrize(
    "name, alt, az",
    [
        ("Sirius", 28.142, 161.809),
        ("Betelgeuse", 53.977, 172.993),
        ("Polaris", 43.750, 359.090),
        ("Vega", -6.926, 348.506),
    ],
)
def test_star_positions(name, alt, az):
    star = next(s for s in sky()["stars"] if s["name"] == name)
    assert _close(star["alt"], star["az"], alt, az)


def test_bright_stars_brightest_first():
    stars = sky()["stars"]
    assert 80 < len(stars) < 100
    assert all(s["vmag"] <= 2.5 and s["designation"] for s in stars)
    assert stars[0]["name"] == "Sirius"


def test_matrix_lights_the_moon_and_not_the_sun():
    data = sky()
    matrix = data["light_matrix"]
    leds = matrix["leds"]
    assert len(leds) == MATRIX_SIZE and all(len(row) == MATRIX_SIZE for row in leds)
    col, row = cell_of(data["moon"]["alt"], data["moon"]["az"], MATRIX_SIZE)
    assert leds[row][col] == max(v for line in leds for v in line)  # the Moon outshines every star
    assert cell_of(data["sun"]["alt"], data["sun"]["az"], MATRIX_SIZE) is None  # set hours ago
    names = {light["name"] for light in matrix["lit"]}
    assert {"Moon", "Sirius", "Betelgeuse", "Polaris"} <= names
    assert "Sun" not in names and "Vega" not in names
    for light in matrix["lit"]:
        assert leds[light["row"]][light["col"]] > 0


def test_render_adds_light_in_one_cell():
    one = render([(80.0, 10.0, 1.0)], 8)
    two = render([(80.0, 10.0, 1.0), (80.1, 10.1, 1.0)], 8)
    assert sum(1 for line in one for v in line if v > 0) == 1
    assert max(map(max, two)) > max(map(max, one))  # two equal stars ≈ 0.75 mag brighter


def test_dome_projection():
    assert cell_of(90, 0, 32) == (16, 16)  # zenith in the centre
    assert cell_of(0, 0, 32)[1] == 0  # north horizon at the top
    assert cell_of(0, 90, 32)[0] == 0  # east on the left, as seen looking up
    assert cell_of(0, 180, 32)[1] == 31
    assert cell_of(0, 270, 32)[0] == 31
    assert cell_of(-0.1, 0, 32) is None
    # Every horizon point lands on an LED inside the dome; the corners have none.
    assert all(in_dome(*cell_of(0, az, 32), 32) for az in range(360))
    assert render([], 32)[0][0] == NO_LED
    assert magnitude_to_value(-26.74) == 255 and magnitude_to_value(2.5) == 1


def test_endpoint_requires_login(client):
    assert client.get("/api/sky").status_code == 401
    client.post("/api/auth/signup", json=CREDS)
    r = client.get("/api/sky")
    assert r.status_code == 200
    assert r.json()["observer"]["utc_time"] == "1977-02-03T15:35:00+00:00"


def test_designations_are_readable():
    sirius = next(s for s in sky()["stars"] if s["name"] == "Sirius")
    assert sirius["designation"] == "9 Alp CMa"
    assert not any("  " in s["designation"] for s in sky()["stars"])
