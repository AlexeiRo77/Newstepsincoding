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
  expect(chart.querySelector('g.bem-limit path')?.getAttribute('d')).toMatch(/^M[\d.,L]+$/)
  // Schumann: five resonances, five bars.
  expect(chart.querySelectorAll('g[data-emitter="schumann"] rect')).toHaveLength(5)
})

test('bands and the ICNIRP public limit match their definitions', () => {
  expect(bandsOf(7.83, 32.5)).toBe('theta, alpha, beta, gamma')
  expect(bandsOf(50, 60)).toBe('gamma')
  expect(bandsOf(16.7, 16.7)).toBe('beta')
  expect(bandsOf(8, 13)).toBe('alpha')
  expect(bandsOf(13, 13)).toBe('beta')
  expect(icnirpLimit(50)).toBeCloseTo(200e-6)
  expect(icnirpLimit(20)).toBeCloseTo(250e-6)
  expect(icnirpLimit(8 - 1e-9)).toBeCloseTo(icnirpLimit(8))
})
