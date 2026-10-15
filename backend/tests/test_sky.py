"""Sky positions for Almaty, 1977-02-03 21:35 (UTC+6). Expected values were computed independently with
Skyfield 1.x and the JPL DE421 ephemeris (geometric altitude, no refraction)."""

import base64
import math

import pytest

from app.routes.sky import MAP_SIZE, sky
from app.sky.lightmap import magnitude_to_value, pixel_of, render

CREDS = {"email": "sky@example.com", "password": "correct horse"}
TOLERANCE_DEG = 0.05  # a light-map pixel is ~0.35°–0.7°


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


def test_all_naked_eye_stars_brightest_first():
    stars = sky()["stars"]
    assert len(stars) > 8000
    assert all(s["vmag"] <= 6.5 for s in stars)
    assert stars[0]["name"] == "Sirius"


def test_light_map_has_the_moon_and_the_sun():
    data = sky()
    pixels = base64.b64decode(data["light_map"]["pixels"])
    assert len(pixels) == MAP_SIZE * MAP_SIZE
    for body in ("sun", "moon"):
        x, y = pixel_of(data[body]["alt"], data[body]["az"], MAP_SIZE, MAP_SIZE)
        assert pixels[y * MAP_SIZE + x] == magnitude_to_value(data[body]["vmag"])
    assert max(pixels) == 255  # the Sun


def test_render_adds_light_in_one_pixel():
    one = render([(10.0, 10.0, 1.0)], 4, 4)
    two = render([(10.0, 10.0, 1.0), (10.1, 10.1, 1.0)], 4, 4)
    assert sum(1 for p in one if p) == 1
    assert max(two) > max(one)  # two equal stars ≈ 0.75 mag brighter


def test_pixel_of_covers_the_whole_sphere():
    assert pixel_of(90, 0, 512, 512) == (0, 0)
    assert pixel_of(-90, 359.99, 512, 512) == (511, 511)
    assert pixel_of(0, 180, 512, 512) == (256, 256)


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
