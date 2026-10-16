// Four kinds of wave side by side: a brain wave (EEG), a radio wave, a sound wave and a light wave.
// The shapes are illustrative — chosen so each kind is recognisable, not drawn to a common scale; the real
// numbers are in each panel's caption. Everything is computed here; no API call.

const W = 720 // drawing width (viewBox units)
const H = 172 // drawing height: a 40-unit band on top for the one-cycle bracket, then the wave
const MID = 104
const AMP = 52 // half-height of a full-size wave
const SAMPLES = 600

// y = f(x) for x in 0…1 (left to right), f in −1…1, as an SVG path.
function wavePath(f: (x: number) => number): string {
  const pts: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES
    pts.push(`${(x * W).toFixed(1)},${(MID - AMP * f(x)).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

const TAU = 2 * Math.PI

// An alpha rhythm (10 Hz) waxing and waning, with faster beta ripple and a little irregular drift —
// the look of a real EEG trace. Fixed frequencies keep the picture the same on every render.
const eeg = (x: number) =>
  (0.55 + 0.3 * Math.sin(TAU * 1.3 * x)) * Math.sin(TAU * 10 * x) +
  0.18 * Math.sin(TAU * 23 * x + 1) +
  0.12 * Math.sin(TAU * 37 * x + 2) +
  0.1 * Math.sin(TAU * 3.1 * x + 0.5)

// AM radio: a fast carrier whose height follows a slow audio signal (the envelope).
const RADIO_CARRIER = 36
const RADIO_SIGNAL = 2
const radioEnvelope = (x: number) => 0.6 + 0.35 * Math.sin(TAU * RADIO_SIGNAL * x)
const radio = (x: number) => radioEnvelope(x) * Math.sin(TAU * RADIO_CARRIER * x)

// Sound: air pressure rises and falls; the air itself bunches up (compressions) and spreads out
// (rarefactions). Each particle sits at x0 + D·sin(k·x0); pressure is highest where they bunch.
const SOUND_CYCLES = 4
const sound = (x: number) => -Math.cos(TAU * SOUND_CYCLES * x)
const SOUND_PARTICLES = Array.from({ length: 140 }, (_, i) => {
  const x0 = (i + 0.5) / 140
  return x0 + (0.8 / (TAU * SOUND_CYCLES)) * Math.sin(TAU * SOUND_CYCLES * x0)
})

// Light: a fast, even oscillation of the electric field, coloured across the visible spectrum.
const LIGHT_CYCLES = 30
const light = (x: number) => Math.sin(TAU * LIGHT_CYCLES * x)
const SPECTRUM = ['#7b2cbf', '#3a0ca3', '#0077ff', '#00b4d8', '#2dc653', '#ffd60a', '#ff8800', '#e01e37']

interface Wave {
  id: string
  title: string
  what: string
  facts: [string, string][]
  color: string
  path: string
  // One period of the drawn wave, as a fraction of the width, for the bracket over the first cycle.
  period: number
  periodLabel: string
}

const WAVES: Wave[] = [
  {
    id: 'brain',
    title: 'Brain wave',
    what: 'The tiny voltage of millions of neurons firing together, picked up by electrodes on the scalp (EEG). Not a wave that travels through space — a rhythm of electrical activity.',
    facts: [
      ['Frequency', 'delta 0.5–4 Hz · theta 4–8 Hz · alpha 8–13 Hz · beta 13–30 Hz · gamma 30–100 Hz'],
      ['Shown', 'alpha rhythm, about 10 Hz (relaxed, eyes closed)'],
      ['Strength', 'about 10–100 µV at the scalp'],
    ],
    color: '#c2185b',
    path: wavePath(eeg),
    period: 1 / 10,
    periodLabel: '≈ 0.1 s',
  },
  {
    id: 'radio',
    title: 'Radio wave',
    what: 'An electromagnetic wave sent from an antenna. In AM radio the height of a fast carrier wave is shaped by the sound being broadcast (the dashed envelope).',
    facts: [
      ['Frequency', '3 kHz – 300 GHz (AM broadcast 530–1700 kHz, FM 88–108 MHz)'],
      ['Wavelength', '1 mm – 100 km (FM 100 MHz ≈ 3 m)'],
      ['Speed', '299 792 km/s, the speed of light'],
    ],
    color: '#1565c0',
    path: wavePath(radio),
    period: 1 / RADIO_CARRIER,
    periodLabel: 'λ ≈ 3 m',
  },
  {
    id: 'sound',
    title: 'Sound wave',
    what: 'A pressure wave: air is pushed together (compressions) and pulled apart (rarefactions). The dots are air, the curve is the pressure — highest where the dots bunch up.',
    facts: [
      ['Frequency', 'human hearing 20 Hz – 20 kHz (note A4 = 440 Hz)'],
      ['Wavelength', '1.7 cm – 17 m in air (440 Hz ≈ 78 cm)'],
      ['Speed', '343 m/s in air at 20 °C — a million times slower than light'],
    ],
    color: '#2e7d32',
    path: wavePath(sound),
    period: 1 / SOUND_CYCLES,
    periodLabel: 'λ ≈ 78 cm',
  },
  {
    id: 'light',
    title: 'Light wave',
    what: 'An electromagnetic wave, like radio, but oscillating about a million times faster. Its wavelength sets its colour: violet is short, red is long.',
    facts: [
      ['Frequency', '400–790 THz (visible light)'],
      ['Wavelength', '380 nm (violet) – 750 nm (red)'],
      ['Speed', '299 792 km/s'],
    ],
    color: 'url(#light-spectrum)',
    path: wavePath(light),
    period: 1 / LIGHT_CYCLES,
    periodLabel: 'λ ≈ 0.5 µm',
  },
]

function Extras({ id }: { id: string }) {
  if (id === 'radio') {
    const upper = wavePath(radioEnvelope)
    const lower = wavePath((x) => -radioEnvelope(x))
    return (
      <g className="wave-envelope">
        <path d={upper} />
        <path d={lower} />
      </g>
    )
  }
  if (id === 'sound') {
    // A band of air below the curve: deterministic scatter in y, x from the compressed positions.
    return (
      <g className="wave-air">
        {SOUND_PARTICLES.flatMap((x, i) =>
          [0, 1, 2].map((r) => <circle key={`${i}-${r}`} cx={x * W} cy={MID - 14 + r * 14 + ((i * 7 + r * 3) % 5) - 2} r={2.2} />),
        )}
      </g>
    )
  }
  if (id === 'light') {
    return (
      <defs>
        <linearGradient id="light-spectrum" x1="0" x2="1" y1="0" y2="0">
          {SPECTRUM.map((c, i) => (
            <stop key={c} offset={i / (SPECTRUM.length - 1)} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
    )
  }
  return null
}

function WavePanel({ wave }: { wave: Wave }) {
  const bracketEnd = wave.period * W
  return (
    <figure className="wave">
      <figcaption>
        <h2>{wave.title}</h2>
        <p>{wave.what}</p>
      </figcaption>
      <svg className="wave-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${wave.title} drawing`}>
        <Extras id={wave.id} />
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

export default function Waves() {
  return (
    <div className="waves">
      <h1>Four kinds of wave</h1>
      <p className="muted">
        Brain, radio, sound and light waves drawn side by side. The shapes are illustrative and not to a
        common scale — the real frequencies and wavelengths are written under each one. The bracket marks one
        cycle.
      </p>
      {WAVES.map((w) => (
        <WavePanel key={w.id} wave={w} />
      ))}
    </div>
  )
}
