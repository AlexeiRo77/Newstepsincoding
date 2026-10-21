import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import BrainEmitters, { bandsOf, icnirpLimit } from './pages/BrainEmitters'

test('lists each emitter with its frequency, brain band, field and studied effects', () => {
  render(<BrainEmitters />)
  const cards = document.querySelectorAll('figure.bem')
  expect(cards.length).toBeGreaterThanOrEqual(8)
  expect(cards.length).toBeLessThanOrEqual(12)
  cards.forEach((card) => {
    const terms = [...card.querySelectorAll('dt')].map((dt) => dt.textContent)
    expect(terms).toEqual(['Frequency', 'Brain band', 'Field', 'Effects'])
    expect(card.querySelector('.wave-badge')?.textContent).toBeTruthy()
  })
  for (const name of [/Schumann resonances/, /Mains wiring at home/, /Electric railways at 16.7 Hz/]) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
  }
  expect(screen.getByText(/ZEVS/, { selector: 'dd' })).toBeInTheDocument()
  // Effects are labelled by evidence; none of the emitters is confirmed to act on the brain.
  const badge = (id: string) => document.querySelector(`#${id} .wave-badge`)?.textContent
  expect(badge('schumann')).toBe('Effects reported, not confirmed')
  expect(badge('elf-transmitters')).toBe('No effect found')
  expect(badge('tyres')).toBe('Not studied')
  expect(badge('brain')).toBe('For scale')
  expect(document.querySelector('g.bem-phosphene text')?.textContent).toBe('flashes seen — confirmed')
})

test('the chart draws one marker per emitter, the five EEG bands and the ICNIRP limit', () => {
  render(<BrainEmitters />)
  const chart = screen.getByRole('img', { name: /^Brain-band emitters: magnetic field against frequency/ })
  expect(chart.querySelectorAll('g.bem-mark')).toHaveLength(document.querySelectorAll('figure.bem').length)
  expect([...chart.querySelectorAll('g.bem-band text')].map((t) => t.textContent)).toEqual([
    'delta',
    'theta',
    'alpha',
    'beta',
    'gamma',
  ])
  // The limit is drawn only where it fits under the 10 mT top of the chart (from 2 Hz up).
  const limit = chart.querySelector('g.bem-limit path')?.getAttribute('d') ?? ''
  expect(limit).toMatch(/^M[\d.,L]+$/)
  const ys = [...limit.matchAll(/[ML][\d.]+,([\d.]+)/g)].map((m) => Number(m[1]))
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(40)
  // Schumann: five resonances, five bars.
  expect(chart.querySelectorAll('g[data-emitter="schumann"] rect')).toHaveLength(5)
})

test('bands and the ICNIRP public limit match their definitions', () => {
  expect(bandsOf(7.83, 32.5)).toBe('theta, alpha, beta, gamma')
  expect(bandsOf(50, 60)).toBe('gamma')
  expect(bandsOf(16.7, 16.7)).toBe('beta')
  expect(bandsOf(8, 13)).toBe('alpha')
  expect(bandsOf(0.5, 5)).toBe('delta, theta')
  expect(bandsOf(1, 20)).toBe('delta, theta, alpha, beta')
  expect(bandsOf(13, 13)).toBe('beta')
  expect(icnirpLimit(50)).toBeCloseTo(200e-6)
  expect(icnirpLimit(20)).toBeCloseTo(250e-6)
  expect(icnirpLimit(8 - 1e-9)).toBeCloseTo(icnirpLimit(8))
})
