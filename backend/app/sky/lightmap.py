"""The light matrix: the visible sky dome as a square grid of LEDs, each lit by the light that falls in it.

Projection: azimuthal equidistant, as on a star chart held overhead. The zenith is the centre of the
grid and the horizon the inscribed circle; north is up, east left, south down, west right. The
distance from the centre is proportional to the zenith distance (90° − altitude). Cells whose centre
lies outside the horizon circle have no LED (value −1). Objects below the horizon are not shown.

LED value: 0 = dark. Otherwise the summed light of everything in the cell, as a magnitude m, mapped
linearly from the faintest catalogued star (value 1) to the Sun (value 255):
    value = 1 + 254 · (LIMIT − m) / (LIMIT − SUN)
"""

from __future__ import annotations

import math
from collections.abc import Iterable

from app.sky.astro import SUN_VMAG

BRIGHT_LIMIT = 2.5
NO_LED = -1


def cell_of(alt: float, az: float, size: int) -> tuple[int, int] | None:
    """(column, row) of the LED showing a point of the sky, or None below the horizon."""
    if alt < 0:
        return None
    centre = size / 2
    # Scaled to stop 0.75 cell short of the edge, so a horizon object's cell centre stays inside the dome.
    r = (90 - alt) / 90 * (centre - 0.75)
    x = centre - r * math.sin(math.radians(az))
    y = centre - r * math.cos(math.radians(az))
    return min(int(x), size - 1), min(int(y), size - 1)


def in_dome(col: int, row: int, size: int) -> bool:
    centre = size / 2
    return math.hypot(col + 0.5 - centre, row + 0.5 - centre) <= centre


def magnitude_to_value(mag: float) -> int:
    scaled = 1 + 254 * (BRIGHT_LIMIT - mag) / (BRIGHT_LIMIT - SUN_VMAG)
    return max(1, min(255, round(scaled)))


def render(lights: Iterable[tuple[float, float, float]], size: int) -> list[list[int]]:
    """Rows of LED values for (alt, az, vmag) light sources; sources in one cell add up their flux."""
    flux = [[0.0] * size for _ in range(size)]
    for alt, az, mag in lights:
        cell = cell_of(alt, az, size)
        if cell:
            flux[cell[1]][cell[0]] += 10 ** (-0.4 * mag)
    return [
        [
            NO_LED
            if not in_dome(col, row, size)
            else 0
            if f == 0
            else magnitude_to_value(-2.5 * math.log10(f))
            for col, f in enumerate(line)
        ]
        for row, line in enumerate(flux)
    ]
