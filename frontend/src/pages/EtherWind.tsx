// The ether wind in 2D: what a still, light-carrying ether would make the Earth feel as it moves through it,
// drawn four ways, each beside what was measured. (1) A top-down map of the Earth's orbit with the wind at
// the Earth month by month — the 30 km/s orbital motion alone, or with the Sun's 370 km/s toward the CMB
// dipole. (2) What Michelson and Morley expected: the round-trip light speed by direction (polar plot) and
// the fringe shift as the interferometer turns. (3) The wind past the Earth itself, for a still ether and
// for Stokes' dragged one. (4) Miller's claimed 10 km/s against the null results before and after.
// Everything is computed here; no API call.
import { useState } from 'react'
import Choices from '../components/Choices'
import { type Finding, MeasuredCards } from '../components/Spectrum'
import { W } from '../components/WavePanel'
import { C, pow10, sci } from './LightPressure'
import { expectedFringeShift } from './MatterEther'

const DEG = Math.PI / 180
export const V_ORBIT = 29.78 // Earth's mean orbital speed, km/s
// The Sun's motion against the cosmic microwave background (Planck 2018): 369.82 km/s toward
// RA 167.942°, Dec −6.944° (galactic l 264.02°, b 48.25°).
export const V_CMB = 369.82
const CMB_RA = 167.942
const CMB_DEC = -6.944
const OBLIQUITY = 23.439 // tilt of the Earth's axis to the ecliptic, degrees

// Equatorial (RA, Dec) → ecliptic (longitude, latitude), all in degrees.
export function toEcliptic(ra: number, dec: number): [number, number] {
  const [a, d, e] = [ra * DEG, dec * DEG, OBLIQUITY * DEG]
  const lat = Math.asin(Math.sin(d) * Math.cos(e) - Math.cos(d) * Math.sin(e) * Math.sin(a))
  const lon = Math.atan2(Math.sin(a) * Math.cos(e) + Math.tan(d) * Math.sin(e), Math.cos(a))
  return [((lon / DEG) % 360 + 360) % 360, lat / DEG]
}
export const [CMB_LON, CMB_LAT] = toEcliptic(CMB_RA, CMB_DEC)

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// The Earth's heliocentric ecliptic longitude in the middle of a month (circular orbit; 0° = the direction
// of the March equinox, which the Earth's longitude reaches in September, opposite the Sun's).
export function earthLongitude(month: number): number {
  const day = 30.44 * month + 15 // days since 1 January
  return (((360 * (day - 79)) / 365.25 + 180) % 360 + 360) % 360
}

export type Frame = 'sun' | 'cmb'
export const FRAME_LABEL: Record<Frame, string> = {
  sun: 'Ether at rest with the Sun',
  cmb: 'Ether at rest with the CMB',
}

// The Earth's velocity through the ether, km/s, in ecliptic coordinates: x toward the March equinox, y 90°
// on in the Earth's direction of travel, z toward the ecliptic north pole. The ether wind is its opposite.
export function earthVelocity(month: number, frame: Frame): [number, number, number] {
  const heading = (earthLongitude(month) + 90) * DEG // the orbit runs counterclockwise seen from the north
  const v: [number, number, number] = [V_ORBIT * Math.cos(heading), V_ORBIT * Math.sin(heading), 0]
  if (frame === 'cmb') {
    const [lon, lat] = [CMB_LON * DEG, CMB_LAT * DEG]
    v[0] += V_CMB * Math.cos(lat) * Math.cos(lon)
    v[1] += V_CMB * Math.cos(lat) * Math.sin(lon)
    v[2] += V_CMB * Math.sin(lat)
  }
  return v
}
export const speed = (v: number[]) => Math.hypot(...v)
// The longitude the Earth heads toward — the wind blows from there.
export const headingOf = (v: number[]) => ((Math.atan2(v[1], v[0]) / DEG) % 360 + 360) % 360

// The Michelson–Morley instruments: optical arm length and the light used.
export interface Instrument {
  id: string
  name: string
  arm: number // m
  lambda: number // m
}
export const INSTRUMENTS: Instrument[] = [
  { id: 'mm1887', name: 'Michelson–Morley 1887 (11 m)', arm: 11, lambda: 589e-9 },
  { id: 'miller', name: 'Miller 1925 (32 m)', arm: 32, lambda: 589e-9 },
]
export const WINDS: [number, string][] = [
  [V_ORBIT, 'Orbital, 30 km/s'],
  [V_CMB, 'Sun against the CMB, 370 km/s'],
  [10, 'Miller’s claim, 10 km/s'],
]

// Fringe position, in fringes from its mean, with arm 1 at angle phi (degrees) to the wind: half of the
// full shift seen on turning the instrument through 90°, times cos 2φ.
export const fringeAt = (ins: Instrument, v: number, phi: number) =>
  (expectedFringeShift(ins.arm, v * 1e3, ins.lambda) / 2) * Math.cos(2 * phi * DEG)

// Light out and back along a line at angle theta to a wind v (km/s) covers 2L in 2L/c · √(1−β² sin²θ)/(1−β²):
// its round-trip speed, as a fraction of c, is (1−β²)/√(1−β² sin²θ).
export function roundTripSpeed(v: number, theta: number): number {
  const b2 = (v * 1e3 / C) ** 2
  return (1 - b2) / Math.sqrt(1 - b2 * Math.sin(theta * DEG) ** 2)
}

// The wind past the Earth, km/s far away, in the Earth's frame (it moves left, so the wind blows right).
export type Model = 'still' | 'dragged'
export const MODELS: [Model, string][] = [
  ['still', 'Still ether (Fresnel)'],
  ['dragged', 'Dragged ether (Stokes)'],
]
export const R_EARTH = 6371 // km
export const MOUNT_WILSON = 1.742 // km above sea level, where Miller worked
// The drag height at which a dragged ether gives Miller's 10 km/s at Mount Wilson out of 30 km/s.
export const MILLER_H = -MOUNT_WILSON / Math.log(1 - 10 / V_ORBIT)
export const DRAG_HEIGHTS: [number, string][] = [
  [MILLER_H, `${MILLER_H.toFixed(1)} km (fits Miller)`],
  [640, '640 km'],
  [3200, '3,200 km'],
  [R_EARTH, '6,371 km (one Earth radius)'],
]

// Wind speed relative to the ground, km/s, at a height h km above the surface: the full speed for a still
// ether (which passes through matter); for a dragged ether, zero at the ground rising to full over scale h0.
export const windAtHeight = (model: Model, h: number, h0: number) =>
  model === 'still' ? V_ORBIT : V_ORBIT * (1 - Math.exp(-Math.max(0, h) / h0))

// The wind's direction at (x, y), in Earth radii: straight across for a still ether, bent around the Earth
// as an ideal flow past a cylinder for a dragged one. A unit vector, or null inside the Earth when dragged.
export function windDirection(model: Model, x: number, y: number): [number, number] | null {
  if (model === 'still') return [1, 0]
  const r2 = x * x + y * y
  if (r2 < 1) return null
  const ux = 1 - (x * x - y * y) / (r2 * r2)
  const uy = (-2 * x * y) / (r2 * r2)
  const n = Math.hypot(ux, uy)
  return n === 0 ? [0, 0] : [ux / n, uy / n]
}

// The experiments of section 4. A null result's limit follows from its own numbers: the shift goes as v², so
// a run that saw at most a fraction f of the shift 30 km/s would give bounds the wind by 30 km/s × √f. The
// modern resonators bound how much light speed differs along and across a direction, Δc/c; a classical
// wind makes that v²/2c², so the wind they allow is c √(2 Δc/c).
export interface Experiment {
  id: string
  name: string
  year: number
  kind: 'claim' | 'limit'
  wind: number // km/s: the claimed wind, or the upper limit
  where: string
  result: string
  source: string
}
const fromFringes = (seen: number, expected: number) => V_ORBIT * Math.sqrt(seen / expected)
const fromAnisotropy = (dcc: number) => (C * Math.sqrt(2 * dcc)) / 1e3

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'mm1887',
    name: 'Michelson & Morley',
    year: 1887,
    kind: 'limit',
    wind: fromFringes(0.01, 0.4),
    where: 'Cleveland, Ohio — an 11 m folded light path on a stone slab floating in mercury',
    result:
      'Expected 0.4 of a fringe on turning 90°; saw certainly under a twentieth of that and probably under a fortieth, about 0.01. They wrote that the Earth’s speed through the ether was probably under a sixth of its orbital speed.',
    source: 'Michelson & Morley, American Journal of Science 34, 333 (1887)',
  },
  {
    id: 'miller',
    name: 'Miller (Mount Wilson)',
    year: 1925,
    kind: 'claim',
    wind: 10,
    where: 'Mount Wilson, California (1,742 m) — a 32 m light path in a light hut',
    result:
      'Claimed a steady shift, repeating with sidereal time, equal to a wind of about 10 km/s — a third of the orbital speed — and argued that the Earth drags the ether, weakening the wind at the ground. In 1933 he put the Earth’s true motion at about 208 km/s toward the southern constellation Dorado. Shankland and colleagues re-analysed his records in 1955 and traced the signal to temperature changes across the hut.',
    source: 'Miller, Science 63, 433 (1926); Reviews of Modern Physics 5, 203 (1933); Shankland et al., Reviews of Modern Physics 27, 167 (1955)',
  },
  {
    id: 'kennedy',
    name: 'Kennedy',
    year: 1926,
    kind: 'limit',
    wind: fromFringes(0.002, 0.07),
    where: 'Pasadena and Mount Wilson — a small, sealed, temperature-controlled interferometer',
    result: 'Saw at most 0.002 of a fringe where 0.07 was expected — nothing at Mount Wilson either.',
    source: 'Kennedy, Proceedings of the National Academy of Sciences 12, 621 (1926)',
  },
  {
    id: 'illingworth',
    name: 'Illingworth',
    year: 1927,
    kind: 'limit',
    wind: fromFringes(0.0004, 0.07),
    where: 'Pasadena — Kennedy’s instrument, read with a half-shade plate',
    result: 'Saw at most 0.0004 of a fringe where 0.07 was expected.',
    source: 'Illingworth, Physical Review 30, 692 (1927)',
  },
  {
    id: 'joos',
    name: 'Joos',
    year: 1930,
    kind: 'limit',
    wind: fromFringes(0.002, 0.75),
    where: 'Jena — a 21 m light path on a fused-quartz frame in a vacuum, recorded photographically',
    result: 'Saw at most 0.002 of a fringe where 0.75 was expected: one of the most precise of the classical runs.',
    source: 'Joos, Annalen der Physik 399, 385 (1930)',
  },
  {
    id: 'herrmann',
    name: 'Herrmann et al.',
    year: 2009,
    kind: 'limit',
    wind: fromAnisotropy(1e-17),
    where: 'Berlin — two crossed optical resonators turning on a table, recorded for over a year',
    result: 'Light speed was the same in every direction to about 1 part in 10¹⁷.',
    source: 'Herrmann et al., Physical Review D 80, 105011 (2009)',
  },
  {
    id: 'nagel',
    name: 'Nagel et al.',
    year: 2015,
    kind: 'limit',
    wind: fromAnisotropy(1e-18),
    where: 'A turning pair of crossed cryogenic sapphire microwave resonators, recorded for about a year',
    result: 'Light speed was the same in every direction to about 1 part in 10¹⁸.',
    source: 'Nagel et al., Nature Communications 6, 8174 (2015)',
  },
]

// Speeds as "4.7 km/s" or, below 1 km/s, "0.95 m/s".
export const kms = (v: number) => (v >= 1 ? `${sci(v)} km/s` : `${sci(v * 1e3)} m/s`)

// An arrow from (x, y) of length len (viewBox units) toward angle a (radians, counterclockwise, y up).
function Arrow({ x, y, a, len, className }: { x: number; y: number; a: number; len: number; className: string }) {
  const [ex, ey] = [x + len * Math.cos(a), y - len * Math.sin(a)]
  const head = Math.min(10, len * 0.4)
  const wing = (s: number) => `${ex - head * Math.cos(a + s * 0.45)},${ey + head * Math.sin(a + s * 0.45)}`
  return (
    <g className={className}>
      <line x1={x} y1={y} x2={ex} y2={ey} />
      <path d={`M${wing(1)} L${ex},${ey} L${wing(-1)}`} />
    </g>
  )
}

function Slider({ label, value, min, max, step, show, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  show: string
  onChange: (v: number) => void
}) {
  return (
    <label className="ew-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{show}</output>
    </label>
  )
}

// --- 1. The wind around the orbit. 360 × 360 viewBox, the Sun at the centre, north up out of the page.
const OM = 360
const ORB = 118

function OrbitMap({ month, frame }: { month: number; frame: Frame }) {
  const c = OM / 2
  const maxV = frame === 'sun' ? V_ORBIT : V_CMB + V_ORBIT
  const pos = (m: number) => {
    const l = earthLongitude(m) * DEG
    return [c + ORB * Math.cos(l), c - ORB * Math.sin(l)]
  }
  const wind = (m: number) => {
    const v = earthVelocity(m, frame)
    return { a: Math.atan2(-v[1], -v[0]), inPlane: Math.hypot(v[0], v[1]) }
  }
  const [ex, ey] = pos(month)
  const now = wind(month)
  return (
    <svg className="lp-map ew-orbit" viewBox={`0 0 ${OM} ${OM}`} role="img" data-frame={frame}
      aria-label={`The ether wind at the Earth around its orbit, ${FRAME_LABEL[frame].toLowerCase()}, in ${MONTH_NAMES[month]}`}>
      <rect className="ew-space" x={0} y={0} width={OM} height={OM} />
      <circle className="ew-orbit-line" cx={c} cy={c} r={ORB} />
      <Arrow x={c} y={c} a={0} len={OM / 2 - 12} className="ew-axis" />
      <text className="ew-label" x={OM - 8} y={c - 8} textAnchor="end">♈︎</text>
      {MONTHS.map((name, m) => {
        const [x, y] = pos(m)
        const l = earthLongitude(m) * DEG
        const w = wind(m)
        return (
          <g key={name} data-month={m}>
            {m !== month && <Arrow x={x} y={y} a={w.a} len={(30 * w.inPlane) / maxV} className="ew-wind-small" />}
            <circle className="ew-earth-dot" cx={x} cy={y} r={2.5} />
            <text className="ew-month" x={c + (ORB - 16) * Math.cos(l)} y={c - (ORB - 16) * Math.sin(l)} textAnchor="middle" dominantBaseline="middle">
              {name}
            </text>
          </g>
        )
      })}
      <circle className="ew-sun" cx={c} cy={c} r={10} />
      {frame === 'cmb' && (
        <Arrow x={c} y={c} a={(CMB_LON + 180) * DEG} len={(70 * V_CMB * Math.cos(CMB_LAT * DEG)) / maxV} className="ew-wind-sun" />
      )}
      <Arrow x={ex} y={ey} a={now.a} len={(70 * now.inPlane) / maxV} className="ew-wind" />
      <circle className="ew-earth" cx={ex} cy={ey} r={7} />
    </svg>
  )
}

// A small chart under the map: wind speed at the Earth through the year.
const SC_H = 200
const SC = { l: 64, r: W - 16, t: 16, b: 160 }

export function seasonSpeeds(frame: Frame): number[] {
  return MONTHS.map((_, m) => speed(earthVelocity(m, frame)))
}

function SeasonChart({ month, frame }: { month: number; frame: Frame }) {
  const sp = seasonSpeeds(frame)
  const [lo, hi] = frame === 'sun' ? [0, 40] : [300, 420]
  const sx = (m: number) => SC.l + ((m + 0.5) / 12) * (SC.r - SC.l)
  const sy = (v: number) => SC.b - ((v - lo) / (hi - lo)) * (SC.b - SC.t)
  const ticks = frame === 'sun' ? [0, 10, 20, 30, 40] : [300, 340, 380, 420]
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Ether wind at the Earth, km/s</p>
      <svg className="sem-plot" viewBox={`0 0 ${W} ${SC_H}`} role="img" aria-label="Ether wind speed at the Earth, month by month">
        {ticks.map((t) => (
          <g key={t}>
            <line className="sem-grid" x1={SC.l} x2={SC.r} y1={sy(t)} y2={sy(t)} />
            <text className="sem-tick" x={SC.l - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle">{t}</text>
          </g>
        ))}
        {MONTHS.map((name, m) => (
          <text key={name} className="sem-tick" x={sx(m)} y={SC.b + 8} textAnchor="middle" dominantBaseline="hanging">{name}</text>
        ))}
        <path className="sem-axes" d={`M${SC.l},${SC.t} V${SC.b} H${SC.r}`} />
        <path className="sem-curve ew-season" d={`M${sp.map((v, m) => `${sx(m).toFixed(1)},${sy(v).toFixed(1)}`).join('L')}`} />
        <circle className="ew-season-now" cx={sx(month)} cy={sy(sp[month])} r={6} />
      </svg>
    </div>
  )
}

function OrbitSection() {
  const [month, setMonth] = useState(0)
  const [frame, setFrame] = useState<Frame>('sun')
  const v = earthVelocity(month, frame)
  const sp = seasonSpeeds(frame)
  const [lo, hi] = [Math.min(...sp), Math.max(...sp)]
  return (
    <figure className="wave" id="orbit">
      <figcaption>
        <h2>1. The wind around the Earth’s orbit</h2>
        <p>
          Seen from above the Sun’s north pole, the Earth circles counterclockwise at 30 km/s. If the ether stood
          still with the Sun, the Earth would meet a 30 km/s wind from straight ahead, turning with the seasons
          (the blue arrow; the small arrows are the other months). Measured against the cosmic microwave
          background — the nearest thing to a universal rest frame — the Sun itself moves at 370 km/s (orange),
          so an ether at rest with the CMB would blow at 340–400 km/s all year, strongest in December.
        </p>
      </figcaption>
      <div className="lp-controls">
        <Choices label="Ether frame" options={(['sun', 'cmb'] as const).map((f): [Frame, string] => [f, FRAME_LABEL[f]])} value={frame} onChange={setFrame} />
        <Slider label="Month" value={month} min={0} max={11} step={1} show={MONTH_NAMES[month]} onChange={setMonth} />
      </div>
      <div className="lp-view">
        <OrbitMap month={month} frame={frame} />
        <div>
          <h3>Mid-{MONTH_NAMES[month]}</h3>
          <dl className="wave-facts lp-facts">
            <div>
              <dt>Wind</dt>
              <dd data-testid="orbit-wind">{sci(speed(v))} km/s</dd>
            </div>
            <div>
              <dt>From</dt>
              <dd>
                ecliptic longitude {Math.round(headingOf(v))}°, the way the Earth is heading
                {frame === 'cmb' && `, and ${Math.round(Math.abs((Math.asin(v[2] / speed(v)) / DEG)))}° below the orbit’s plane`}
              </dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{frame === 'sun' ? 'the same 30 km/s every month, only its direction turns' : `from ${sci(lo)} to ${sci(hi)} km/s over the year`}</dd>
            </div>
            <div>
              <dt>Expected</dt>
              <dd>
                a {sci(expectedFringeShift(11, speed(v) * 1e3, 589e-9))} fringe shift in Michelson and Morley’s
                interferometer on turning it 90°
              </dd>
            </div>
            <div>
              <dt>Measured</dt>
              <dd>probably at most 0.01 fringe — no wind, in any month (section 2)</dd>
            </div>
          </dl>
          <p className="lp-legend">
            Arrows point the way the wind blows, longest = {frame === 'sun' ? '30' : '400'} km/s; ♈︎ marks the direction of the March equinox.{' '}
            {frame === 'cmb' && 'The orange arrow is the Sun’s share; the map shows the part in the orbit’s plane.'}
          </p>
        </div>
      </div>
      <SeasonChart month={month} frame={frame} />
    </figure>
  )
}

// --- 2. Michelson–Morley. The interferometer in the wind (260 × 260), the polar plot (260 × 260), the chart.
const IM = 260

function Interferometer({ phi }: { phi: number }) {
  const c = IM / 2
  const arm = 92
  const a1 = phi * DEG
  const a2 = (phi + 90) * DEG
  const end = (a: number) => [c + arm * Math.cos(a), c - arm * Math.sin(a)]
  const [x1, y1] = end(a1)
  const [x2, y2] = end(a2)
  const [sx0, sy0] = end(a1 + Math.PI)
  return (
    <svg className="lp-map ew-mm" viewBox={`0 0 ${IM} ${IM}`} role="img" aria-label={`The interferometer turned ${phi}° to the ether wind`}>
      {[30, 80, 130, 180, 230].map((y) => (
        <Arrow key={y} x={14} y={y} a={0} len={IM - 28} className="ew-stream" />
      ))}
      <circle className="ew-slab" cx={c} cy={c} r={arm + 16} />
      <line className="ew-beam" x1={sx0} y1={sy0} x2={x1} y2={y1} />
      <line className="ew-beam" x1={c} y1={c} x2={x2} y2={y2} />
      {[[x1, y1, a1], [x2, y2, a2]].map(([x, y, a]) => (
        <line key={a} className="ew-mirror" x1={x - 12 * Math.sin(a)} y1={y - 12 * Math.cos(a)} x2={x + 12 * Math.sin(a)} y2={y + 12 * Math.cos(a)} />
      ))}
      <line className="ew-mirror ew-splitter"
        x1={c - 12 * Math.cos(a1 + Math.PI / 4)} y1={c + 12 * Math.sin(a1 + Math.PI / 4)}
        x2={c + 12 * Math.cos(a1 + Math.PI / 4)} y2={c - 12 * Math.sin(a1 + Math.PI / 4)} />
      <circle className="ew-lamp" cx={sx0} cy={sy0} r={6} />
      <text className="ew-label" x={x1} y={y1 - 16} textAnchor="middle">arm 1</text>
      <text className="ew-label" x={x2} y={y2 - 16} textAnchor="middle">arm 2</text>
      <text className="ew-label" x={IM - 8} y={IM - 8} textAnchor="end">wind →</text>
    </svg>
  )
}

// Round-trip light speed by direction, the departure from c magnified so the shape shows.
export function polarPath(v: number, r0: number, show: number): { d: string; gain: number } {
  const dev = (t: number) => roundTripSpeed(v, t) - 1
  const [lo, hi] = [dev(0), dev(90)] // slowest along the wind, fastest across it
  const gain = show / (hi - lo)
  const pts: string[] = []
  for (let t = 0; t <= 360; t += 3) {
    const r = r0 + (dev(t) - (lo + hi) / 2) * gain
    pts.push(`${(IM / 2 + r * Math.cos(t * DEG)).toFixed(1)},${(IM / 2 - r * Math.sin(t * DEG)).toFixed(1)}`)
  }
  return { d: `M${pts.join('L')}Z`, gain }
}

function PolarPlot({ v }: { v: number }) {
  const r0 = 74
  const { d } = polarPath(v, r0, 36)
  const c = IM / 2
  return (
    <svg className="lp-map ew-polar" viewBox={`0 0 ${IM} ${IM + 40}`} role="img" aria-label="Round-trip light speed by direction in the ether wind, magnified">
      <circle className="ew-ring" cx={c} cy={c} r={r0} />
      <path className="ew-polar-line" d={d} />
      <line className="ew-ring" x1={c - 110} y1={c} x2={c + 110} y2={c} />
      <line className="ew-ring" x1={c} y1={c - 110} x2={c} y2={c + 110} />
      <text className="ew-label" x={4} y={14}>↕ across the wind: fastest</text>
      <text className="ew-label" x={4} y={IM + 16}>↔ along the wind: slowest</text>
      <text className="ew-label ew-muted" x={4} y={IM + 34}>dashed circle: the mean, for scale</text>
    </svg>
  )
}

const FC_H = 300
const FC = { l: 64, r: W - 16, t: 16, b: 256 }

function FringeChart({ ins, v, phi }: { ins: Instrument; v: number; phi: number }) {
  const amp = expectedFringeShift(ins.arm, v * 1e3, ins.lambda) / 2
  const millerAmp = expectedFringeShift(ins.arm, 10e3, ins.lambda) / 2
  const top = Math.max(amp, ins.id === 'miller' ? millerAmp : 0.01) * 1.25
  const sx = (p: number) => FC.l + (p / 180) * (FC.r - FC.l)
  const sy = (n: number) => (FC.t + FC.b) / 2 - (n / top) * ((FC.b - FC.t) / 2)
  const curve = (a: number) =>
    `M${Array.from({ length: 91 }, (_, i) => `${sx(i * 2).toFixed(1)},${sy(a * Math.cos(4 * i * DEG)).toFixed(1)}`).join('L')}`
  const yt = [-top / 1.25, 0, top / 1.25]
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Fringe position, fringes from its mean</p>
      <svg className="sem-plot" viewBox={`0 0 ${W} ${FC_H}`} role="img" aria-label={`Expected fringe shift against the interferometer's angle to the wind, ${ins.name}`}>
        {ins.id === 'mm1887' && (
          <rect className="ew-measured" x={FC.l} y={sy(0.005)} width={FC.r - FC.l} height={Math.max(2, sy(-0.005) - sy(0.005))} />
        )}
        {yt.map((t) => (
          <g key={t}>
            <line className="sem-grid" x1={FC.l} x2={FC.r} y1={sy(t)} y2={sy(t)} />
            <text className="sem-tick" x={FC.l - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle">{sci(t)}</text>
          </g>
        ))}
        {[0, 45, 90, 135, 180].map((p) => (
          <text key={p} className="sem-tick" x={sx(p)} y={FC.b + 8} textAnchor="middle" dominantBaseline="hanging">{p}°</text>
        ))}
        <path className="sem-axes" d={`M${FC.l},${FC.t} V${FC.b} H${FC.r}`} />
        {ins.id === 'miller' && v !== 10 && <path className="sem-curve ew-claim" d={curve(millerAmp)} data-series="miller" />}
        <path className="sem-curve ew-expected" d={curve(amp)} data-series="expected" />
        <circle className="ew-now" cx={sx(phi)} cy={sy(fringeAt(ins, v, phi))} r={6} />
      </svg>
      <p className="sem-axis-title sem-x-title">Angle of arm 1 to the wind →</p>
      <ul className="skb-legend">
        <li><span className="lp-swatch ew-sw-expected" />Expected from a {kms(v)} wind</li>
        {ins.id === 'mm1887' && <li><span className="lp-swatch ew-sw-measured" />Measured in 1887: a swing of probably at most 0.01</li>}
        {ins.id === 'miller' && v !== 10 && <li><span className="lp-swatch ew-sw-claim" />Miller’s claimed 10 km/s</li>}
      </ul>
    </div>
  )
}

function MichelsonSection() {
  const [phi, setPhi] = useState(30)
  const [v, setV] = useState(V_ORBIT)
  const [insId, setInsId] = useState('mm1887')
  const ins = INSTRUMENTS.find((i) => i.id === insId) as Instrument
  const full = expectedFringeShift(ins.arm, v * 1e3, ins.lambda)
  const b2 = (v * 1e3 / C) ** 2
  const gain = polarPath(v, 74, 36).gain / 74
  return (
    <figure className="wave" id="michelson">
      <figcaption>
        <h2>2. What Michelson and Morley expected</h2>
        <p>
          Light racing out and back along the wind takes a little longer than light going across it, so in an
          ether wind the round-trip speed of light depends on direction (the polar plot, hugely magnified). An interferometer splits one beam into two arms at right angles and overlays them again; as
          it turns, the slower arm swaps and the interference fringes should slide back and forth twice per turn.
        </p>
      </figcaption>
      <div className="lp-controls">
        <Choices label="Instrument" options={INSTRUMENTS.map((i): [string, string] => [i.id, i.name])} value={insId} onChange={setInsId} />
        <Choices label="Wind" options={WINDS} value={v} onChange={setV} />
        <Slider label="Turn" value={phi} min={0} max={180} step={5} show={`${phi}°`} onChange={setPhi} />
      </div>
      <div className="ew-pair">
        <Interferometer phi={phi} />
        <PolarPlot v={v} />
      </div>
      <dl className="wave-facts lp-facts">
        <div>
          <dt>Light speed</dt>
          <dd>
            {sci(b2 / 2)} slower out and back along the wind than across it (Δc/c = v²/2c²); the polar plot
            magnifies this ×{sci(gain)}
          </dd>
        </div>
        <div>
          <dt>Fringes now</dt>
          <dd data-testid="fringe-now">{sci(fringeAt(ins, v, phi))} from the mean</dd>
        </div>
        <div>
          <dt>Turning 90°</dt>
          <dd data-testid="fringe-full">shifts the fringes by {sci(full)} of a fringe</dd>
        </div>
      </dl>
      <FringeChart ins={ins} v={v} phi={phi} />
      <p className="muted sem-note">
        Michelson and Morley turned their stone slab slowly in mercury, reading the fringes at 16 marks a turn,
        at noon and in the evening over several days in July 1887. They expected 0.4 of a fringe and saw, they wrote, certainly under a twentieth and probably under a fortieth of it — about 0.01 — and no later, more sensitive run has found a wind either (section 4).
      </p>
    </figure>
  )
}

// --- 3. The wind past the Earth: a ±4 Earth-radius square in the Earth's frame, coloured by wind speed.
const FM = 360
const FCELL = 4
const SPAN = 4 // Earth radii either side
const FLOW_BANDS = 10
const BLUES = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b', '#041f4a']

export function flowCells(model: Model, h0: number): { x: number; y: number; band: number }[] {
  const cells: { x: number; y: number; band: number }[] = []
  for (let j = 0; j < FM; j += FCELL)
    for (let i = 0; i < FM; i += FCELL) {
      const x = -SPAN + ((i + FCELL / 2) / FM) * 2 * SPAN
      const y = SPAN - ((j + FCELL / 2) / FM) * 2 * SPAN
      const r = Math.hypot(x, y)
      const inside = model === 'dragged' && r < 1
      const v = inside ? 0 : windAtHeight(model, (r - 1) * R_EARTH, h0)
      cells.push({ x: i, y: j, band: inside ? -1 : Math.min(FLOW_BANDS - 1, Math.floor((v / V_ORBIT) * FLOW_BANDS)) })
    }
  return cells
}

// Streamlines from the left edge, stepped along the wind's direction.
export function streamlines(model: Model): string[] {
  const toMap = (x: number, y: number) => `${(((x + SPAN) / (2 * SPAN)) * FM).toFixed(1)},${(((SPAN - y) / (2 * SPAN)) * FM).toFixed(1)}`
  const lines: string[] = []
  for (let y0 = -3.5; y0 <= 3.51; y0 += 0.5) {
    let [x, y] = [-SPAN, y0 === 0 && model === 'dragged' ? 0.02 : y0]
    const pts = [toMap(x, y)]
    for (let k = 0; k < 2000 && x < SPAN; k++) {
      const d = windDirection(model, x, y)
      if (!d) break
      const mid = windDirection(model, x + 0.01 * d[0], y + 0.01 * d[1]) ?? d
      x += 0.02 * mid[0]
      y += 0.02 * mid[1]
      if (k % 4 === 3) pts.push(toMap(x, y))
    }
    lines.push(`M${pts.join('L')}`)
  }
  return lines
}

function FlowMap({ model, h0 }: { model: Model; h0: number }) {
  const groups = new Map<string, string[]>()
  for (const c of flowCells(model, h0)) {
    const fill = c.band < 0 ? '#2e7d32' : BLUES[c.band]
    const d = groups.get(fill) ?? []
    d.push(`M${c.x},${c.y}h${FCELL}v${FCELL}h-${FCELL}z`)
    groups.set(fill, d)
  }
  const r = FM / (2 * SPAN)
  return (
    <svg className="lp-map" viewBox={`-4 -4 ${FM + 8} ${FM + 8}`} role="img" data-model={model}
      aria-label={`The ether wind flowing past the Earth, ${model === 'still' ? 'still ether' : 'dragged ether'}: darker where it blows harder`}>
      {[...groups].map(([fill, d]) => (
        <path key={fill} d={d.join('')} fill={fill} shapeRendering="crispEdges" />
      ))}
      {streamlines(model).map((d) => (
        <path key={d} className="ew-streamline" d={d} />
      ))}
      <circle className={model === 'still' ? 'ew-globe ew-globe-open' : 'ew-globe'} cx={FM / 2} cy={FM / 2} r={r} />
      <text className="ew-globe-label" x={FM / 2} y={FM / 2} textAnchor="middle" dominantBaseline="middle">Earth</text>
      <rect className="lp-frame" x={0} y={0} width={FM} height={FM} />
    </svg>
  )
}

function FlowSection() {
  const [model, setModel] = useState<Model>('still')
  const [h0, setH0] = useState(DRAG_HEIGHTS[2][0])
  const heights: [number, string][] = [
    [0, 'At the ground'],
    [MOUNT_WILSON, 'Mount Wilson (1.7 km)'],
    [100, 'At 100 km'],
    [R_EARTH, 'One Earth radius up'],
  ]
  return (
    <figure className="wave" id="flow">
      <figcaption>
        <h2>3. The wind past the Earth</h2>
        <p>
          The same 30 km/s wind seen from the Earth, which moves to the left. In Fresnel’s still ether the wind blows straight through the planet as if it were not there. Stokes (1845) supposed
          instead that the Earth drags the ether along, like air carried along close to a moving train: the wind dies away to
          nothing at the ground and bends around the Earth, which would hide it from any experiment on the
          surface. Stokes gave no law for how the drag fades with height; here it fades over a chosen scale.
        </p>
      </figcaption>
      <div className="lp-controls">
        <Choices label="Ether model" options={MODELS} value={model} onChange={setModel} />
        {model === 'dragged' && <Choices label="Drag fades over" options={DRAG_HEIGHTS} value={h0} onChange={setH0} />}
      </div>
      <div className="lp-view">
        <FlowMap model={model} h0={h0} />
        <div>
          <h3>{model === 'still' ? 'Still ether' : 'Dragged ether'}</h3>
          <dl className="wave-facts lp-facts">
            {heights.map(([h, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{kms(windAtHeight(model, h, h0))}</dd>
              </div>
            ))}
          </dl>
          <p className="lp-legend">
            <span className="lp-ramp" style={{ background: `linear-gradient(90deg, ${BLUES.join(', ')})` }} aria-hidden="true" />
            <span className="lp-ramp-ticks">
              <span>0</span>
              <span>15</span>
              <span>30 km/s</span>
            </span>
          </p>
          <p className="muted sem-note">
            {model === 'still'
              ? 'A still ether predicts the full wind at the surface — the wind Michelson and Morley did not find. Lorentz kept the still ether only by letting moving bodies shrink along their motion by exactly the amount that hides the wind, so that it can never be seen.'
              : 'A dragged ether hides the wind at the ground, but it fails elsewhere: Lorentz showed (1886) that it cannot both stick to the Earth and bend starlight by the observed aberration, and Hammar (1935) found no drag even inside heavy lead walls.'}
          </p>
        </div>
      </div>
      <p className="muted sem-note">
        {sci(R_EARTH * 2 * SPAN)} km square (±4 Earth radii); the lines follow the wind. At the {MILLER_H.toFixed(1)} km
        scale that fits Miller’s claim, the whole drag layer is far thinner than one cell of the map.
      </p>
    </figure>
  )
}

// --- 4. Miller's claim against the null results: year across, wind speed up (log).
const MC_H = 420
const MC = { l: 72, r: W - 16, t: 16, b: 372 }
const Y0 = 1880
const Y1 = 2020
const V_LO = 1e-4
const V_HI = 1e3

function MillerChart({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const sx = (y: number) => MC.l + ((y - Y0) / (Y1 - Y0)) * (MC.r - MC.l)
  const sy = (v: number) => MC.b - (Math.log10(v / V_LO) / Math.log10(V_HI / V_LO)) * (MC.b - MC.t)
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Ether wind, km/s (log scale)</p>
      <svg className="sem-plot" viewBox={`0 0 ${W} ${MC_H}`} role="img" aria-label="Ether-wind experiments by year: Miller's claim against the upper limits of the null results">
        {[-4, -2, 0, 2].map((e) => (
          <g key={e}>
            <line className="sem-grid" x1={MC.l} x2={MC.r} y1={sy(10 ** e)} y2={sy(10 ** e)} />
            <text className="sem-tick" x={MC.l - 8} y={sy(10 ** e)} textAnchor="end" dominantBaseline="middle">{e === 0 ? '1' : pow10(e)}</text>
          </g>
        ))}
        {[1880, 1920, 1960, 2000].map((y) => (
          <text key={y} className="sem-tick" x={sx(y)} y={MC.b + 8} textAnchor="middle" dominantBaseline="hanging">{y}</text>
        ))}
        {([[V_CMB, 'Expected, ether at rest with the CMB: 370 km/s'], [V_ORBIT, 'Expected from the orbit alone: 30 km/s']] as const).map(([v, label]) => (
          <g key={label} className="sem-mark">
            <line x1={MC.l} x2={MC.r} y1={sy(v)} y2={sy(v)} />
            <text x={MC.r - 4} y={sy(v) - 6} textAnchor="end">{label}</text>
          </g>
        ))}
        <path className="sem-axes" d={`M${MC.l},${MC.t} V${MC.b} H${MC.r}`} />
        {EXPERIMENTS.map((e) => {
          const [x, y] = [sx(e.year), sy(e.wind)]
          const on = e.id === selected
          return (
            <g key={e.id} className={`ew-point ${e.kind === 'claim' ? 'ew-point-claim' : 'ew-point-limit'}${on ? ' ew-point-on' : ''}`}
              data-experiment={e.id} onClick={() => onSelect(e.id)}>
              {e.kind === 'claim' ? (
                <circle cx={x} cy={y} r={on ? 9 : 7} />
              ) : (
                <>
                  <line x1={x} y1={y} x2={x} y2={y + 22} />
                  <path d={`M${x - (on ? 9 : 7)},${y} h${on ? 18 : 14} l-${on ? 9 : 7},${on ? 12 : 10}z`} />
                </>
              )}
            </g>
          )
        })}
      </svg>
      <p className="sem-axis-title sem-x-title">Year →</p>
      <ul className="skb-legend">
        <li><span className="ew-key ew-key-claim" />A wind claimed</li>
        <li><span className="ew-key ew-key-limit" />No wind seen: the most it could be</li>
      </ul>
    </div>
  )
}

function MillerSection() {
  const [id, setId] = useState('miller')
  const e = EXPERIMENTS.find((x) => x.id === id) as Experiment
  return (
    <figure className="wave" id="miller">
      <figcaption>
        <h2>4. Miller’s claims and the null results</h2>
        <p>
          Dayton Miller, Morley’s collaborator, repeated the experiment on Mount Wilson in 1921 and 1925–26 with
          a 32 m light path and reported a real wind of about 10 km/s — the only positive result among the
          careful runs. Every other experiment, before and since, saw nothing; each mark below is the largest
          wind its run could have missed. The modern ones rule out a wind ten thousand times weaker than Miller’s.
        </p>
      </figcaption>
      <div className="lp-controls">
        <Choices label="Experiment" options={EXPERIMENTS.map((x): [string, string] => [x.id, `${x.name} ${x.year}`])} value={id} onChange={setId} />
      </div>
      <MillerChart selected={id} onSelect={setId} />
      <div className="ew-detail" data-testid="experiment-detail">
        <h3>
          {e.name}, {e.year}
          <span className={`wave-badge ${e.kind === 'claim' ? 'ew-badge-claim' : 'spec-measured'}`}>
            {e.kind === 'claim' ? 'Claimed wind' : 'No wind seen'}
          </span>
        </h3>
        <dl className="wave-facts">
          <div>
            <dt>Where</dt>
            <dd>{e.where}</dd>
          </div>
          <div>
            <dt>{e.kind === 'claim' ? 'Claimed' : 'At most'}</dt>
            <dd>{kms(e.wind)}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{e.result}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{e.source}</dd>
          </div>
        </dl>
      </div>
      <p className="muted sem-note">
        The classical limits come from each run’s own numbers: the shift grows as the wind squared, so seeing at
        most a fraction f of the shift a 30 km/s wind would give limits the wind to 30 km/s × √f. The resonators
        bound how much light speed differs along and across a direction, Δc/c; a classical wind would make it
        v²/2c², so they bound the wind to c √(2 Δc/c).
      </p>
    </figure>
  )
}

const FINDINGS: Finding[] = [
  {
    id: 'mm-null',
    title: 'No ether wind in 1887',
    text: 'Michelson and Morley’s interferometer could see a wind of a few km/s; it showed at most a fortieth of the shift the Earth’s 30 km/s orbital motion should give. Einstein’s 1905 relativity made the null result a law: light’s speed is c for every observer, and no wind exists to find.',
    source: 'Michelson & Morley, American Journal of Science 34, 333 (1887)',
  },
  {
    id: 'hammar',
    title: 'Matter drags no ether',
    text: 'Gustaf Hammar sent one arm of an interferometer through a heavy lead-walled pipe, which would hold back a dragged ether, and the other in the open. Turning it changed nothing, ruling out Stokes’ dragged ether at the ground.',
    source: 'Hammar, Physical Review 48, 462 (1935)',
  },
  {
    id: 'resonators',
    title: 'Light speed is the same every way to 1 part in 10¹⁸',
    text: 'Turning optical and microwave resonators, compared for a year as the Earth swings round its orbit and the Sun moves against the CMB, find no direction in which light runs faster — a classical wind of under half a metre per second, where 30 km/s was expected.',
    source: 'Herrmann et al., Physical Review D 80, 105011 (2009); Nagel et al., Nature Communications 6, 8174 (2015)',
  },
]

export default function EtherWind() {
  return (
    <div className="waves">
      <h1>The ether wind in 2D</h1>
      <p className="muted">
        Nineteenth-century physics held that light is a wave in an invisible ether filling space. The Earth,
        racing round the Sun at 30 km/s, would then feel an ether wind, as a cyclist feels moving air on a still
        day. Below, the wind that theory predicts is drawn four ways — around the orbit, in the instrument
        built to catch it, past the Earth itself, and against every attempt to measure it. No experiment has
        found it.
      </p>
      <OrbitSection />
      <MichelsonSection />
      <FlowSection />
      <MillerSection />
      <h2 className="wave-group">What has been measured</h2>
      <MeasuredCards findings={FINDINGS} />
    </div>
  )
}
