import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { binHz, read } from './components/Spectrum'
import TumorWaves, { spectra, TUMOR_SHIFT } from './pages/TumorWaves'

test('the decoded healthy spectrum is sharp lines at the harmonics of f₀', () => {
  const { healthy } = spectra()
  const r = read(healthy)
  expect(r.peak).toBeCloseTo(1, 2)
  expect(r.linewidth).toBeLessThan(0.05)
  expect(r.floorDb).toBeLessThan(-50)
  // A line stands at each harmonic 2f₀…5f₀.
  for (const k of [2, 3, 4, 5]) {
    const b = healthy.findIndex((_, i) => binHz(i) === k)
    expect(10 * Math.log10(healthy[b])).toBeGreaterThan(-20)
  }
})

test('the decoded tumor spectrum is shifted, broadened and more disordered', () => {
  const s = spectra()
  const h = read(s.healthy)
  const t = read(s.tumor)
  expect(t.peak).toBeCloseTo(TUMOR_SHIFT, 1)
  expect(t.linewidth).toBeGreaterThan(2 * h.linewidth)
  expect(t.linewidth).toBeLessThan(0.3)
  expect(t.floorDb).toBeGreaterThan(h.floorDb + 15)
  expect(t.entropy).toBeGreaterThan(h.entropy + 0.2)
})

test('the page draws both spectra, the readings table, and labels the theory a hypothesis', () => {
  render(<TumorWaves />)
  const chart = screen.getByRole('img', { name: /^Decoded spectra/ })
  for (const id of ['healthy', 'tumor'])
    expect(chart.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')).toMatch(/^M[\d.,L-]+$/)
  expect(document.querySelector('#spectrum .wave-badge')?.textContent).toBe('Hypothesis — not confirmed')
  const rows = [...document.querySelectorAll('.spec-readings tbody th')].map((th) => th.textContent)
  expect(rows).toEqual(['Main line at', 'Line width', 'Noise floor', 'Disorder (spectral entropy)'])
  expect(screen.getByText(/not a diagnostic/)).toBeInTheDocument()
  for (const id of ['stiffness', 'dielectric', 'nanomotion'])
    expect(document.querySelector(`#${id} .wave-badge`)?.textContent).toBe('Measured')
})
