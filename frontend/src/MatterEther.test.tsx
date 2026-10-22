import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import MatterEther, {
  CMB_K,
  ELECTRON_EV,
  expectedFringeShift,
  photonHz,
  photonWavelength,
  sx,
  wienPeakHz,
} from './pages/MatterEther'

test('compares three ether theories, each with its verdict', () => {
  render(<MatterEther />)
  const badge = (id: string) => document.querySelector(`#${id} .wave-badge`)?.textContent
  expect(badge('classical')).toBe('Ruled out')
  expect(badge('light-speed')).toBe('Ether ruled out')
  expect(badge('annihilation')).toBe('Antimatter confirmed')
  expect(badge('dirac')).toBe('Superseded')
  expect(badge('vacuum')).toBe('Current physics')
  for (const id of ['classical', 'dirac', 'vacuum']) {
    const terms = [...document.querySelectorAll(`#${id} dt`)].map((dt) => dt.textContent)
    expect(terms).toEqual(['When', 'Light is', 'Antimatter', 'Evidence'])
  }
  expect(screen.getByRole('img', { name: /^Dirac's sea/ })).toBeInTheDocument()
})

test('each of the four phenomena gets both pictures, the test and the outcome', () => {
  render(<MatterEther />)
  const ids = ['light-speed', 'annihilation', 'spectrum', 'cosmic']
  for (const id of ids) {
    const terms = [...document.querySelectorAll(`#${id} dt`)].map((dt) => dt.textContent)
    expect(terms).toEqual(['Antimatter picture', 'Ether picture', 'Test', 'Outcome'])
  }
  // The Michelson–Morley expectation is computed, not typed in.
  expect(document.querySelector('#light-speed')?.textContent).toMatch(/shifted the fringes by 0\.44 of a fringe/)
  expect(document.querySelector('#annihilation')?.textContent).toMatch(/511 keV each.*1\.022 MeV/)
  expect(document.querySelector('#cosmic')?.textContent).toMatch(/2\.7255 K, brightest near 160 GHz/)
  expect(screen.getByRole('img', { name: /^Annihilation: an electron and a positron/ })).toBeInTheDocument()
})

test('the spectrum strip marks the CMB, visible light, the 511 keV line and the pair threshold in order', () => {
  render(<MatterEther />)
  const chart = screen.getByRole('img', { name: /^The electromagnetic spectrum/ })
  const marks = [...chart.querySelectorAll('g.mae-mark')]
  expect(marks.map((m) => m.getAttribute('data-mark'))).toEqual(['cmb', 'visible', 'annihilation', 'pair'])
  const xs = marks.map((m) => Number(m.querySelector('line')?.getAttribute('x1')))
  expect(xs).toEqual([...xs].sort((a, b) => a - b))
  // Pair threshold is twice the annihilation energy: log10(2) of a decade to the right.
  expect(xs[3] - xs[2]).toBeCloseTo((sx(1e20) - sx(1e19)) * Math.log10(2), 5)
})

test('photon and black-body numbers match physics', () => {
  expect(photonHz(ELECTRON_EV)).toBeCloseTo(1.2356e20, -16)
  // The 511 keV photon's wavelength is the electron's Compton wavelength, 2.426 pm.
  expect(photonWavelength(ELECTRON_EV)).toBeCloseTo(2.4263e-12, 15)
  expect(photonHz(1)).toBeCloseTo(2.418e14, -11)
  expect(wienPeakHz(CMB_K) / 1e9).toBeCloseTo(160.2, 1)
  expect(expectedFringeShift(11, 30e3, 500e-9)).toBeCloseTo(0.44, 2)
})
