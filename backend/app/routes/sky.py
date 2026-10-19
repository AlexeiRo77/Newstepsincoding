"""`GET /api/sky`: the Sun, the Moon and the bright stars over Almaty at 21:35 on 3 February 1977, plus the
light matrix of the visible sky."""

from __future__ import annotations

import csv
import re
from datetime import UTC, datetime, timedelta, timezone
from functools import cache
from pathlib import Path

from fastapi import APIRouter

from app.sky import astro
from app.sky.lightmap import BRIGHT_LIMIT, cell_of, render

router = APIRouter(prefix="/api/sky", tags=["sky"])

PLACE = "Almaty, Kazakhstan"
LATITUDE = 43.2389
LONGITUDE = 76.8897
# Alma-Ata kept UTC+6 all year in 1977 (tz database Asia/Almaty; summer time began in 1981).
MOMENT = datetime(1977, 2, 3, 21, 35, tzinfo=timezone(timedelta(hours=6)))
MATRIX_SIZE = 32
# Yale Bright Star Catalogue, 5th ed. (CDS V/50), J2000 positions, trimmed to the designated stars of
# magnitude 2.5 or brighter; names are IAU proper names where the star has one.
CATALOGUE = Path(__file__).resolve().parent.parent / "sky" / "bright_stars.csv"


def _body(b: astro.Body) -> dict:
    out = {
        "alt": round(b.alt, 3),
        "az": round(b.az, 3),
        "ra": round(b.ra, 3),
        "dec": round(b.dec, 3),
        "vmag": round(b.vmag, 2),
        "distance_km": round(b.distance_km),
    }
    if b.illuminated is not None:
        out["illuminated"] = round(b.illuminated, 4)
    return out


def _designation(raw: str) -> str:
    """BSC packs Flamsteed number, Bayer letter and constellation ("9Alp CMa"); space them out."""
    return re.sub(r"^(\d+)(?=[A-Z])", r"\1 ", re.sub(r"\s+", " ", raw))


@cache
def sky() -> dict:
    obs = astro.Observer(LATITUDE, LONGITUDE, MOMENT)
    sun, moon = astro.sun(obs), astro.moon(obs)
    stars = []
    with CATALOGUE.open(newline="") as f:
        for row in csv.DictReader(f):
            vmag = float(row["vmag"])
            alt, az, ra, dec = astro.star(
                obs,
                float(row["ra_deg"]),
                float(row["dec_deg"]),
                float(row["pm_ra_arcsec_yr"]),
                float(row["pm_dec_arcsec_yr"]),
            )
            stars.append(
                {
                    "hr": int(row["hr"]),
                    "designation": _designation(row["designation"]),
                    "name": row["name"],
                    "alt": round(alt, 3),
                    "az": round(az, 3),
                    "ra": round(ra, 3),
                    "dec": round(dec, 3),
                    "vmag": vmag,
                }
            )
    stars.sort(key=lambda s: s["vmag"])
    bodies = [("Sun", "sun", sun.alt, sun.az, sun.vmag), ("Moon", "moon", moon.alt, moon.az, moon.vmag)]
    bodies += [(s["name"] or s["designation"], "star", s["alt"], s["az"], s["vmag"]) for s in stars]
    leds = render(((alt, az, vmag) for _, _, alt, az, vmag in bodies), MATRIX_SIZE)
    # What lights each LED, brightest first (stars are sorted already; the Sun and Moon come first).
    lit = []
    for name, kind, alt, az, vmag in bodies:
        cell = cell_of(alt, az, MATRIX_SIZE)
        if cell:
            lit.append({"name": name, "kind": kind, "col": cell[0], "row": cell[1], "vmag": round(vmag, 2)})
    return {
        "observer": {
            "place": PLACE,
            "lat": LATITUDE,
            "lon": LONGITUDE,
            "local_time": MOMENT.isoformat(),
            "utc_time": MOMENT.astimezone(UTC).isoformat(),
            "local_sidereal_time_deg": round(obs.lst, 3),
        },
        "sun": _body(sun),
        "moon": _body(moon),
        "stars": stars,
        "light_matrix": {
            "size": MATRIX_SIZE,
            "magnitude_limit": BRIGHT_LIMIT,
            "leds": leds,
            "lit": lit,
        },
    }


# Public on purpose: the 1977 sky is fixed, non-personal data, shared by link without a login.
@router.get("")
def get_sky() -> dict:
    return sky()
