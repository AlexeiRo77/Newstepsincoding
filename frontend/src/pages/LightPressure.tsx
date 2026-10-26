// Light pressure by source: light carries momentum, so it pushes on whatever takes it in (p = I/c) or
// throws it back (p = 2I/c, a mirror facing the light). The page takes five real sources, from a laser
// pointer to the Sun, draws the pressure each puts on a plane around it as a 2D map (one log colour scale
// for all, so their strengths compare), then one log-log chart of pressure against distance and a table
// of the numbers, and sets it beside what experiments have measured. Everything is computed here; no API call.
import { useState } from 'react'
import { type Finding, MeasuredCards } from '../components/Spectrum'
import { W } from '../components/WavePanel'

export const C = 299_792_458 // speed of light, m/s
export const AU = 1.495_978_707e11 // m

// How a source sends out its light: evenly in all directions, or as a beam (Gaussian, waist w0 at z = 0,
// widening with half-angle theta), the beam's own Rayleigh length zR = w0/theta.
type Shape = { kind: 'isotropic'; radius: number } | { kind: 'beam'; w0: number; theta: number }

// Each map is a square on a plane through the source, `span` metres on a side; a beam's map is stretched
// across it, `across` metres high, since a beam is far narrower than it is long.
interface MapFrame {
  x0: number
  x1: number
  across?: number
  unit: [number, string] // metres per tick unit, and its name
  ticks: number[]
  rings?: [number, string][] // isotropic: circles at these distances (in the tick unit)
}

export interface Source {
  id: string
  name: string
  power: number // radiated light, W
  powerNote: string
  shape: Shape
  at: [number, string] // the reference point for the table: distance (m, from the source or the beam's waist)
  frame: MapFrame
  color: string
  range: [number, number] // where the chart draws it, m
}

// Ordered by power. Numbers are typical, not one product's datasheet.
export const SOURCES: Source[] = [
  {
    id: 'pointer',
    name: 'Green laser pointer',
    power: 5e-3,
    powerNote: '5 mW (the class 3R limit), a 1 mm beam widening by 1 mrad',
    shape: { kind: 'beam', w0: 0.5e-3, theta: 0.5e-3 },
    at: [1, '1 m from it, beam centre'],
    frame: { x0: 0, x1: 20, across: 0.03, unit: [1, 'm'], ticks: [0, 5, 10, 15, 20] },
    color: '#2e7d32',
    range: [1e-3, 1e4],
  },
  {
    id: 'led',
    name: 'LED bulb',
    power: 3,
    powerNote: '3 W of light from a 10 W bulb (the rest leaves as heat)',
    shape: { kind: 'isotropic', radius: 0.03 },
    at: [1, '1 m away'],
    frame: { x0: -2, x1: 2, unit: [1, 'm'], ticks: [-2, -1, 0, 1, 2], rings: [[0.5, '0.5 m'], [1, '1 m'], [2, '2 m']] },
    color: '#1565c0',
    range: [0.03, 100],
  },
  {
    id: 'lamp',
    name: '100 W filament lamp',
    power: 90,
    powerNote: 'about 90 W radiated, mostly infrared; under 5 W of it visible',
    shape: { kind: 'isotropic', radius: 0.03 },
    at: [1, '1 m away'],
    frame: { x0: -2, x1: 2, unit: [1, 'm'], ticks: [-2, -1, 0, 1, 2], rings: [[0.5, '0.5 m'], [1, '1 m'], [2, '2 m']] },
    color: '#ef6c00',
    range: [0.03, 100],
  },
  {
    id: 'cutter',
    name: 'Industrial cutting laser',
    power: 1e4,
    powerNote: '10 kW fibre laser focused to a 0.1 mm spot',
    shape: { kind: 'beam', w0: 50e-6, theta: 0.05 },
    at: [0, 'at the focus'],
    frame: { x0: -0.005, x1: 0.005, across: 0.0012, unit: [1e-3, 'mm'], ticks: [-5, -2.5, 0, 2.5, 5] },
    color: '#6a1b9a',
    range: [1e-5, 10],
  },
  {
    id: 'sun',
    name: 'The Sun',
    power: 3.828e26,
    powerNote: '3.83 × 10²⁶ W, its whole output',
    shape: { kind: 'isotropic', radius: 6.957e8 },
    at: [AU, 'at the Earth (1 AU)'],
    frame: {
      x0: -2 * AU,
      x1: 2 * AU,
      unit: [AU, 'AU'],
      ticks: [-2, -1, 0, 1, 2],
      rings: [[0.387, 'Mercury'], [0.723, 'Venus'], [1, 'Earth'], [1.524, 'Mars']],
    },
    color: '#c62828',
    range: [6.957e8, 1e13],
  },
]

export type Surface = 'absorber' | 'mirror'
export const surfaceFactor = (s: Surface) => (s === 'mirror' ? 2 : 1)

// Beam radius at z: w0 √(1 + (z/zR)²).
const beamRadius = (w0: number, theta: number, z: number) => w0 * Math.sqrt(1 + ((z * theta) / w0) ** 2)

// Intensity, W/m², at (x, y) on a plane through the source: x along a beam's axis (waist at 0), y across.
// Inside an isotropic source's own body it is undefined (NaN).
export function intensity(s: Source, x: number, y: number): number {
  if (s.shape.kind === 'isotropic') {
    const r2 = x * x + y * y
    if (r2 < s.shape.radius ** 2) return Number.NaN
    return s.power / (4 * Math.PI * r2)
  }
  const w = beamRadius(s.shape.w0, s.shape.theta, x)
  return ((2 * s.power) / (Math.PI * w * w)) * Math.exp((-2 * y * y) / (w * w))
}

// Pressure on a surface facing the light, Pa: momentum flux I/c, doubled when it is thrown back.
export const pressure = (s: Source, x: number, y: number, surface: Surface) =>
  (surfaceFactor(surface) * intensity(s, x, y)) / C

// The whole push if every bit of the light is caught: P/c, or 2P/c on a mirror. Distance plays no part.
export const totalForce = (s: Source, surface: Surface) => (surfaceFactor(surface) * s.power) / C

// Numbers as 4.5 × 10⁻⁶; plain under four digits.
const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
export function sci(v: number): string {
  if (v === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(v)))
  if (e >= -2 && e <= 3) return Number(v.toPrecision(2)).toLocaleString('en')
  const m = v / 10 ** e
  const ms = m.toFixed(1).replace(/\.0$/, '')
  const pow = `10${[...String(e)].map((c) => SUP[c]).join('')}`
  return ms === '1' ? pow : `${ms} × ${pow}`
}

// One colour scale for every map: a band per decade of pressure from 10⁻¹² to 10⁴ Pa (dark = little light).
export const LOG_MIN = -12
export const LOG_MAX = 4
const STOPS = [
  [0, 0, 4],
  [66, 10, 104],
  [147, 38, 103],
  [221, 81, 58],
  [252, 165, 10],
  [252, 255, 164],
]
function rampColor(t: number) {
  const f = Math.max(0, Math.min(1, t)) * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(f))
  const u = f - i
  return `rgb(${STOPS[i].map((a, k) => Math.round(a + (STOPS[i + 1][k] - a) * u)).join(',')})`
}
const BANDS = LOG_MAX - LOG_MIN
export const bandOf = (p: number) => Math.max(0, Math.min(BANDS - 1, Math.floor(Math.log10(p) - LOG_MIN)))
const bandColor = (b: number) => rampColor(b / (BANDS - 1))
const RAMP_CSS = `linear-gradient(90deg, ${Array.from({ length: BANDS }, (_, b) => bandColor(b)).join(', ')})`

// The map: MAP_W × MAP_H viewBox units in square cells, grouped by colour into one path each.
const MAP = 360
const CELL = 4

export interface MapCell {
  x: number
  y: number
  band: number // -1 inside the source itself
}

export function mapCells(s: Source, surface: Surface): MapCell[] {
  const { x0, x1, across } = s.frame
  const h = across ?? x1 - x0
  const cells: MapCell[] = []
  for (let j = 0; j < MAP; j += CELL)
    for (let i = 0; i < MAP; i += CELL) {
      const x = x0 + ((i + CELL / 2) / MAP) * (x1 - x0)
      const y = h / 2 - ((j + CELL / 2) / MAP) * h
      const p = pressure(s, x, y, surface)
      cells.push({ x: i, y: j, band: Number.isNaN(p) ? -1 : bandOf(p) })
    }
  return cells
}

function PressureMap({ s, surface }: { s: Source; surface: Surface }) {
  const groups = new Map<string, string[]>()
  for (const c of mapCells(s, surface)) {
    const fill = c.band < 0 ? '#ffffff' : bandColor(c.band)
    const d = groups.get(fill) ?? []
    d.push(`M${c.x},${c.y}h${CELL}v${CELL}h-${CELL}z`)
    groups.set(fill, d)
  }
  const { x0, x1, unit, ticks, rings } = s.frame
  const mx = (v: number) => ((v * unit[0] - x0) / (x1 - x0)) * MAP
  const pad = 30
  return (
    <svg
      className="lp-map"
      viewBox={`-${pad / 2} -4 ${MAP + pad} ${MAP + pad}`}
      role="img"
      aria-label={`Light pressure around the ${s.name.replace(/^The /, '').toLowerCase()} on a ${surface}: bright where it pushes hardest`}
      data-map={s.id}
    >
      {[...groups].map(([fill, d]) => (
        <path key={fill} d={d.join('')} fill={fill} />
      ))}
      {rings?.map(([r, label]) => (
        <g key={label} className="lp-ring">
          <circle cx={MAP / 2} cy={MAP / 2} r={mx(r) - MAP / 2} />
          <text x={MAP / 2 + (mx(r) - MAP / 2) * 0.71 + 3} y={MAP / 2 - (mx(r) - MAP / 2) * 0.71 - 3}>
            {label}
          </text>
        </g>
      ))}
      <rect className="lp-frame" x={0} y={0} width={MAP} height={MAP} />
      {ticks.map((t) => (
        <text key={t} className="lp-tick" x={mx(t)} y={MAP + 6} textAnchor="middle" dominantBaseline="hanging">
          {t}
        </text>
      ))}
    </svg>
  )
}

function mapCaption(s: Source): string {
  const { x0, x1, across, unit } = s.frame
  const len = `${sci((x1 - x0) / unit[0])} ${unit[1]}`
  if (s.shape.kind === 'isotropic')
    return `A ${len} × ${len} square on a plane through the ${s.id === 'sun' ? 'Sun' : 'source'}, which sits at the centre; ticks in ${unit[1]}.`
  const h = across ?? 0
  return `Side view, ${len} along the beam (ticks in ${unit[1]}${s.id === 'cutter' ? ', 0 = the focus' : ', 0 = the pointer'}) and only ${sci(h * 1e3)} mm across it: the height is stretched ${Math.round((x1 - x0) / h)}× so the beam shows.`
}

// Chart: log distance across, log pressure up. 720 × 470 viewBox, like the other log-log charts.
const CH = 470
const PL = 64
const PR = W - 16
const PT = 24
const PB = 420
const R_MIN = 1e-5
const R_MAX = 1e13
const P_MIN = 1e-14
const P_MAX = 1e4
const cx = (r: number) => PL + (Math.log10(r / R_MIN) / Math.log10(R_MAX / R_MIN)) * (PR - PL)
const cy = (p: number) => PB - (Math.log10(p / P_MIN) / Math.log10(P_MAX / P_MIN)) * (PB - PT)
const R_TICKS: [number, string][] = [
  [1e-5, '10 µm'],
  [1e-3, '1 mm'],
  [1, '1 m'],
  [1e3, '1 km'],
  [1e6, '1000 km'],
  [AU, '1 AU'],
]
const P_TICKS = [-14, -10, -6, -2, 2].map((e) => 10 ** e)

// Along a beam's axis, or straight out from an isotropic source.
export const onAxis = (s: Source, r: number, surface: Surface) => pressure(s, r, 0, surface)

export function curvePath(s: Source, surface: Surface): string {
  const [a, b] = s.range
  const steps = 120
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const r = a * (b / a) ** (i / steps)
    const p = onAxis(s, r, surface)
    if (p > 0) pts.push(`${cx(r).toFixed(1)},${cy(Math.max(P_MIN, Math.min(P_MAX, p))).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

function PressureChart({ surface }: { surface: Surface }) {
  const sun = SOURCES.find((s) => s.id === 'sun') as Source
  const earth = onAxis(sun, AU, surface)
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Light pressure on a {surface}, Pa (log scale)</p>
      <svg
        className="sem-plot"
        viewBox={`0 0 ${W} ${CH}`}
        role="img"
        aria-label={`Light pressure against distance: one line per source, on a ${surface}`}
      >
        {P_TICKS.map((t) => (
          <g key={t}>
            <line className="sem-grid" x1={PL} x2={PR} y1={cy(t)} y2={cy(t)} />
            <text className="sem-tick" x={PL - 8} y={cy(t)} textAnchor="end" dominantBaseline="middle">
              {sci(t)}
            </text>
          </g>
        ))}
        {R_TICKS.map(([t, label]) => (
          <text key={label} className="sem-tick" x={cx(t)} y={PB + 8} textAnchor="middle" dominantBaseline="hanging">
            {label}
          </text>
        ))}
        <path className="sem-axes" d={`M${PL},${PT} V${PB} H${PR}`} />
        {SOURCES.map((s) => (
          <path key={s.id} className="sem-curve" data-series={s.id} d={curvePath(s, surface)} stroke={s.color} />
        ))}
        <g className="lp-earth">
          <circle cx={cx(AU)} cy={cy(earth)} r={6} />
          <text x={cx(AU) - 10} y={cy(earth) - 10} textAnchor="end">
            Earth
          </text>
        </g>
      </svg>
      <p className="sem-axis-title sem-x-title">Distance from the source, or from a laser’s focus (log scale) →</p>
      <ul className="skb-legend">
        {SOURCES.map((s) => (
          <li key={s.id}>
            <span className="lp-swatch" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PressureTable() {
  const cols = ['Light power', 'Where', 'Intensity', 'On an absorber', 'On a mirror', 'All light caught']
  return (
    <table className="lp-table">
      <caption>Light pressure of each source</caption>
      <thead>
        <tr>
          <th scope="col">Source</th>
          {cols.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {SOURCES.map((s) => {
          const [r, where] = s.at
          const values = [
            `${sci(s.power)} W`,
            where,
            `${sci(intensity(s, r, 0))} W/m²`,
            `${sci(pressure(s, r, 0, 'absorber'))} Pa`,
            `${sci(pressure(s, r, 0, 'mirror'))} Pa`,
            `${sci(totalForce(s, 'absorber'))} N absorbed, ${sci(totalForce(s, 'mirror'))} N reflected`,
          ]
          return (
            <tr key={s.id} data-source={s.id}>
              <th scope="row">
                <span className="lp-swatch" style={{ background: s.color }} />
                {s.name}
              </th>
              {values.map((v, i) => (
                <td key={cols[i]} data-label={cols[i]}>
                  {v}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const FINDINGS: Finding[] = [
  {
    id: 'lebedev',
    title: 'Light pressure was first measured in 1900',
    text: 'Pyotr Lebedev hung thin metal vanes, some blackened and some shiny, on a fine thread in a vacuum and shone an arc lamp on them. The vanes turned, the shiny ones about twice as hard — the I/c and 2I/c of Maxwell’s theory. Nichols and Hull confirmed it independently in 1901.',
    source: 'Lebedev, Annalen der Physik (1901); Nichols & Hull, Physical Review (1901)',
  },
  {
    id: 'ikaros',
    title: 'Sunlight sailed a spacecraft',
    text: 'JAXA’s IKAROS unfurled a 14 m × 14 m sail of thin polyimide in 2010 on its way to Venus. Sunlight pushed it with about 1.1 mN — the 9 µPa of a mirror at the Earth on 196 m² — and the probe’s orbit changed as predicted. Comet dust tails, pushed away from the Sun, show the same force in nature.',
    source: 'Tsuda et al., Acta Astronautica (2011)',
  },
  {
    id: 'tweezers',
    title: 'Focused laser light holds cells',
    text: 'A laser focused through a microscope traps beads, bacteria and single DNA strands by the push and pull of its light, with forces of piconewtons. Arthur Ashkin built the first such “optical tweezers” in 1986 and shared the 2018 Nobel Prize in Physics for them.',
    source: 'Ashkin et al., Optics Letters (1986)',
  },
]

export default function LightPressure() {
  const [sourceId, setSourceId] = useState('sun')
  const [surface, setSurface] = useState<Surface>('absorber')
  const s = SOURCES.find((x) => x.id === sourceId) as Source
  const [r, where] = s.at
  return (
    <div className="waves">
      <h1>Light pressure by source</h1>
      <p className="muted">
        Light carries momentum, so it pushes. A surface that takes the light in feels a pressure p = I/c — the
        light’s intensity I (watts per m²) divided by the speed of light — and a mirror that throws it back
        feels twice that, 2I/c. Because c is so large, the push is tiny: sunlight at the Earth presses with about
        5 millionths of a pascal, some 20 billion times less than the air. Below, five real sources, from a laser
        pointer to the Sun, are drawn by the pressure their light puts around them.
      </p>

      <figure className="wave" id="map">
        <figcaption>
          <h2>The 2D pressure map</h2>
          <p>
            Pick a source. Each point of the map is coloured by the pressure on a small {surface} facing the
            light there; all five maps share one colour scale, so a brighter map is a stronger push. A lamp or
            the Sun sends light every way, so its pressure falls as 1/r²; a laser keeps its light in a narrow
            beam, which is why a 5 mW pointer pushes harder than a 100 W lamp.
          </p>
        </figcaption>
        <div className="lp-controls">
          <div className="lp-choices" role="group" aria-label="Source">
            {SOURCES.map((x) => (
              <button key={x.id} type="button" aria-pressed={x.id === sourceId} onClick={() => setSourceId(x.id)}>
                {x.name}
              </button>
            ))}
          </div>
          <div className="lp-choices" role="group" aria-label="Surface">
            {(['absorber', 'mirror'] as const).map((x) => (
              <button key={x} type="button" aria-pressed={x === surface} onClick={() => setSurface(x)}>
                {x === 'absorber' ? 'Black absorber (I/c)' : 'Mirror (2I/c)'}
              </button>
            ))}
          </div>
        </div>
        <div className="lp-view">
          <PressureMap s={s} surface={surface} />
          <div>
            <h3>{s.name}</h3>
            <dl className="wave-facts lp-facts">
              <div>
                <dt>Light</dt>
                <dd>{s.powerNote}</dd>
              </div>
              <div>
                <dt>Pressure</dt>
                <dd>
                  {sci(pressure(s, r, 0, surface))} Pa {where}
                </dd>
              </div>
              <div>
                <dt>Map</dt>
                <dd>{mapCaption(s)}</dd>
              </div>
            </dl>
            <p className="lp-legend">
              <span className="lp-ramp" style={{ background: RAMP_CSS }} aria-hidden="true" />
              <span className="lp-ramp-ticks">
                <span>{sci(10 ** LOG_MIN)}</span>
                <span>{sci(10 ** ((LOG_MIN + LOG_MAX) / 2))}</span>
                <span>{sci(10 ** LOG_MAX)} Pa</span>
              </span>
            </p>
          </div>
        </div>
      </figure>

      <figure className="wave" id="chart">
        <figcaption>
          <h2>Pressure against distance</h2>
          <p>
            The same pressure along a line straight out from each source (along a laser’s axis). The lamp, the
            LED and the Sun fall as 1/r² from the start — a hundredfold for each tenfold of distance. A laser
            holds its pressure while its beam stays narrow and only then falls as 1/r²; the cutting laser is
            focused, so it is strongest at its focus. On a mirror every line is twice as high.
          </p>
        </figcaption>
        <PressureChart surface={surface} />
        <PressureTable />
        <p className="muted sem-note">
          The last column is the whole push when every bit of the light is caught, P/c or 2P/c: it depends only
          on the power, never on the distance. Pressure is that push spread over the area the light covers.
        </p>
      </figure>

      <h2 className="wave-group">What has been measured</h2>
      <MeasuredCards findings={FINDINGS} />
    </div>
  )
}
