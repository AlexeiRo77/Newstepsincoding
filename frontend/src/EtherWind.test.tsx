import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import EtherWind, {
  CMB_LAT,
  CMB_LON,
  EXPERIMENTS,
  earthVelocity,
  fringeAt,
  INSTRUMENTS,
  MILLER_H,
  MOUNT_WILSON,
  roundTripSpeed,
  seasonSpeeds,
  speed,
  streamlines,
  V_ORBIT,
  windAtHeight,
  windDirection,
} from './pages/EtherWind'

const mm = INSTRUMENTS[0]

test('the CMB dipole lies near ecliptic longitude 172°, 11° south of the ecliptic', () => {
  expect(CMB_LON).toBeCloseTo(171.6, 0)
  expect(CMB_LAT).toBeCloseTo(-11.1, 0)
})

test('the orbital wind is 30 km/s all year; with the CMB motion it swings 340–400 km/s, peaking in December', () => {
  for (const v of seasonSpeeds('sun')) expect(v).toBeCloseTo(V_ORBIT, 6)
  const cmb = seasonSpeeds('cmb')
  expect(Math.min(...cmb)).toBeGreaterThan(335)
  expect(Math.max(...cmb)).toBeLessThan(400)
  expect(cmb.indexOf(Math.max(...cmb))).toBe(11)
  expect(cmb.indexOf(Math.min(...cmb))).toBe(5)
  // The Earth heads 90° west of the Sun: at the March equinox (Sun at 0°) it moves toward longitude 270°.
  const [vx, vy] = earthVelocity(2, 'sun')
  expect(Math.atan2(vy, vx)).toBeLessThan(-Math.PI / 2 + 0.2)
  expect(speed(earthVelocity(2, 'sun'))).toBeCloseTo(V_ORBIT, 6)
})

test('Michelson–Morley: 0.37 fringe on turning 90° at 30 km/s, light slowest along the wind', () => {
  expect(fringeAt(mm, V_ORBIT, 0) - fringeAt(mm, V_ORBIT, 90)).toBeCloseTo(0.37, 2)
  expect(fringeAt(mm, V_ORBIT, 45)).toBeCloseTo(0, 12)
  expect(roundTripSpeed(V_ORBIT, 0)).toBeLessThan(roundTripSpeed(V_ORBIT, 90))
  expect(1 - roundTripSpeed(V_ORBIT, 0)).toBeCloseTo(1e-8, 9)
})

test('a dragged ether fitted to Miller gives 10 km/s at Mount Wilson; a still one gives the full wind', () => {
  expect(MILLER_H).toBeCloseTo(4.3, 1)
  expect(windAtHeight('dragged', MOUNT_WILSON, MILLER_H)).toBeCloseTo(10, 6)
  expect(windAtHeight('dragged', 0, MILLER_H)).toBe(0)
  expect(windAtHeight('still', 0, MILLER_H)).toBe(V_ORBIT)
  expect(windDirection('dragged', 0, 0.5)).toBeNull()
  expect(windDirection('still', 0, 0.5)).toEqual([1, 0])
  for (const d of streamlines('dragged')) expect(d).toMatch(/^M[\d.]+,[\d.]+(L[\d.-]+,[\d.-]+){20,}$/)
})

test('Miller’s 10 km/s is the only claim; every limit sits below it, the modern ones under 1 m/s', () => {
  expect(EXPERIMENTS.filter((e) => e.kind === 'claim').map((e) => e.id)).toEqual(['miller'])
  for (const e of EXPERIMENTS.filter((x) => x.kind === 'limit')) expect(e.wind).toBeLessThan(10)
  const by = (id: string) => EXPERIMENTS.find((e) => e.id === id)?.wind ?? Number.NaN
  expect(by('mm1887')).toBeCloseTo(4.7, 1)
  expect(by('nagel')).toBeLessThan(1e-3)
})

test('the page redraws by month, frame, angle, model and experiment', () => {
  render(<EtherWind />)
  expect(screen.getByRole('heading', { name: 'The ether wind in 2D' })).toBeInTheDocument()
  expect(screen.getByTestId('orbit-wind').textContent).toBe('30 km/s')
  fireEvent.click(screen.getByRole('button', { name: 'Ether at rest with the CMB' }))
  expect(document.querySelector('svg[data-frame="cmb"]')).not.toBeNull()
  expect(Number.parseFloat(screen.getByTestId('orbit-wind').textContent ?? '')).toBeGreaterThan(300)
  fireEvent.change(screen.getByRole('slider', { name: /Month/ }), { target: { value: '11' } })
  expect(screen.getByRole('heading', { name: 'Mid-December' })).toBeInTheDocument()

  expect(screen.getByTestId('fringe-full').textContent).toMatch(/0\.37 of a fringe/)
  fireEvent.change(screen.getByRole('slider', { name: /Turn/ }), { target: { value: '90' } })
  expect(screen.getByTestId('fringe-now').textContent).toMatch(/^-0\.18 from/)

  expect(document.querySelector('svg[data-model="still"]')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Dragged ether (Stokes)' }))
  expect(document.querySelector('svg[data-model="dragged"]')).not.toBeNull()

  expect(screen.getByTestId('experiment-detail').textContent).toMatch(/Claimed wind/)
  fireEvent.click(screen.getByRole('button', { name: 'Joos 1930' }))
  expect(screen.getByTestId('experiment-detail').textContent).toMatch(/Joos, 1930No wind seen/)
  expect(document.querySelectorAll('g[data-experiment]').length).toBe(EXPERIMENTS.length)
  for (const id of ['mm-null', 'hammar', 'resonators'])
    expect(document.querySelector(`#${id} .wave-badge`)?.textContent).toBe('Measured')
})
