import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import type { SkyData } from './pages/Sky'
import SkyBody, { BIOPHOTONS, SKIN_EMITTED, illuminance, irradiance, sci, skyLight, times } from './pages/SkyBody'

const body = { ra: 10, dec: 5, distance_km: 400000 }
const SKY: SkyData = {
  observer: {
    place: 'Almaty, Kazakhstan',
    lat: 43.2389,
    lon: 76.8897,
    local_time: '1977-02-03T21:35:00+06:00',
    utc_time: '1977-02-03T15:35:00+00:00',
    local_sidereal_time_deg: 100,
  },
  sun: { ...body, alt: -38.01, az: 284.03, vmag: -26.74 },
  moon: { ...body, alt: 40.46, az: 113.57, vmag: -12.52, illuminated: 0.995 },
  stars: [],
  light_matrix: {
    size: 3,
    magnitude_limit: 2.5,
    leds: [],
    lit: [
      { name: 'Moon', kind: 'moon', col: 1, row: 1, vmag: -12.52 },
      { name: 'Sirius', kind: 'star', col: 2, row: 1, vmag: -1.46 },
      { name: 'Capella', kind: 'star', col: 1, row: 0, vmag: 0.08 },
    ],
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('physics: sunlight scaling, skin glow and biophotons', () => {
  expect(irradiance(-26.74)).toBeCloseTo(1361)
  expect(illuminance(-26.74)).toBeGreaterThan(9e4) // full sunlight ≈ 100 000 lux
  expect(illuminance(-12.7)).toBeGreaterThan(0.1) // full Moon ≈ 0.25 lux
  expect(illuminance(-12.7)).toBeLessThan(0.4)
  expect(SKIN_EMITTED).toBeGreaterThan(480)
  expect(SKIN_EMITTED).toBeLessThan(500)
  expect(BIOPHOTONS[0]).toBeCloseTo(3.97e-14, 15)
  expect(sci(0.00283)).toBe('2.8 × 10⁻³')
  expect(sci(492)).toBe('492')
  expect(times(2.4e5)).toBe('about 10⁵ times')
})

test('sky light sums what the matrix shows above the horizon', () => {
  const sky = skyLight(SKY.light_matrix)
  expect(sky.moon).toBeCloseTo(irradiance(-12.52))
  expect(sky.starCount).toBe(2)
  expect(sky.stars).toBeCloseTo(irradiance(-1.46) + irradiance(0.08))
  expect(skyLight({ ...SKY.light_matrix, lit: SKY.light_matrix.lit.slice(1) }).moon).toBeNull()
})

test('draws the chart and the match table from /api/sky', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(SKY), { headers: { 'content-type': 'application/json' } })),
  )
  render(<SkyBody />)
  expect(await screen.findByRole('heading', { name: /The 1977 sky and the body/ })).toBeInTheDocument()
  const chart = screen.getByRole('img', { name: /power per square metre against wavelength/ })
  expect([...chart.querySelectorAll('g.skb-mark')].map((g) => g.getAttribute('data-mark'))).toEqual(['1', '2', '3', '4'])
  expect(document.querySelectorAll('.skb-legend li')).toHaveLength(6)
  expect(screen.getByRole('cell', { name: '2 · All 2 bright stars together' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: /^No — different band/ })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: /^Same band, not the same strength.*moonlight is about 10¹⁰ times/ })).toBeInTheDocument()
})
