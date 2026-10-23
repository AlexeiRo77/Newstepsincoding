import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { read, toDb } from './components/Spectrum'
import ThymusWaves, { AGED_AMP, AGED_FAT, model } from './pages/ThymusWaves'

test('the aged map is mostly still fat, and what is left vibrates far less than the young map', () => {
  const { young, aged } = model().maps
  expect(young.cells.length).toBe(aged.cells.length)
  expect(young.cells.length).toBeGreaterThan(1000)
  expect(young.fat).toBe(0)
  expect(Math.max(...young.cells.map((c) => Math.abs(c.u)))).toBeCloseTo(1, 6)
  expect(aged.fat).toBeCloseTo(AGED_FAT, 2)
  expect(aged.rms).toBeGreaterThan(0.05)
  expect(aged.rms).toBeLessThan(0.4)
})

test('the decoded aged spectrum is weaker, broader and more disordered than the young one', () => {
  const s = model()
  const y = read(s.young)
  const a = read(s.aged)
  expect(y.peak).toBeCloseTo(1, 2)
  expect(a.peak).toBeCloseTo(1, 1)
  expect(toDb(Math.max(...s.young))).toBeCloseTo(0, 6)
  // The aged line loses at least its amplitude's share of power, and more as it smears out.
  expect(toDb(Math.max(...s.aged.slice(1)))).toBeLessThan(toDb(AGED_AMP ** 2))
  expect(a.linewidth).toBeGreaterThan(y.linewidth)
  expect(a.floorDb).toBeGreaterThan(y.floorDb + 15)
  expect(a.entropy).toBeGreaterThan(y.entropy + 0.1)
})

test('the page draws both organ maps and both spectra, and labels the theory a hypothesis', () => {
  render(<ThymusWaves />)
  for (const id of ['young', 'aged'])
    expect(document.querySelectorAll(`svg[data-map="${id}"] path`).length).toBeGreaterThan(3)
  const chart = screen.getByRole('img', { name: /^Decoded spectra/ })
  for (const id of ['young', 'aged'])
    expect(chart.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')).toMatch(/^M[\d.,L-]+$/)
  for (const id of ['organ-map', 'spectrum'])
    expect(document.querySelector(`#${id} .wave-badge`)?.textContent).toBe('Hypothesis — not confirmed')
  const rows = [...document.querySelectorAll('.spec-readings tbody th')].map((th) => th.textContent)
  expect(rows[0]).toBe('Main line strength')
  expect(screen.getByText(/not a diagnostic/)).toBeInTheDocument()
  for (const id of ['involution', 'output', 'ultrasound'])
    expect(document.querySelector(`#${id} .wave-badge`)?.textContent).toBe('Measured')
})
