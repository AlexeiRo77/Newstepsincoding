import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import LightPressure, { AU, C, curvePath, mapCells, onAxis, pressure, SOURCES, sci, totalForce } from './pages/LightPressure'

const src = (id: string) => SOURCES.find((s) => s.id === id) ?? SOURCES[0]

test('sunlight at the Earth presses 4.5 µPa on an absorber and twice that on a mirror', () => {
  const sun = src('sun')
  expect(pressure(sun, AU, 0, 'absorber')).toBeCloseTo(1361 / C, 8)
  expect(pressure(sun, AU, 0, 'absorber') * 1e6).toBeCloseTo(4.54, 2)
  expect(pressure(sun, AU, 0, 'mirror')).toBeCloseTo(2 * pressure(sun, AU, 0, 'absorber'), 12)
})

test('a lamp falls as 1/r², a beam holds its pressure near the source, and the total push is P/c', () => {
  const lamp = src('lamp')
  expect(onAxis(lamp, 1, 'absorber') / onAxis(lamp, 10, 'absorber')).toBeCloseTo(100, 6)
  const pointer = src('pointer')
  expect(onAxis(pointer, 0.01, 'absorber') / onAxis(pointer, 0.1, 'absorber')).toBeLessThan(1.02)
  expect(onAxis(pointer, 1000, 'absorber') / onAxis(pointer, 10000, 'absorber')).toBeCloseTo(100, 0)
  // The pointer's narrow 5 mW beam pushes harder at 1 m than the 100 W lamp does.
  expect(onAxis(pointer, 1, 'absorber')).toBeGreaterThan(100 * onAxis(lamp, 1, 'absorber'))
  expect(totalForce(src('cutter'), 'absorber')).toBeCloseTo(1e4 / C, 12)
  expect(totalForce(src('cutter'), 'mirror')).toBeCloseTo(2e4 / C, 12)
})

test('every map is filled and every chart line is drawn, each map with a range of colours', () => {
  for (const s of SOURCES) {
    const bands = new Set(mapCells(s, 'absorber').map((c) => c.band))
    expect(bands.size).toBeGreaterThan(3)
    expect(curvePath(s, 'absorber')).toMatch(/^M[\d.]+,[\d.]+(L[\d.]+,[\d.]+){50,}$/)
  }
  expect(sci(4.54e-6)).toBe('4.5 × 10⁻⁶')
  expect(sci(1e-12)).toBe('10⁻¹²')
  expect(sci(90)).toBe('90')
})

test('the page switches its map by source and its numbers by surface', () => {
  render(<LightPressure />)
  expect(screen.getByRole('heading', { name: 'Light pressure by source' })).toBeInTheDocument()
  expect(document.querySelector('svg[data-map="sun"]')).not.toBeNull()
  expect(screen.getByText(/4.5 × 10⁻⁶ Pa at the Earth/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Mirror (2I/c)' }))
  expect(screen.getByText(/9.1 × 10⁻⁶ Pa at the Earth/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Green laser pointer' }))
  expect(document.querySelector('svg[data-map="pointer"]')).not.toBeNull()
  expect(document.querySelector('svg[data-map="sun"]')).toBeNull()
  const chart = screen.getByRole('img', { name: /^Light pressure against distance/ })
  expect(chart.querySelectorAll('path[data-series]').length).toBe(SOURCES.length)
  expect(document.querySelectorAll('.lp-table tbody tr').length).toBe(SOURCES.length)
  for (const id of ['lebedev', 'ikaros', 'tweezers'])
    expect(document.querySelector(`#${id} .wave-badge`)?.textContent).toBe('Measured')
})
