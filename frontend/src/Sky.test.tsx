import { render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import Sky, { type SkyData } from './pages/Sky'

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
  stars: Array.from({ length: 3 }, (_, i) => ({
    hr: i + 1,
    designation: `HR${i + 1}`,
    name: i === 0 ? 'Sirius' : '',
    alt: i === 1 ? -6.9 : 28.14,
    az: 161.81,
    ra: 101.3,
    dec: -16.7,
    vmag: -1.46 + i * 0.1,
  })),
  light_matrix: {
    size: 3,
    magnitude_limit: 2.5,
    leds: [
      [-1, 0, -1],
      [0, 141, 14],
      [-1, 0, -1],
    ],
    lit: [
      { name: 'Moon', kind: 'moon', col: 1, row: 1, vmag: -12.52 },
      { name: 'Sirius', kind: 'star', col: 2, row: 1, vmag: -1.46 },
    ],
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('shows the light matrix, the Sun, the Moon and every star', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(SKY), { headers: { 'content-type': 'application/json' } })),
  )
  render(<Sky />)
  expect(await screen.findByRole('heading', { name: 'Sky over Almaty, Kazakhstan' })).toBeInTheDocument()
  expect(screen.getByText(/1977-02-03 21:35 local time/)).toBeInTheDocument()
  const matrix = screen.getByRole('img', { name: 'Light matrix of the visible sky' })
  expect(matrix.querySelectorAll('circle')).toHaveLength(1 + 3 + 2 * 2) // horizon, dark LEDs, lit LEDs
  expect(matrix).toHaveTextContent('Moon')
  expect(screen.getByRole('cell', { name: '-38.01°' })).toBeInTheDocument()
  expect(screen.getByText(/99.5% lit/)).toBeInTheDocument()
  expect(screen.getAllByRole('row')).toHaveLength(3 + 1 + 3)
})
