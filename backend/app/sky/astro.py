"""Positions of the Sun, the Moon and the stars as seen from a place on Earth.

Algorithms from Jean Meeus, *Astronomical Algorithms* (2nd ed.): Sun (ch. 25, low accuracy),
Moon (ch. 47, main periodic terms), precession (ch. 21), sidereal time (ch. 12). Accuracy is a few
arcminutes at worst, well below one light-map pixel (~0.7°). Nutation and aberration (< 1′) are ignored.
Altitudes are geometric (no atmospheric refraction); the Moon's is topocentric (parallax applied).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import UTC, datetime

J2000 = 2451545.0
SUN_VMAG = -26.74
# The observer's distance from Earth's centre is taken as one equatorial radius.
EARTH_RADIUS_KM = 6378.14


def _rev(deg: float) -> float:
    return deg % 360.0


def _sin(deg: float) -> float:
    return math.sin(math.radians(deg))


def _cos(deg: float) -> float:
    return math.cos(math.radians(deg))


def julian_day(moment: datetime) -> float:
    """Julian Day of an aware datetime (its UTC instant)."""
    utc = moment.astimezone(UTC)
    return 2440587.5 + utc.timestamp() / 86400.0


def delta_t_seconds(year: float) -> float:
    """TT − UT. Espenak & Meeus polynomial, valid 1961–1986."""
    t = year - 1975
    return 45.45 + 1.067 * t - t**2 / 260 - t**3 / 718


def gmst_deg(jd_ut: float) -> float:
    """Greenwich mean sidereal time (Meeus 12.4)."""
    t = (jd_ut - J2000) / 36525
    return _rev(280.46061837 + 360.98564736629 * (jd_ut - J2000) + 0.000387933 * t**2 - t**3 / 38710000)


def _obliquity(t: float) -> float:
    return 23.439291111 - 0.013004167 * t - 1.639e-7 * t**2 + 5.036e-7 * t**3


def ecliptic_to_equatorial(lon: float, lat: float, eps: float) -> tuple[float, float]:
    ra = math.degrees(math.atan2(_sin(lon) * _cos(eps) - math.tan(math.radians(lat)) * _sin(eps), _cos(lon)))
    dec = math.degrees(math.asin(_sin(lat) * _cos(eps) + _cos(lat) * _sin(eps) * _sin(lon)))
    return _rev(ra), dec


def sun_position(jd_tt: float) -> tuple[float, float, float]:
    """Apparent ecliptic longitude, latitude (0) and distance (km) of the Sun (Meeus ch. 25)."""
    t = (jd_tt - J2000) / 36525
    l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t**2
    m = 357.52911 + 35999.05029 * t - 0.0001537 * t**2
    e = 0.016708634 - 0.000042037 * t
    c = (1.914602 - 0.004817 * t) * _sin(m) + (0.019993 - 0.000101 * t) * _sin(2 * m) + 0.000289 * _sin(3 * m)
    true_lon = l0 + c
    nu = m + c
    r_au = 1.000001018 * (1 - e**2) / (1 + e * _cos(nu))
    omega = 125.04 - 1934.136 * t
    apparent = true_lon - 0.00569 - 0.00478 * _sin(omega)
    return _rev(apparent), 0.0, r_au * 149597870.7


# Meeus table 47.A, main terms: (D, M, M', F, longitude coefficient, distance coefficient).
_MOON_LON_DIST = [
    (0, 0, 1, 0, 6288774, -20905355),
    (2, 0, -1, 0, 1274027, -3699111),
    (2, 0, 0, 0, 658314, -2955968),
    (0, 0, 2, 0, 213618, -569925),
    (0, 1, 0, 0, -185116, 48888),
    (0, 0, 0, 2, -114332, -3149),
    (2, 0, -2, 0, 58793, 246158),
    (2, -1, -1, 0, 57066, -152138),
    (2, 0, 1, 0, 53322, -170733),
    (2, -1, 0, 0, 45758, -204586),
    (0, 1, -1, 0, -40923, -129620),
    (1, 0, 0, 0, -34720, 108743),
    (0, 1, 1, 0, -30383, 104755),
    (2, 0, 0, -2, 15327, 10321),
    (0, 0, 1, 2, -12528, 0),
    (0, 0, 1, -2, 10980, 79661),
    (4, 0, -1, 0, 10675, -34782),
    (0, 0, 3, 0, 10034, -23210),
    (4, 0, -2, 0, 8548, -21636),
    (2, 1, -1, 0, -7888, 24208),
    (2, 1, 0, 0, -6766, 30824),
    (1, 0, -1, 0, -5163, -8379),
    (1, 1, 0, 0, 4987, -16675),
    (2, -1, 1, 0, 4036, -12831),
    (2, 0, 2, 0, 3994, -10445),
    (4, 0, 0, 0, 3861, -11650),
    (2, 0, -3, 0, 3665, 14403),
    (0, 1, -2, 0, -2689, -7003),
]
# Meeus table 47.B, main terms: (D, M, M', F, latitude coefficient).
_MOON_LAT = [
    (0, 0, 0, 1, 5128122),
    (0, 0, 1, 1, 280602),
    (0, 0, 1, -1, 277693),
    (2, 0, 0, -1, 173237),
    (2, 0, -1, 1, 55413),
    (2, 0, -1, -1, 46271),
    (2, 0, 0, 1, 32573),
    (0, 0, 2, 1, 17198),
    (2, 0, 1, -1, 9266),
    (0, 0, 2, -1, 8822),
    (2, -1, 0, -1, 8216),
    (2, 0, -2, -1, 4324),
    (2, 0, 1, 1, 4200),
    (2, 1, 0, -1, -3359),
    (2, -1, -1, 1, 2463),
    (2, -1, 0, 1, 2211),
]


def moon_position(jd_tt: float) -> tuple[float, float, float]:
    """Geocentric ecliptic longitude, latitude and distance (km) of the Moon (Meeus ch. 47)."""
    t = (jd_tt - J2000) / 36525
    lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t**2
    d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t**2
    m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t**2
    mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t**2
    f = 93.2720950 + 483202.0175233 * t - 0.0036539 * t**2
    a1 = 119.75 + 131.849 * t
    a2 = 53.09 + 479264.290 * t
    a3 = 313.45 + 481266.484 * t
    e = 1 - 0.002516 * t - 0.0000074 * t**2

    def arg(cd: int, cm: int, cmp: int, cf: int) -> float:
        return cd * d + cm * m + cmp * mp + cf * f

    sl = sr = 0.0
    for cd, cm, cmp, cf, c_lon, c_dist in _MOON_LON_DIST:
        sl += c_lon * e ** abs(cm) * _sin(arg(cd, cm, cmp, cf))
        sr += c_dist * e ** abs(cm) * _cos(arg(cd, cm, cmp, cf))
    sb = sum(c * e ** abs(cm) * _sin(arg(cd, cm, cmp, cf)) for cd, cm, cmp, cf, c in _MOON_LAT)
    sl += 3958 * _sin(a1) + 1962 * _sin(lp - f) + 318 * _sin(a2)
    sb = (
        sb
        - 2235 * _sin(lp)
        + 382 * _sin(a3)
        + 175 * _sin(a1 - f)
        + 175 * _sin(a1 + f)
        + 127 * _sin(lp - mp)
        - 115 * _sin(lp + mp)
    )
    return _rev(lp + sl / 1e6), sb / 1e6, 385000.56 + sr / 1000


def precess_from_j2000(ra: float, dec: float, jd_tt: float) -> tuple[float, float]:
    """Rigorous precession of J2000 equatorial coordinates to the mean equator of date (Meeus 21.4)."""
    t = (jd_tt - J2000) / 36525
    zeta = (2306.2181 * t + 0.30188 * t**2 + 0.017998 * t**3) / 3600
    z = (2306.2181 * t + 1.09468 * t**2 + 0.018203 * t**3) / 3600
    theta = (2004.3109 * t - 0.42665 * t**2 - 0.041833 * t**3) / 3600
    a = _cos(dec) * _sin(ra + zeta)
    b = _cos(theta) * _cos(dec) * _cos(ra + zeta) - _sin(theta) * _sin(dec)
    c = _sin(theta) * _cos(dec) * _cos(ra + zeta) + _cos(theta) * _sin(dec)
    return _rev(math.degrees(math.atan2(a, b)) + z), math.degrees(math.asin(max(-1.0, min(1.0, c))))


def equatorial_to_horizontal(ra: float, dec: float, lst: float, lat: float) -> tuple[float, float]:
    """Altitude and azimuth (from north, through east) for a local sidereal time and latitude."""
    h = lst - ra
    alt = math.degrees(math.asin(_sin(lat) * _sin(dec) + _cos(lat) * _cos(dec) * _cos(h)))
    y = -_cos(dec) * _sin(h)
    x = _sin(dec) * _cos(lat) - _cos(dec) * _sin(lat) * _cos(h)
    az = math.degrees(math.atan2(y, x))
    return alt, _rev(az)


@dataclass(frozen=True)
class Body:
    alt: float
    az: float
    ra: float
    dec: float
    vmag: float
    distance_km: float
    illuminated: float | None = None  # Moon only: illuminated fraction of the disc


@dataclass(frozen=True)
class Observer:
    lat: float
    lon: float  # east positive
    moment: datetime

    @property
    def jd_ut(self) -> float:
        return julian_day(self.moment)

    @property
    def jd_tt(self) -> float:
        utc = self.moment.astimezone(UTC)
        year = utc.year + (utc.timetuple().tm_yday - 1) / 365.25
        return self.jd_ut + delta_t_seconds(year) / 86400

    @property
    def lst(self) -> float:
        return _rev(gmst_deg(self.jd_ut) + self.lon)

    @property
    def obliquity(self) -> float:
        return _obliquity((self.jd_tt - J2000) / 36525)

    def horizontal(self, ra: float, dec: float) -> tuple[float, float]:
        return equatorial_to_horizontal(ra, dec, self.lst, self.lat)


def sun(obs: Observer) -> Body:
    lon, lat, dist = sun_position(obs.jd_tt)
    ra, dec = ecliptic_to_equatorial(lon, lat, obs.obliquity)
    alt, az = obs.horizontal(ra, dec)
    return Body(alt=alt, az=az, ra=ra, dec=dec, vmag=SUN_VMAG, distance_km=dist)


def moon(obs: Observer) -> Body:
    lon, lat, dist = moon_position(obs.jd_tt)
    ra, dec = ecliptic_to_equatorial(lon, lat, obs.obliquity)
    alt_geo, az = obs.horizontal(ra, dec)
    # Parallax: seen from the surface the Moon sits lower by up to ~1° (horizontal parallax).
    parallax = math.degrees(math.asin(EARTH_RADIUS_KM / dist))
    alt = alt_geo - math.degrees(math.asin(_sin(parallax) * _cos(alt_geo)))
    # Phase angle from the Sun–Moon elongation (Meeus 48.2–48.3); magnitude from the phase.
    sun_lon, _, sun_dist = sun_position(obs.jd_tt)
    elongation = math.degrees(math.acos(_cos(lat) * _cos(lon - sun_lon)))
    phase = math.degrees(math.atan2(sun_dist * _sin(elongation), dist - sun_dist * _cos(elongation)))
    illuminated = (1 + _cos(phase)) / 2
    vmag = -12.73 + 0.026 * abs(phase) + 4e-9 * phase**4
    return Body(alt=alt, az=az, ra=ra, dec=dec, vmag=vmag, distance_km=dist, illuminated=illuminated)


def star(
    obs: Observer, ra2000: float, dec2000: float, pm_ra: float, pm_dec: float
) -> tuple[float, float, float, float]:
    """(alt, az, ra, dec) of date for a J2000 catalogue star; proper motion in arcsec/yr (pm_ra × cos δ)."""
    years = (obs.jd_tt - J2000) / 365.25
    dec = dec2000 + pm_dec * years / 3600
    ra = ra2000 + pm_ra * years / 3600 / max(_cos(dec2000), 1e-6)
    ra, dec = precess_from_j2000(ra, dec, obs.jd_tt)
    alt, az = obs.horizontal(ra, dec)
    return alt, az, ra, dec
