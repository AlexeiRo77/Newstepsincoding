import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Waves from './pages/Waves'

test('draws the brain, radio, sound and light waves with their real numbers', () => {
  render(<Waves />)
  for (const name of ['Brain wave', 'Radio wave', 'Sound wave', 'Light wave']) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    const plot = screen.getByRole('img', { name: `${name} drawing` })
    expect(plot.querySelector('path.wave-line')?.getAttribute('d')).toMatch(/^M[\d.,L-]+$/)
  }
  expect(screen.getByText(/alpha 8–13 Hz/)).toBeInTheDocument()
  expect(screen.getByText(/FM 88–108 MHz/)).toBeInTheDocument()
  expect(screen.getByText(/A4 = 440 Hz/)).toBeInTheDocument()
  expect(screen.getByText(/380 nm \(violet\)/)).toBeInTheDocument()
})
