import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import BodyWaves from './pages/BodyWaves'

test('draws the body figure and each electromagnetic and sound wave with its real numbers', () => {
  render(<BodyWaves />)
  expect(screen.getByRole('img', { name: 'Human body with the waves it gives off' })).toBeInTheDocument()
  for (const name of [
    'Infrared heat',
    'Heart electrical signal (ECG)',
    'Brain electrical signal (EEG)',
    'Biophotons (ultra-weak light)',
    'Heartbeat sound',
    'Breathing sound',
    'Gut sounds',
    'Muscle sound',
  ]) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    const plot = screen.getByRole('img', { name: `${name} drawing` })
    expect(plot.querySelector('path.wave-line')?.getAttribute('d')).toMatch(/^M[\d.,L-]+$/)
  }
  expect(screen.getByText(/brightest near 9.3 µm/)).toBeInTheDocument()
  expect(screen.getByText(/about 1 mV at the skin/)).toBeInTheDocument()
  expect(screen.getByText(/12–20 breaths a minute/)).toBeInTheDocument()
})

test('marks Garyaev’s wave genome as an unconfirmed hypothesis', () => {
  render(<BodyWaves />)
  const heading = screen.getByRole('heading', { name: /Garyaev’s “wave genome”/ })
  expect(heading).toHaveTextContent('Hypothesis — not confirmed')
  expect(heading.closest('figure')).toHaveClass('wave-hypothesis')
  expect(screen.getByText(/not reproduced by independent laboratories/)).toBeInTheDocument()
})
