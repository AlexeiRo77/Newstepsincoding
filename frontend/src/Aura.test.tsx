import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Aura, {
  CLAIMED,
  claimedFreq,
  freqColour,
  HUNT_BAND,
  heatPeak,
  measuredLayers,
  placeLabels,
  rippleCount,
  rippleHeight,
  ringPath,
  skinPower,
  vibrationDb,
} from './pages/Aura'

const layer = (state: 'rest' | 'exercise' | 'sleep', id: string) => {
  const l = measuredLayers(state).find((x) => x.id === id)
  if (!l) throw new Error(id)
  return l
}

test('skin at 33 °C radiates about 490 W/m², peaking near 18 THz', () => {
  expect(skinPower(306)).toBeCloseTo(486, -1)
  expect(heatPeak(306) / 1e12).toBeCloseTo(18, 0)
})

test('vibration is decibels above the sensor: 20 per decade for fields, 10 for powers', () => {
  expect(vibrationDb({ value: 1e-3, floor: 1e-6, kind: 'field' })).toBeCloseTo(60, 6)
  expect(vibrationDb({ value: 1e-3, floor: 1e-6, kind: 'power' })).toBeCloseTo(30, 6)
  // The heart's magnetic field is the strongest vibration; the biophoton glow the faintest.
  const rest = measuredLayers('rest').map((l) => [l.id, vibrationDb(l)] as const)
  const best = rest.reduce((a, b) => (b[1] > a[1] ? b : a))
  const worst = rest.reduce((a, b) => (b[1] < a[1] ? b : a))
  expect(best[0]).toBe('mcg')
  expect(worst[0]).toBe('biophotons')
  expect(vibrationDb(layer('rest', 'heat'))).toBeCloseTo(31.8, 0)
})

test('the body state moves the heart and brain frequencies and the muscle vibration', () => {
  expect(layer('rest', 'ecg').freq).toBe(1.2)
  expect(layer('exercise', 'ecg').freq).toBe(2.5)
  expect(layer('sleep', 'eeg').freq).toBe(2)
  expect(vibrationDb(layer('exercise', 'emg'))).toBeGreaterThan(vibrationDb(layer('sleep', 'emg')) + 30)
})

test('every claimed aura colour is visible light, far from Hunt’s band and every measured field', () => {
  expect(CLAIMED).toHaveLength(7)
  for (const c of CLAIMED) {
    expect(claimedFreq(c)).toBeGreaterThan(4e14)
    expect(claimedFreq(c)).toBeLessThan(7.5e14)
  }
  // Rising frequency outward, red to violet.
  const f = CLAIMED.map(claimedFreq)
  expect([...f].sort((a, b) => a - b)).toEqual(f)
  expect(layer('rest', 'emg').freq).toBeGreaterThanOrEqual(HUNT_BAND[0])
  expect(layer('rest', 'emg').freq).toBeLessThanOrEqual(HUNT_BAND[1])
})

test('ripples tighten with frequency and grow with vibration; colours run along the scale', () => {
  expect(rippleCount(1e14)).toBeGreaterThan(rippleCount(10))
  expect(rippleHeight(80)).toBeGreaterThan(rippleHeight(20))
  expect(rippleHeight(-5)).toBe(0)
  expect(freqColour(0.1)).toBe('rgb(106,76,147)')
  expect(freqColour(1e15)).toBe('rgb(255,89,94)')
  expect(ringPath(0, 6, 4)).toMatch(/^M[\d.]+,[\d.]+(L[\d.]+,[\d.]+){360}Z$/)
})

test('the page redraws by body state and layer', () => {
  render(<Aura />)
  expect(screen.getByRole('heading', { name: 'The human aura in 2D' })).toBeInTheDocument()
  expect(document.querySelectorAll('svg[data-side="claimed"] [data-layer]').length).toBe(7)
  expect(document.querySelectorAll('svg[data-side="measured"] [data-layer]').length).toBe(8)
  expect(document.querySelectorAll('[data-point]').length).toBe(8)
  expect(document.querySelectorAll('[data-band]').length).toBe(2)

  expect(screen.getByTestId('measured-detail').textContent).toMatch(/Heart magnetism \(MCG\)Frequency1\.2 Hz/)
  fireEvent.click(screen.getByRole('button', { name: 'Hard exercise' }))
  expect(screen.getByTestId('measured-detail').textContent).toMatch(/Frequency2\.5 Hz/)
  fireEvent.click(screen.getByRole('button', { name: 'Brain (EEG)' }))
  expect(screen.getByTestId('measured-detail').textContent).toMatch(/beta rhythm/)
  fireEvent.click(document.querySelector('svg[data-side="measured"] [data-layer="heat"]') as Element)
  expect(screen.getByTestId('measured-detail').textContent).toMatch(/^Heat \(infrared\)/)

  expect(screen.getByTestId('claimed-detail').textContent).toMatch(/Etheric bodyColourRed, 680 nm/)
  fireEvent.click(screen.getByRole('button', { name: 'Ketheric template' }))
  expect(screen.getByTestId('claimed-detail').textContent).toMatch(/Violet, 410 nm.*730 THz/)
  for (const id of ['readers', 'kirlian', 'glow'])
    expect(document.querySelector(`#${id} .wave-badge`)?.textContent).toBe('Measured')
})

test('a chart label moves off a neighbouring point', () => {
  const area = { l: 0, r: 720, t: 0, b: 400 }
  const pts = [
    { x: 100, y: 100, text: 'Heart (ECG)' },
    { x: 130, y: 100, text: 'Brain (MEG)' },
  ]
  const [a, b] = placeLabels(pts, area)
  expect(a.anchor).not.toBe('start') // going right would cover the second point
  expect(b.anchor).toBe('start')
})
