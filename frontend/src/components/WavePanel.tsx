// One wave drawn as a captioned SVG panel with its real numbers underneath, shared by the wave pages.
// The shapes are illustrative; the numbers in the caption are the real ones.
import type { ReactNode } from 'react'

export const W = 720 // drawing width (viewBox units)
const H = 172 // drawing height: a 40-unit band on top for the one-cycle bracket, then the wave
export const MID = 104
const AMP = 52 // half-height of a full-size wave
const SAMPLES = 600

export const TAU = 2 * Math.PI

// y = f(x) for x in 0…1 (left to right), f in −1…1, as an SVG path.
export function wavePath(f: (x: number) => number): string {
  const pts: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES
    pts.push(`${(x * W).toFixed(1)},${(MID - AMP * f(x)).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

// An alpha rhythm (10 Hz) waxing and waning, with faster beta ripple and a little irregular drift —
// the look of a real EEG trace. Fixed frequencies keep the picture the same on every render.
export const eeg = (x: number) =>
  (0.55 + 0.3 * Math.sin(TAU * 1.3 * x)) * Math.sin(TAU * 10 * x) +
  0.18 * Math.sin(TAU * 23 * x + 1) +
  0.12 * Math.sin(TAU * 37 * x + 2) +
  0.1 * Math.sin(TAU * 3.1 * x + 0.5)

export interface Wave {
  id: string
  title: string
  what: string
  facts: [string, string][]
  color: string
  path: string
  // One period of the drawn wave, as a fraction of the width, for the bracket over the first cycle.
  period: number
  periodLabel: string
  // Drawn under the wave: gradients, envelopes, particles.
  extras?: ReactNode
  // An unconfirmed idea rather than a measured wave: drawn dashed and badged.
  hypothesis?: boolean
}

export function WavePanel({ wave }: { wave: Wave }) {
  const bracketEnd = wave.period * W
  return (
    <figure className={wave.hypothesis ? 'wave wave-hypothesis' : 'wave'}>
      <figcaption>
        <h2>
          {wave.title}
          {wave.hypothesis && <span className="wave-badge">Hypothesis — not confirmed</span>}
        </h2>
        <p>{wave.what}</p>
      </figcaption>
      <svg className="wave-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${wave.title} drawing`}>
        {wave.extras}
        <line className="wave-axis" x1={0} x2={W} y1={MID} y2={MID} />
        <path className="wave-line" d={wave.path} stroke={wave.color} />
        <g className="wave-bracket">
          <path d={`M0,10 V4 H${bracketEnd} V10`} />
          <text x={bracketEnd + 6} y={2} dominantBaseline="hanging">
            {wave.periodLabel}
          </text>
        </g>
      </svg>
      <dl className="wave-facts">
        {wave.facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </figure>
  )
}
