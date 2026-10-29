// The human aura in 2D, frequency and vibration: the aura as esoteric sources describe it (seven coloured
// layers) drawn beside the body's measured emissions (heat, microwaves, biophotons, and the heart's, brain's
// and muscles' electric and magnetic fields). In both pictures a layer's colour is its frequency and its
// ripple height its vibration strength, read as decibels above the best sensor's noise. A chart then sets
// the measured layers on one frequency × vibration plane against the claimed aura frequencies, and three
// "Measured" cards say what tests of the aura found. Everything is computed here; no API call.
import { useState } from 'react'
import Choices from '../components/Choices'
import { type Finding, MeasuredCards } from '../components/Spectrum'
import { W } from '../components/WavePanel'
import { C, pow10, sci } from './LightPressure'

const SIGMA = 5.670_374e-8 // Stefan–Boltzmann constant, W/(m²·K⁴)
const WIEN_F = 5.879e10 // Wien's law in frequency: the peak of thermal emission, Hz per kelvin
const SKIN_EMISSIVITY = 0.98
const NETD = 0.05 // a good thermal camera's smallest visible temperature step, K

export type State = 'rest' | 'exercise' | 'sleep'
export const STATES: [State, string][] = [
  ['rest', 'Awake at rest'],
  ['exercise', 'Hard exercise'],
  ['sleep', 'Deep sleep'],
]

// What changes with the body's state: skin temperature, heart rate, the dominant brain rhythm and its size
// on the scalp, and how hard the muscles are working. Typical values: MEG and clean EEG need a still
// subject, so the exercise figures are what the rhythms would give, not readings taken mid-exercise.
interface Physiology {
  skin: number // K
  heart: number // Hz
  brain: number // Hz
  eeg: number // V
  meg: number // T
  emg: number // V
  brainBand: string
}
export const PHYSIOLOGY: Record<State, Physiology> = {
  rest: { skin: 306, heart: 1.2, brain: 10, eeg: 50e-6, meg: 1e-12, emg: 20e-6, brainBand: 'alpha' },
  exercise: { skin: 308, heart: 2.5, brain: 20, eeg: 10e-6, meg: 1e-13, emg: 1e-3, brainBand: 'beta' },
  sleep: { skin: 307, heart: 0.95, brain: 2, eeg: 100e-6, meg: 1e-12, emg: 5e-6, brainBand: 'delta' },
}

// Thermal emission of skin: total power per m² and the frequency where it peaks.
export const skinPower = (t: number) => SKIN_EMISSIVITY * SIGMA * t ** 4
export const heatPeak = (t: number) => WIEN_F * t

// A layer of the measured aura: its frequency, its strength and the noise floor of the best sensor for it.
// A field (volts, tesla) compares in amplitude, 20 log₁₀; a power (W/m², kelvin of brightness) in 10 log₁₀.
export interface Layer {
  id: string
  name: string
  short: string
  freq: number // Hz
  value: number
  floor: number
  kind: 'field' | 'power'
  show: string // the strength, in words
  sensor: string
  reach: string
  source: string
}
export const vibrationDb = (l: Pick<Layer, 'value' | 'floor' | 'kind'>) =>
  (l.kind === 'field' ? 20 : 10) * Math.log10(l.value / l.floor)

const volts = (v: number) => (v >= 1e-3 ? `${sci(v * 1e3)} mV` : `${sci(v * 1e6)} µV`)
// Noise floors are for about a 1 Hz bandwidth, the slow rhythms' own.
const ELECTRODES = 'Skin electrodes (≈1 µV noise, ~1 Hz band)'
const SQUID = 'SQUID magnetometer in a shielded room (≈5 fT/√Hz)'
const tesla = (t: number) => (t >= 1e-12 ? `${sci(t * 1e12)} pT` : `${sci(t * 1e15)} fT`)

// In ring order from the body outward; the order and the gaps are illustrative, each layer's reach is in `reach`.
export function measuredLayers(state: State): Layer[] {
  const p = PHYSIOLOGY[state]
  const heat = skinPower(p.skin)
  return [
    {
      id: 'biophotons',
      name: 'Visible glow (biophotons)',
      short: 'Biophotons',
      freq: C / 550e-9,
      value: 1e-12,
      floor: 1e-14,
      kind: 'power',
      show: 'about 10⁻¹² W/m² — a few hundred photons per second per cm²',
      sensor: 'Cooled CCD camera, long exposures in total darkness (≈10⁻¹⁴ W/m²)',
      reach: 'Leaves the skin; the only visible light the body makes',
      source: 'Kobayashi, Kikuchi & Okamura, PLoS ONE 4, e6256 (2009)',
    },
    {
      id: 'emg',
      name: 'Muscle electricity (EMG)',
      short: 'Muscles (EMG)',
      freq: 100,
      value: p.emg,
      floor: 1e-6,
      kind: 'field',
      show: `${volts(p.emg)} at the skin`,
      sensor: ELECTRODES,
      reach: 'Measured on the skin over the muscle',
      source: 'De Luca, Journal of Applied Biomechanics 13, 135 (1997)',
    },
    {
      id: 'ecg',
      name: 'Heart electricity (ECG)',
      short: 'Heart (ECG)',
      freq: p.heart,
      value: 1e-3,
      floor: 1e-6,
      kind: 'field',
      show: '1 mV at the skin (R wave)',
      sensor: ELECTRODES,
      reach: 'Over the whole skin; read on the chest and limbs',
      source: 'Malmivuo & Plonsey, Bioelectromagnetism, ch. 15 (1995)',
    },
    {
      id: 'eeg',
      name: 'Brain electricity (EEG)',
      short: 'Brain (EEG)',
      freq: p.brain,
      value: p.eeg,
      floor: 1e-6,
      kind: 'field',
      show: `${volts(p.eeg)} on the scalp (${p.brainBand} rhythm)`,
      sensor: ELECTRODES,
      reach: 'On the scalp only',
      source: 'Niedermeyer & Lopes da Silva, Electroencephalography, 5th ed. (2005)',
    },
    {
      id: 'heat',
      name: 'Heat (infrared)',
      short: 'Heat (IR)',
      freq: heatPeak(p.skin),
      value: heat,
      floor: 4 * SKIN_EMISSIVITY * SIGMA * p.skin ** 3 * NETD,
      kind: 'power',
      show: `${Math.round(heat)} W/m² out from skin at ${(p.skin - 273.15).toFixed(0)} °C (net loss to a 20 °C room: ${Math.round(heat - skinPower(293.15))} W/m²); peak per unit frequency, ${(C / heatPeak(p.skin) * 1e6).toFixed(0)} µm`,
      sensor: `Thermal camera (sees ${NETD} K steps)`,
      reach: 'Radiates away; a thermal camera sees it across a room',
      source: 'Stefan–Boltzmann and Wien laws; skin emissivity 0.98',
    },
    {
      id: 'microwave',
      name: 'Microwave heat',
      short: 'Microwaves',
      freq: 3e9,
      value: 310,
      floor: 0.1,
      kind: 'power',
      show: 'the thermal tail of body heat, a brightness of 310 K',
      sensor: 'Medical microwave radiometer (0.1 K)',
      reach: 'Comes out from a few cm deep in the tissue',
      source: 'Microwave radiometry of tissue temperature (Rayleigh–Jeans tail of 37 °C)',
    },
    {
      id: 'meg',
      name: 'Brain magnetism (MEG)',
      short: 'Brain (MEG)',
      freq: p.brain,
      value: p.meg,
      floor: 5e-15,
      kind: 'field',
      show: `${tesla(p.meg)} just outside the head (${p.brainBand} rhythm)`,
      sensor: SQUID,
      reach: 'A few cm outside the head',
      source: 'Hämäläinen et al., Reviews of Modern Physics 65, 413 (1993)',
    },
    {
      id: 'mcg',
      name: 'Heart magnetism (MCG)',
      short: 'Heart (MCG)',
      freq: p.heart,
      value: 50e-12,
      floor: 5e-15,
      kind: 'field',
      show: '50 pT just outside the chest — the body’s strongest magnetic field',
      sensor: SQUID,
      reach: 'Tens of cm from the chest before it sinks under the noise',
      source: 'Malmivuo & Plonsey, Bioelectromagnetism, ch. 20 (1995)',
    },
  ]
}

// The aura of the esoteric sources: Barbara Brennan's seven layers, each drawn in the chakra colour popular
// accounts pair with it. A colour is a light frequency, c/λ; the sources give no strength for any layer.
export interface Claimed {
  id: string
  name: string
  colour: string
  css: string
  lambda: number // m
  brennan: string // the colour Brennan herself gives the layer
  holds: string
}
export const CLAIMED: Claimed[] = [
  { id: 'etheric', name: 'Etheric body', colour: 'Red', css: '#e53935', lambda: 680e-9, brennan: 'blue-grey', holds: 'physical sensation' },
  { id: 'emotional', name: 'Emotional body', colour: 'Orange', css: '#fb8c00', lambda: 610e-9, brennan: 'all colours, shifting', holds: 'feelings about oneself' },
  { id: 'mental', name: 'Mental body', colour: 'Yellow', css: '#fdd835', lambda: 580e-9, brennan: 'yellow', holds: 'thoughts' },
  { id: 'astral', name: 'Astral body', colour: 'Green', css: '#43a047', lambda: 530e-9, brennan: 'rose', holds: 'love and relationships' },
  { id: 'etheric-template', name: 'Etheric template', colour: 'Blue', css: '#1e88e5', lambda: 470e-9, brennan: 'cobalt blue', holds: 'will' },
  { id: 'celestial', name: 'Celestial body', colour: 'Indigo', css: '#5c6bc0', lambda: 440e-9, brennan: 'opalescent pastels', holds: 'spiritual feeling' },
  { id: 'ketheric', name: 'Ketheric template', colour: 'Violet', css: '#ab47bc', lambda: 410e-9, brennan: 'gold and silver', holds: 'the higher mind' },
]
export const claimedFreq = (c: Claimed) => C / c.lambda

// Valerie Hunt's claim that skin electrodes picked up "aura frequencies" of 100–1600 Hz.
export const HUNT_BAND: [number, number] = [100, 1600]

// One false-colour scale for the frequency of every measured layer, 0.1 Hz to 10¹⁵ Hz, log steps.
const F_LO = -1
const F_HI = 15
const RAMP = ['#6a4c93', '#1982c4', '#00b4d8', '#8ac926', '#ffca3a', '#ff595e']
const hex = (s: string) => [1, 3, 5].map((i) => Number.parseInt(s.slice(i, i + 2), 16))
export function freqColour(f: number): string {
  const t = Math.min(1, Math.max(0, (Math.log10(Math.max(f, 1e-3)) - F_LO) / (F_HI - F_LO))) * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(t))
  const [a, b] = [hex(RAMP[i]), hex(RAMP[i + 1])]
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * (t - i))).join(',')})`
}

// Ripples per ring grow with the frequency; their height with the vibration (decibels above the noise).
export const rippleCount = (f: number) => Math.max(3, Math.round(4 + 2.2 * Math.log10(f)))
const AMP_MAX = 6
export const rippleHeight = (db: number) => (Math.min(100, Math.max(0, db)) / 100) * AMP_MAX
const CLAIMED_HEIGHT = 3 // the claimed layers have no strength: drawn evenly

// --- The two figures: a body inside rings, one ring per layer. 420 × 600 viewBox. Rings sit GAP apart,
// more than two ripple heights, so neighbours never cross.
const FW = 420
const FH = 600
const CX = FW / 2
const CY = 300
const A0 = 98
const B0 = 188
const GAP = 2 * AMP_MAX + 4

// An ellipse around the body whose edge ripples k times round, h units high.
export function ringPath(i: number, k: number, h: number): string {
  const [a, b] = [A0 + i * GAP, B0 + i * GAP]
  const pts: string[] = []
  for (let s = 0; s <= 360; s++) {
    const t = (s * Math.PI) / 180
    const w = h * Math.sin(k * t)
    pts.push(`${(CX + (a + w) * Math.cos(t)).toFixed(1)},${(CY + (b + w) * Math.sin(t)).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

function Body() {
  return (
    <g className="au-body">
      <circle cx={CX} cy={CY - 146} r={26} />
      <path d={`M${CX - 50},${CY - 104} Q${CX},${CY - 116} ${CX + 50},${CY - 104} L${CX + 40},${CY + 50} Q${CX},${CY + 62} ${CX - 40},${CY + 50} Z`} />
      <polyline className="au-limb" points={`${CX - 44},${CY - 94} ${CX - 70},${CY - 22} ${CX - 76},${CY + 50}`} />
      <polyline className="au-limb" points={`${CX + 44},${CY - 94} ${CX + 70},${CY - 22} ${CX + 76},${CY + 50}`} />
      <polyline className="au-limb au-leg" points={`${CX - 20},${CY + 50} ${CX - 24},${CY + 116} ${CX - 26},${CY + 162}`} />
      <polyline className="au-limb au-leg" points={`${CX + 20},${CY + 50} ${CX + 24},${CY + 116} ${CX + 26},${CY + 162}`} />
    </g>
  )
}

interface Ring {
  id: string
  label: string
  colour: string
  path: string
}

function AuraFigure({ rings, selected, onSelect, label, side }: {
  rings: Ring[]
  selected: string
  onSelect: (id: string) => void
  label: string
  side: string
}) {
  return (
    <svg className="au-figure" viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label={label} data-side={side}>
      <rect className="au-sky" width={FW} height={FH} rx={8} />
      {rings.map((r) => (
        <path key={r.id} className={r.id === selected ? 'au-ring au-ring-on' : 'au-ring'} d={r.path} stroke={r.colour}
          data-layer={r.id} onClick={() => onSelect(r.id)}>
          <title>{r.label}</title>
        </path>
      ))}
      <Body />
    </svg>
  )
}

function FreqLegend() {
  const stops = RAMP.map((c, i) => `${c} ${((i / (RAMP.length - 1)) * 100).toFixed(0)}%`).join(', ')
  const vis = [C / 750e-9, C / 400e-9].map((f) => ((Math.log10(f) - F_LO) / (F_HI - F_LO)) * 100)
  return (
    <div className="au-legend">
      <p className="sem-axis-title">Colour = frequency (measured side, log scale)</p>
      <span className="au-ramp" style={{ background: `linear-gradient(90deg, ${stops})` }} aria-hidden="true">
        <span className="au-visible" style={{ left: `${vis[0]}%`, width: `${vis[1] - vis[0]}%` }} />
      </span>
      <span className="lp-ramp-ticks">
        <span>0.1 Hz</span>
        <span>1 kHz</span>
        <span>10 MHz</span>
        <span>100 GHz</span>
        <span>10¹⁵ Hz</span>
      </span>
      <p className="muted sem-note">
        The rainbow notch near the right end is visible light, 400–750 THz: where every colour of the claimed aura
        sits. Ripple height = vibration, in decibels above the best sensor’s noise.
      </p>
    </div>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="wave-facts au-facts">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const hz = (f: number) => {
  if (f >= 1e12) return `${sci(f / 1e12)} THz`
  if (f >= 1e9) return `${sci(f / 1e9)} GHz`
  if (f >= 1e6) return `${sci(f / 1e6)} MHz`
  if (f >= 1e3) return `${sci(f / 1e3)} kHz`
  return `${sci(f)} Hz`
}

function AuraSection({ state, setState }: { state: State; setState: (s: State) => void }) {
  const layers = measuredLayers(state)
  const [claimedId, setClaimedId] = useState(CLAIMED[0].id)
  const [measuredId, setMeasuredId] = useState('mcg')
  const cl = CLAIMED.find((c) => c.id === claimedId) as Claimed
  const me = layers.find((l) => l.id === measuredId) as Layer
  const claimedRings = CLAIMED.map((c, i) => ({
    id: c.id,
    label: `${c.name}: ${c.colour.toLowerCase()}`,
    colour: c.css,
    path: ringPath(i, rippleCount(claimedFreq(c)), CLAIMED_HEIGHT),
  }))
  const measuredRings = layers.map((l, i) => ({
    id: l.id,
    label: `${l.name}: ${hz(l.freq)}, ${vibrationDb(l).toFixed(0)} dB`,
    colour: freqColour(l.freq),
    path: ringPath(i, rippleCount(l.freq), rippleHeight(vibrationDb(l))),
  }))
  return (
    <figure className="wave" id="aura">
      <figcaption>
        <h2>1. The aura, drawn two ways</h2>
        <p>
          Left, the aura as the esoteric sources describe it: seven layers around the body, each said to vibrate
          faster than the one inside it. Right, everything the body is measured to give off, drawn the same way.
          In both, a ring’s colour is its frequency and its ripples its vibration — tighter for a higher
          frequency, taller for a stronger signal. The seven claimed colours span less than a factor of two in
          frequency, so their ripples look alike. Click a ring, or pick it below.
        </p>
      </figcaption>
      <div className="lp-controls">
        <Choices label="Body state" options={STATES} value={state} onChange={setState} />
      </div>
      <div className="au-pair">
        <div>
          <h3>
            Esoteric aura<span className="wave-badge ew-badge-claim">Claimed</span>
          </h3>
          <AuraFigure rings={claimedRings} selected={claimedId} onSelect={setClaimedId} side="claimed"
            label="The seven-layer aura of the esoteric sources: rings red to violet around a body" />
          <Choices label="Claimed layer" options={CLAIMED.map((c): [string, string] => [c.id, c.name])} value={claimedId} onChange={setClaimedId} />
          <div className="ew-detail" data-testid="claimed-detail">
            <h3>{cl.name}</h3>
            <Facts rows={[
              ['Colour', `${cl.colour}, ${Math.round(cl.lambda * 1e9)} nm (popular chakra pairing)`],
              ['Brennan’s', cl.brennan],
              ['Frequency', `${hz(claimedFreq(cl))} (the drawn colour’s light)`],
              ['Vibration', 'Said to be higher than the layer inside; no strength given'],
              ['Said to hold', cl.holds],
              ['Source', 'Brennan, Hands of Light (1987); chakra colours as popular accounts pair them'],
            ]} />
          </div>
        </div>
        <div>
          <h3>
            Measured emissions<span className="wave-badge spec-measured">Measured</span>
          </h3>
          <AuraFigure rings={measuredRings} selected={measuredId} onSelect={setMeasuredId} side="measured"
            label="The body's measured emissions as rings: heat, microwaves, biophotons, and electric and magnetic fields" />
          <Choices label="Measured layer" options={layers.map((l): [string, string] => [l.id, l.short])} value={measuredId} onChange={setMeasuredId} />
          <div className="ew-detail" data-testid="measured-detail">
            <h3>{me.name}</h3>
            <Facts rows={[
              ['Frequency', hz(me.freq)],
              ['Strength', me.show],
              ['Vibration', `${vibrationDb(me).toFixed(0)} dB above the sensor’s noise`],
              ['Sensor', me.sensor],
              ['Reach', me.reach],
              ['Source', me.source],
            ]} />
          </div>
        </div>
      </div>
      <FreqLegend />
    </figure>
  )
}

// --- 2. Frequency across (log), vibration up (dB above the sensor's noise).
const CH = 400
const P = { l: 56, r: W - 16, t: 16, b: 352 }
const X_LO = -1
const X_HI = 16

// Each point's label goes right, left, above or below it: the first place that stays inside the plot and
// clears every point and every label already placed.
type Box = [number, number, number, number] // x0, y0, x1, y1
const hits = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
export function placeLabels(
  pts: { x: number; y: number; text: string }[],
  area: { l: number; r: number; t: number; b: number },
  reserved: Box[] = [],
) {
  const dots: Box[] = pts.map(({ x, y }) => [x - 8, y - 8, x + 8, y + 8])
  const taken: Box[] = [...reserved]
  return pts.map(({ x, y, text }, i) => {
    const w = 7.5 * text.length
    const spots: { x: number; y: number; anchor: 'start' | 'end' | 'middle'; box: Box }[] = [
      { x: x + 11, y, anchor: 'start', box: [x + 11, y - 8, x + 11 + w, y + 8] },
      { x: x - 11, y, anchor: 'end', box: [x - 11 - w, y - 8, x - 11, y + 8] },
      { x, y: y - 17, anchor: 'middle', box: [x - w / 2, y - 25, x + w / 2, y - 9] },
      { x, y: y + 17, anchor: 'middle', box: [x - w / 2, y + 9, x + w / 2, y + 25] },
      { x: x - 6, y: y - 17, anchor: 'start', box: [x - 6, y - 25, x - 6 + w, y - 9] },
      { x: x - 6, y: y + 17, anchor: 'start', box: [x - 6, y + 9, x - 6 + w, y + 25] },
    ]
    // Clashes with points, placed labels and the plot's edge; the first spot with none wins, else the fewest.
    const clashes = (b: Box) =>
      dots.filter((d, j) => j !== i && hits(b, d)).length + taken.filter((t) => hits(b, t)).length +
      (b[0] >= area.l && b[2] <= area.r && b[1] >= area.t && b[3] <= area.b ? 0 : 1)
    const spot = spots.reduce((best, sp) => (clashes(sp.box) < clashes(best.box) ? sp : best))
    taken.push(spot.box)
    return spot
  })
}

function VibrationChart({ layers }: { layers: Layer[] }) {
  const sx = (f: number) => P.l + ((Math.log10(f) - X_LO) / (X_HI - X_LO)) * (P.r - P.l)
  const sy = (db: number) => P.b - (Math.min(100, Math.max(0, db)) / 100) * (P.b - P.t)
  const bands: [number, number, string, string, 'start' | 'end'][] = [
    [HUNT_BAND[0], HUNT_BAND[1], 'au-band-hunt', 'Hunt’s “aura frequencies”', 'start'],
    [C / 750e-9, C / 400e-9, 'au-band-colour', 'Aura colours', 'end'],
  ]
  const points = layers.map((l) => ({ l, x: sx(l.freq), y: sy(vibrationDb(l)) }))
  // The band labels sit along the top; the point labels keep clear of them.
  const bandBoxes = bands.map(([lo, hi, , label, anchor]): Box => {
    const w = 7.5 * label.length
    return anchor === 'start' ? [sx(hi) + 4, P.t + 6, sx(hi) + 4 + w, P.t + 22] : [sx(lo) - 4 - w, P.t + 6, sx(lo) - 4, P.t + 22]
  })
  const labels = placeLabels(points.map(({ l, x, y }) => ({ x, y, text: l.short })), P, bandBoxes)
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Vibration: dB above the best sensor’s noise</p>
      <div className="au-scroll">
      <svg className="sem-plot" viewBox={`0 0 ${W} ${CH}`} role="img"
        aria-label="Each measured layer by frequency and vibration, beside the bands the aura is claimed to occupy">
        {bands.map(([lo, hi, cls, label, anchor]) => (
          <g key={cls} className={`au-band ${cls}`} data-band={cls}>
            <rect x={sx(lo)} y={P.t} width={Math.max(6, sx(hi) - sx(lo))} height={P.b - P.t} />
            <text x={anchor === 'start' ? sx(hi) + 4 : sx(lo) - 4} y={P.t + 14} textAnchor={anchor}>{label}</text>
          </g>
        ))}
        {[0, 20, 40, 60, 80, 100].map((d) => (
          <g key={d}>
            <line className="sem-grid" x1={P.l} x2={P.r} y1={sy(d)} y2={sy(d)} />
            <text className="sem-tick" x={P.l - 8} y={sy(d)} textAnchor="end" dominantBaseline="middle">{d}</text>
          </g>
        ))}
        {[0, 3, 6, 9, 12, 15].map((e) => (
          <text key={e} className="sem-tick" x={sx(10 ** e)} y={P.b + 8} textAnchor="middle" dominantBaseline="hanging">
            {e === 0 ? '1' : pow10(e)}
          </text>
        ))}
        <path className="sem-axes" d={`M${P.l},${P.t} V${P.b} H${P.r}`} />
        {points.map(({ l, x, y }, i) => (
          <g key={l.id} className="au-point" data-point={l.id}>
            <circle cx={x} cy={y} r={7} fill={freqColour(l.freq)} />
            <text x={labels[i].x} y={labels[i].y} textAnchor={labels[i].anchor} dominantBaseline="middle">{l.short}</text>
          </g>
        ))}
      </svg>
      </div>
      <p className="sem-axis-title sem-x-title">Frequency, Hz (log scale) →</p>
    </div>
  )
}

function ChartSection({ state }: { state: State }) {
  return (
    <figure className="wave" id="chart">
      <figcaption>
        <h2>2. Frequency against vibration</h2>
        <p>
          The measured layers on one plane, for the body state chosen above. The shaded bands are where the aura
          is claimed to be. The seven aura colours fall in one thin band of visible light, where the only thing
          the body gives off is the biophoton glow, about a thousand times too faint for any eye. Valerie Hunt’s
          “aura frequencies” of {HUNT_BAND[0]}–{HUNT_BAND[1]} Hz, read with skin electrodes, fall in the band of
          ordinary muscle electricity, which the same electrodes pick up. (Hunt, Massey, Weinberg, Bruyere & Hahn,
          “A Study of Structural Integration from Neuromuscular, Energy Field, and Emotional Approaches”, UCLA
          report, 1977; not peer reviewed.)
        </p>
      </figcaption>
      <VibrationChart layers={measuredLayers(state)} />
      <p className="muted sem-note">
        Fields (volts, tesla) count 20 dB per factor of ten in amplitude, powers 10 dB. Heat and microwaves are
        drawn at their peak per unit frequency (18 THz, about 17 µm; the often-quoted 9.5 µm is the peak per unit
        wavelength) and at a typical radiometer frequency; both are one smooth thermal spectrum.
      </p>
    </figure>
  )
}

const FINDINGS: Finding[] = [
  {
    id: 'readers',
    title: 'Aura readers cannot find a hidden person',
    text: 'People who said they saw auras were asked whether someone stood behind an opaque screen, whose edge the aura would have to extend past. They did no better than chance.',
    source: 'Gissurarson & Gunnarsson, Journal of the American Society for Psychical Research 91, 33 (1997)',
  },
  {
    id: 'kirlian',
    title: 'Kirlian “aura” photos follow moisture',
    text: 'The glowing halo of a fingertip in Kirlian (corona discharge) photography changed with the moisture on the finger; the changes credited to emotional state followed from sweating.',
    source: 'Pehek, Kyler & Faust, Science 194, 263 (1976)',
  },
  {
    id: 'glow',
    title: 'The body does glow — a thousand times too faintly to see',
    text: 'Cooled cameras in total darkness image a real visible glow from the face and body, rising and falling over the day. It comes from chemical reactions in the skin and is about a thousand times below what the eye can detect.',
    source: 'Kobayashi, Kikuchi & Okamura, PLoS ONE 4, e6256 (2009)',
  },
]

export default function Aura() {
  const [state, setState] = useState<State>('rest')
  return (
    <div className="waves">
      <h1>The human aura in 2D</h1>
      <p className="muted">
        Esoteric traditions describe an aura: layers of coloured light around the body, each vibrating at its own
        frequency. Below, that aura is drawn beside what the body is measured to give off, with frequency as
        colour and vibration as ripple. The body does radiate, but nothing measured matches the aura’s colours,
        and tests of people who say they see auras have found nothing.
      </p>
      <AuraSection state={state} setState={setState} />
      <ChartSection state={state} />
      <h2 className="wave-group">What has been measured</h2>
      <MeasuredCards findings={FINDINGS} />
    </div>
  )
}
