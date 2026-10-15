"""The light map: the whole sky (above and below the horizon) as a grid of pixels whose value is the light
that falls in them.

Projection: equirectangular in horizontal coordinates. Column x covers azimuth 0°→360° (N, E, S, W, N
left to right); row y covers altitude +90° (zenith, top) → −90° (nadir, bottom); the horizon is the
middle row boundary.

Pixel value (one byte): 0 = no light. Otherwise the summed light of everything in the pixel, as a
magnitude m, mapped linearly from the naked-eye limit (value 1) to the Sun (value 255):
    value = 1 + 254 · (LIMIT − m) / (LIMIT − SUN)
"""

from __future__ import annotations

import math
from collections.abc import Iterable

from app.sky.astro import SUN_VMAG

NAKED_EYE_LIMIT = 6.5


def pixel_of(alt: float, az: float, width: int, height: int) -> tuple[int, int]:
    x = min(int(az % 360 / 360 * width), width - 1)
    y = min(int((90 - alt) / 180 * height), height - 1)
    return x, y


def magnitude_to_value(mag: float) -> int:
    scaled = 1 + 254 * (NAKED_EYE_LIMIT - mag) / (NAKED_EYE_LIMIT - SUN_VMAG)
    return max(1, min(255, round(scaled)))


def render(lights: Iterable[tuple[float, float, float]], width: int, height: int) -> bytes:
    """Row-major bytes for (alt, az, vmag) light sources; sources in one pixel add up their flux."""
    flux = [0.0] * (width * height)
    for alt, az, mag in lights:
        x, y = pixel_of(alt, az, width, height)
        flux[y * width + x] += 10 ** (-0.4 * mag)
    return bytes(0 if f == 0 else magnitude_to_value(-2.5 * math.log10(f)) for f in flux)
