// Sound that makes electromagnetic waves: three measured effects side by side (sonoluminescence, the
// piezoelectric effect, the seismoelectric effect). Each panel draws the sound wave with the EM output it
// causes on a shared time axis, then a chart of EM output against sound amplitude. Thresholds, slopes and
// ranges are the measured ones from each caption; the time traces are illustrative. Everything is computed
// here; no API call.
import { TAU, W, wavePath } from '../components/WavePanel'

const gauss = (x: number, at: number, width: number) => Math.exp(-(((x - at) / width) ** 2))
const frac = (x: number) => x - Math.floor(x)

// Time picture: the sound track on top, the EM track under it, the same time axis for both.
const TH = 236
const SOUND_MID = 72
const EM_MID = 190
const TRACK_AMP = 36
const CYCLES = 4

// Pressure starts at its lowest point (rarefaction), as in a bubble's growth phase.
const sound = (x: number) => -Math.cos(TAU * CYCLES * x)

// Chart: plot area inside a 720 × 300 viewBox, axes on the left and bottom.
const CH = 300
const PL = 64
const PR = W - 16
const PT = 16
const PB = 250

interface Chart {
  xLabel: string
  yLabel: string
  x: [number, number]
  y: [number, number]
  xTicks: number[]
  yTicks: number[]
  // EM output for a sound amplitude, in the axis units; null where there is no output to draw.
  curve: (a: number) => number | null
  // Vertical markers: a threshold or a limit, labelled to the right (' / ' breaks the label's line).
  marks?: { at: number; label: string }[]
  // A shaded range of amplitudes where the effect stops (e.g. the bubble breaks up).
  shade?: [number, number]
}

interface Mechanism {
  id: string
  title: string
  what: string
  emName: string
  emColor: string
  // EM track, f(x) for x in 0…1; unipolar tracks (flashes) draw up from the baseline.
  em: (x: number) => number
  unipolar?: boolean
  timeNote: string
  chart: Chart
  facts: [string, string][]
}

// Sonoluminescence: one flash per sound cycle, at the bubble's collapse just after the pressure turns
// from pulling to squeezing. Real flashes last ~100 ps out of a 38 µs cycle; drawn far wider to be seen.
const FLASH_PHASE = 0.32
const flashes = (x: number) => gauss(frac(x * CYCLES), FLASH_PHASE, 0.012)

// Light per flash against drive: none below ~1.1 atm, a steep rise, then the bubble breaks up near 1.45 atm.
const SL_ON = 1.1
const SL_OFF = 1.45
const slLight = (p: number) => (p < SL_ON || p > SL_OFF ? null : ((p - SL_ON) / (SL_OFF - SL_ON)) ** 2.5)

// Quartz: open-circuit voltage = g11 × pressure × thickness, g11 ≈ 0.058 V·m/N, thickness 1 mm.
const QUARTZ_V_PER_KPA = 0.058 * 1e3 * 1e-3

// Seismoelectric: E ≈ C · k · P, C = 1e-7 V/Pa, k = 2π·100 Hz / 2000 m/s; in µV/m per kPa.
const SEISMO_UV_PER_KPA = 1e-7 * ((TAU * 100) / 2000) * 1e3 * 1e6

const MECHANISMS: Mechanism[] = [
  {
    id: 'sonoluminescence',
    title: 'Sonoluminescence — sound makes light',
    what: 'Strong ultrasound in water traps a tiny gas bubble. Each cycle the sound pulls the bubble open, then crushes it; at the instant of collapse the gas inside heats to thousands of degrees and gives off a flash of ultraviolet-to-blue light.',
    emName: 'Light flashes',
    emColor: '#5e35b1',
    em: flashes,
    unipolar: true,
    timeNote:
      'One flash per sound cycle, just after the pressure swings from pulling (low) to squeezing (high). Real flashes last about 100 ps of a 38 µs cycle — drawn much wider here so they can be seen.',
    chart: {
      xLabel: 'Sound pressure amplitude in the water, atm',
      yLabel: 'Light per flash, millions of photons',
      x: [0.9, 1.6],
      y: [0, 1],
      xTicks: [1, 1.2, 1.4, 1.6],
      yTicks: [0, 0.5, 1],
      curve: slLight,
      marks: [
        { at: SL_ON, label: 'light starts' },
        { at: SL_OFF, label: 'bubble / breaks up' },
      ],
      shade: [SL_OFF, 1.6],
    },
    facts: [
      ['Sound', 'ultrasound 20–40 kHz in water (shown: 26.5 kHz, one cycle ≈ 38 µs)'],
      ['Threshold', 'about 1.1 atm; above about 1.45 atm the bubble becomes unstable and breaks up'],
      ['Light', '200–700 nm (ultraviolet to blue), flashes of 50–300 ps, up to about a million photons each'],
      ['Bubble', 'grows from ~5 µm to ~50 µm, collapses to under 1 µm; the gas reaches thousands of kelvin'],
    ],
  },
  {
    id: 'piezoelectric',
    title: 'Piezoelectric effect — sound makes an electric field',
    what: 'Sound squeezes and stretches a quartz crystal. Its atoms carry charge, so the squeeze shifts charge to the faces and a voltage appears across the crystal — rising and falling in step with the sound, an electric field oscillating at the sound’s own frequency.',
    emName: 'Voltage / electric field',
    emColor: '#1565c0',
    em: sound,
    timeNote: 'The voltage follows the pressure in step: same frequency, same shape, no threshold.',
    chart: {
      xLabel: 'Sound pressure amplitude on the crystal, kPa',
      yLabel: 'Voltage across a 1 mm quartz plate, V',
      x: [0, 100],
      y: [0, 6],
      xTicks: [0, 25, 50, 75, 100],
      yTicks: [0, 2, 4, 6],
      curve: (p) => QUARTZ_V_PER_KPA * p,
    },
    facts: [
      ['Material', 'quartz: d₁₁ = 2.3 pC/N, g₁₁ ≈ 0.058 V·m/N'],
      ['Dependency', 'straight line: about 58 µV per pascal for a 1 mm plate — 5.8 V at 100 kPa'],
      ['EM wave', 'at the sound frequency: 1 MHz ultrasound gives a 1 MHz field (wavelength 300 m)'],
      ['Used in', 'hydrophones, contact microphones, ultrasound probes (run backwards, voltage makes sound)'],
    ],
  },
  {
    id: 'seismoelectric',
    title: 'Seismoelectric effect — sound in wet ground makes an electric field',
    what: 'A sound (seismic) wave passing through wet sand or rock pushes the pore water past the grains. The water drags the ions next to the grain surfaces with it — a tiny electric current — and an electric field travels along with the wave.',
    emName: 'Electric field',
    emColor: '#00838f',
    em: (x) => Math.sin(TAU * CYCLES * x),
    timeNote:
      'The field follows the pressure gradient, not the pressure, so it runs a quarter cycle out of step with the sound.',
    chart: {
      xLabel: 'Sound pressure amplitude in the pore water, kPa',
      yLabel: 'Electric field, µV/m',
      x: [0, 1],
      y: [0, 35],
      xTicks: [0, 0.25, 0.5, 0.75, 1],
      yTicks: [0, 10, 20, 30],
      curve: (p) => SEISMO_UV_PER_KPA * p,
    },
    facts: [
      ['Sound', 'seismic waves 10 Hz – 1 kHz in the ground (shown: 100 Hz at 2000 m/s)'],
      ['Coupling', 'about 10⁻⁸–10⁻⁶ V per Pa in water-filled sand and rock (shown: 10⁻⁷ V/Pa)'],
      ['Dependency', 'straight line: about 31 µV/m per kPa — measured fields are µV/m to mV/m'],
      ['Also', 'where the wave crosses a layer boundary it sends out a separate, faster EM pulse'],
    ],
  },
]

const sx = (c: Chart, v: number) => PL + ((v - c.x[0]) / (c.x[1] - c.x[0])) * (PR - PL)
const sy = (c: Chart, v: number) => PB - ((v - c.y[0]) / (c.y[1] - c.y[0])) * (PB - PT)
const fmt = (v: number) => String(+v.toFixed(2))

// The curve as an SVG path; a gap in it (null) starts a new segment.
function curvePath(c: Chart): string {
  const steps = 280
  let d = ''
  let pen = false
  for (let i = 0; i <= steps; i++) {
    const a = c.x[0] + ((c.x[1] - c.x[0]) * i) / steps
    const v = c.curve(a)
    if (v === null) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${sx(c, a).toFixed(1)},${sy(c, v).toFixed(1)}`
    pen = true
  }
  return d
}

function TimePicture({ m }: { m: Mechanism }) {
  const emPath = m.unipolar ? wavePath(m.em, EM_MID + TRACK_AMP, 2 * TRACK_AMP) : wavePath(m.em, EM_MID, TRACK_AMP)
  return (
    <svg className="sem-time" viewBox={`0 0 ${W} ${TH}`} role="img" aria-label={`${m.title}: sound and EM waves over time`}>
      {Array.from({ length: CYCLES + 1 }, (_, i) => (
        <line key={i} className="sem-grid" x1={(i / CYCLES) * W} x2={(i / CYCLES) * W} y1={30} y2={TH} />
      ))}
      <text className="sem-track-label" x={4} y={4} dominantBaseline="hanging" fill="#2e7d32">
        Sound pressure
      </text>
      <line className="wave-axis" x1={0} x2={W} y1={SOUND_MID} y2={SOUND_MID} />
      <path className="wave-line" d={wavePath(sound, SOUND_MID, TRACK_AMP)} stroke="#2e7d32" />
      <text className="sem-track-label" x={4} y={122} dominantBaseline="hanging" fill={m.emColor}>
        {m.emName}
      </text>
      <line
        className="wave-axis"
        x1={0}
        x2={W}
        y1={m.unipolar ? EM_MID + TRACK_AMP : EM_MID}
        y2={m.unipolar ? EM_MID + TRACK_AMP : EM_MID}
      />
      <path className="wave-line" d={emPath} stroke={m.emColor} />
    </svg>
  )
}

function DependencyChart({ m }: { m: Mechanism }) {
  const c = m.chart
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ {c.yLabel}</p>
      <svg className="sem-plot" viewBox={`0 0 ${W} ${CH}`} role="img" aria-label={`${m.title}: ${c.yLabel} against ${c.xLabel}`}>
        {c.shade && (
          <g className="sem-shade">
            <rect x={sx(c, c.shade[0])} y={PT} width={sx(c, c.shade[1]) - sx(c, c.shade[0])} height={PB - PT} />
          </g>
        )}
        {c.yTicks.map((t) => (
          <g key={`y${t}`}>
            <line className="sem-grid" x1={PL} x2={PR} y1={sy(c, t)} y2={sy(c, t)} />
            <text className="sem-tick" x={PL - 8} y={sy(c, t)} textAnchor="end" dominantBaseline="middle">
              {fmt(t)}
            </text>
          </g>
        ))}
        {c.xTicks.map((t) => (
          <text key={`x${t}`} className="sem-tick" x={sx(c, t)} y={PB + 8} textAnchor="middle" dominantBaseline="hanging">
            {fmt(t)}
          </text>
        ))}
        <path className="sem-axes" d={`M${PL},${PT} V${PB} H${PR}`} />
        {c.marks?.map((mk) => (
          <g key={mk.label} className="sem-mark">
            <line x1={sx(c, mk.at)} x2={sx(c, mk.at)} y1={PT} y2={PB} />
            <text x={sx(c, mk.at) + 6} y={PT + 4} dominantBaseline="hanging">
              {mk.label.split(' / ').map((line, j) => (
                <tspan key={line} x={sx(c, mk.at) + 6} dy={j === 0 ? 0 : '1.2em'}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        <path className="sem-curve" d={curvePath(c)} stroke={m.emColor} />
      </svg>
      <p className="sem-axis-title sem-x-title">{c.xLabel} →</p>
    </div>
  )
}

function MechanismPanel({ m }: { m: Mechanism }) {
  return (
    <figure className="wave sem">
      <figcaption>
        <h2>{m.title}</h2>
        <p>{m.what}</p>
      </figcaption>
      <h3 className="sem-sub">Sound and the EM wave it causes</h3>
      <TimePicture m={m} />
      <p className="muted sem-note">{m.timeNote}</p>
      <h3 className="sem-sub">How the EM output depends on the sound’s strength</h3>
      <DependencyChart m={m} />
      <dl className="wave-facts">
        {m.facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </figure>
  )
}

export default function SoundEm() {
  return (
    <div className="waves">
      <h1>Sound that makes electromagnetic waves</h1>
      <p className="muted">
        Sound is a pressure wave; light and radio are electromagnetic (EM) waves. Normally one does not turn into
        the other, but in three measured effects sound does give off EM waves. Each panel draws the sound and the
        EM wave it causes on the same time axis (vertical lines mark sound cycles), then a chart of EM output
        against sound strength using the measured numbers written under it.
      </p>
      {MECHANISMS.map((m) => (
        <MechanismPanel key={m.id} m={m} />
      ))}
    </div>
  )
}
