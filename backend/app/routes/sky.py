"""`GET /api/sky`: the Sun, the Moon and every naked-eye star over Almaty at 21:35 on 3 February 1977,
plus the whole-sky light map."""

from __future__ import annotations

import base64
import csv
from datetime import UTC, datetime, timedelta, timezone
from functools import cache
from pathlib import Path

from fastapi import APIRouter, Depends

from app.auth import current_user
from app.models import User
from app.sky import astro
from app.sky.lightmap import NAKED_EYE_LIMIT, render

router = APIRouter(prefix="/api/sky", tags=["sky"])

PLACE = "Almaty, Kazakhstan"
LATITUDE = 43.2389
LONGITUDE = 76.8897
# Alma-Ata kept UTC+6 all year in 1977 (tz database Asia/Almaty; summer time began in 1981).
MOMENT = datetime(1977, 2, 3, 21, 35, tzinfo=timezone(timedelta(hours=6)))
MAP_SIZE = 512
# Yale Bright Star Catalogue, 5th ed. (CDS V/50), J2000 positions, trimmed; names are IAU proper names.
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


@cache
def sky() -> dict:
    obs = astro.Observer(LATITUDE, LONGITUDE, MOMENT)
    sun, moon = astro.sun(obs), astro.moon(obs)
    stars = []
    with CATALOGUE.open(newline="") as f:
        for row in csv.DictReader(f):
            vmag = float(row["vmag"])
            if vmag > NAKED_EYE_LIMIT:
                continue
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
                    "designation": row["designation"],
                    "name": row["name"],
                    "alt": round(alt, 3),
                    "az": round(az, 3),
                    "ra": round(ra, 3),
                    "dec": round(dec, 3),
                    "vmag": vmag,
                }
            )
    stars.sort(key=lambda s: s["vmag"])
    lights = [(sun.alt, sun.az, sun.vmag), (moon.alt, moon.az, moon.vmag)]
    lights += [(s["alt"], s["az"], s["vmag"]) for s in stars]
    pixels = render(lights, MAP_SIZE, MAP_SIZE)
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
        "light_map": {
            "width": MAP_SIZE,
            "height": MAP_SIZE,
            "naked_eye_limit": NAKED_EYE_LIMIT,
            "pixels": base64.b64encode(pixels).decode("ascii"),
        },
    }


@router.get("")
def get_sky(user: User = Depends(current_user)) -> dict:
    return sky()
