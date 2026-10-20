import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import SoundEm from './pages/SoundEm'

test('draws each sound-to-EM effect: aligned sound and EM waves, and a dependency chart with real numbers', () => {
  render(<SoundEm />)
  for (const name of [
    'Sonoluminescence — sound makes light',
    'Piezoelectric effect — sound makes an electric field',
    'Seismoelectric effect — sound in wet ground makes an electric field',
  ]) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    const time = screen.getByRole('img', { name: `${name}: sound and EM waves over time` })
    const lines = time.querySelectorAll('path.wave-line')
    expect(lines).toHaveLength(2)
    lines.forEach((l) => expect(l.getAttribute('d')).toMatch(/^M[\d.,L-]+$/))
    const chart = screen.getByRole('img', { name: new RegExp(`^${name}: .+ against .+`) })
    expect(chart.querySelector('path.sem-curve')?.getAttribute('d')).toMatch(/^M[\d.,LM-]+$/)
  }
  expect(screen.getByText(/about 1.1 atm/)).toBeInTheDocument()
  expect(screen.getByText(/5.8 V at 100 kPa/)).toBeInTheDocument()
  expect(screen.getByText(/about 31 µV\/m per kPa/)).toBeInTheDocument()
  expect(screen.getByText('breaks up')).toBeInTheDocument()
})

test('the sonoluminescence curve is dark below the threshold and stops where the bubble breaks up', () => {
  render(<SoundEm />)
  const chart = screen.getByRole('img', { name: /^Sonoluminescence — sound makes light: Light per flash/ })
  const d = chart.querySelector('path.sem-curve')?.getAttribute('d') ?? ''
  const xs = [...d.matchAll(/[ML]([\d.]+),/g)].map((m) => Number(m[1]))
  // x axis 0.9–1.6 atm over 64…704: 1.1 atm ≈ 246.9, 1.45 atm ≈ 566.9.
  expect(Math.min(...xs)).toBeGreaterThan(246)
  expect(Math.max(...xs)).toBeLessThan(568)
})
