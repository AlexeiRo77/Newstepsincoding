// Thymus vibrations as P. P. Garyaev's "wave genetics" would picture them: a young thymus as a coherent
// vibration, an aged (fat-replaced) one as a weaker, garbled one. The page draws both as a 2D map over the
// organ's shape — each lobe a vibrating sheet whose mode k vibrates at k·f₀ — then decodes the same model
// signals into a spectrum and reads it, and sets the picture against what has been measured about the
// thymus. The theory is an unconfirmed hypothesis and gives no thymus frequencies, shapes or amplitudes;
// every number of the model is this page's illustrative choice. Everything is computed here; no API call.
import {
  type Finding,
  HARMONIC_KS,
  harmonicAmp,
  harmonicPhase,
  harmonicSignal,
  MeasuredCards,
  N,
  ReadingsTable,
  read,
  rng,
  SEG,
  SpectrumChart,
  toDb,
  welch,
} from '../components/Spectrum'

// The aged thymus: most of its space turned to fat, which does not take part; what tissue is left vibrates
// at AGED_AMP of the young amplitude, its phase wandering and with noise on top.
export const AGED_FAT = 0.85
export const AGED_AMP = 0.3
const AGED_JITTER = 0.08 // incoherent displacement per map cell, in units of the young peak
const YOUNG = { seed: 5, noise: 0.002 }
const AGED = { seed: 11, amp: AGED_AMP, sigma: 0.06, noise: 0.05 }

// The organ as seen from the front: two lobes side by side, narrow horns toward the neck, a rounded base
// over the heart. η runs 0 (top) … 1 (bottom) along a lobe.
const MW = 340
const MH = 380
const CELL = 5
const LOBES = [
  { cx: 100, hw: 70, top: 24, bottom: 356 },
  { cx: 237, hw: 64, top: 44, bottom: 346 },
]
const halfWidth = (hw: number, eta: number) => hw * (0.3 + 0.7 * Math.sqrt(eta)) * Math.sqrt(Math.max(0, 1 - eta ** 6))

// Where (x, y) falls in a lobe: η along it and ξ across it (−1 … 1 at the edges), or undefined outside.
function locate(x: number, y: number) {
  for (const l of LOBES) {
    const eta = (y - l.top) / (l.bottom - l.top)
    if (eta <= 0 || eta >= 1) continue
    const xi = (x - l.cx) / halfWidth(l.hw, eta)
    if (Math.abs(xi) < 1) return { eta, xi }
  }
  return undefined
}

// The young displacement at one instant: mode k has k antinodes along the lobe and one across it, with the
// harmonic's amplitude and phase from the model signal, so the young map and its spectrum are the same
// vibration. The aged map shows its weakness and loss of step as amplitude and per-cell jitter.
const mode = (eta: number, xi: number) =>
  Math.cos((Math.PI * xi) / 2) *
  HARMONIC_KS.reduce((s, k) => s + harmonicAmp(k) * Math.cos(harmonicPhase(k)) * Math.sin(k * Math.PI * eta), 0)

export interface Cell {
  x: number
  y: number
  u: number // displacement, in units of the young map's largest; NaN where fat
}

export interface OrganMap {
  cells: Cell[]
  fat: number // share of the organ's cells that are fat
  rms: number // root-mean-square displacement over the whole organ, young = 1
}

function buildMaps(): { young: OrganMap; aged: OrganMap } {
  const inside: { x: number; y: number; m: number }[] = []
  for (let y = 0; y < MH; y += CELL)
    for (let x = 0; x < MW; x += CELL) {
      const at = locate(x + CELL / 2, y + CELL / 2)
      if (at) inside.push({ x, y, m: mode(at.eta, at.xi) })
    }
  const peak = Math.max(...inside.map((c) => Math.abs(c.m)))
  // Fat comes in lobules: a smooth random field, the highest AGED_FAT of it turned to fat.
  const gauss = rng(13)
  const waves = Array.from({ length: 8 }, () => ({ kx: gauss() / 18, ky: gauss() / 18, ph: gauss() * 3 }))
  const field = inside.map((c) => waves.reduce((s, w) => s + Math.cos(w.kx * c.x + w.ky * c.y + w.ph), 0))
  const cut = [...field].sort((a, b) => a - b)[Math.floor((1 - AGED_FAT) * field.length)]
  const young = inside.map((c) => ({ x: c.x, y: c.y, u: c.m / peak }))
  const aged = inside.map((c, i) => ({
    x: c.x,
    y: c.y,
    u: field[i] >= cut ? Number.NaN : (AGED_AMP * c.m) / peak + AGED_JITTER * gauss(),
  }))
  const rms = (cells: Cell[]) =>
    Math.sqrt(cells.reduce((s, c) => s + (Number.isNaN(c.u) ? 0 : c.u * c.u), 0) / cells.length)
  const yRms = rms(young)
  return {
    young: { cells: young, fat: 0, rms: 1 },
    aged: { cells: aged, fat: aged.filter((c) => Number.isNaN(c.u)).length / aged.length, rms: rms(aged) / yRms },
  }
}

// Decoded once on first use and kept: the maps and spectra never change. Both spectra are scaled to the
// young one's strongest line, so the aged thymus's weakness shows.
let cached: { maps: ReturnType<typeof buildMaps>; young: number[]; aged: number[] } | undefined
export function model() {
  if (!cached) {
    const young = welch(harmonicSignal(YOUNG))
    const aged = welch(harmonicSignal(AGED))
    const top = Math.max(...young)
    cached = { maps: buildMaps(), young: young.map((p) => p / top), aged: aged.map((p) => p / top) }
  }
  return cached
}

// Displacement colours: blue (moving in) through near-white to red (moving out), in LEVELS steps per side.
const LEVELS = 8
const BLUE = [33, 102, 172]
const RED = [178, 24, 43]
const ZERO = [247, 247, 247]
const FAT = '#f1dd94'
function levelColor(level: number) {
  const end = level < 0 ? BLUE : RED
  const t = Math.abs(level) / LEVELS
  return `rgb(${ZERO.map((z, i) => Math.round(z + (end[i] - z) * t)).join(',')})`
}
const levelOf = (u: number) => Math.max(-LEVELS, Math.min(LEVELS, Math.round(u * LEVELS)))

function lobeOutline(l: (typeof LOBES)[number]) {
  const pts: string[] = []
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const eta = i / steps
    pts.push(`${(l.cx - halfWidth(l.hw, eta)).toFixed(1)},${(l.top + eta * (l.bottom - l.top)).toFixed(1)}`)
  }
  for (let i = steps; i >= 0; i--) {
    const eta = i / steps
    pts.push(`${(l.cx + halfWidth(l.hw, eta)).toFixed(1)},${(l.top + eta * (l.bottom - l.top)).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

// One path per colour, so a map is a few dozen elements rather than thousands.
function OrganMapSvg({ id, map, label }: { id: string; map: OrganMap; label: string }) {
  const groups = new Map<string, string[]>()
  for (const c of map.cells) {
    const fill = Number.isNaN(c.u) ? FAT : levelColor(levelOf(c.u))
    const d = groups.get(fill) ?? []
    d.push(`M${c.x},${c.y}h${CELL}v${CELL}h-${CELL}z`)
    groups.set(fill, d)
  }
  return (
    <svg className="thy-map" viewBox={`0 0 ${MW} ${MH}`} role="img" aria-label={label} data-map={id}>
      {[...groups].map(([fill, d]) => (
        <path key={fill} d={d.join('')} fill={fill} />
      ))}
      {LOBES.map((l) => (
        <path key={l.cx} className="thy-outline" d={lobeOutline(l)} />
      ))}
    </svg>
  )
}

const pct = (v: number) => `${Math.round(v * 100)}%`

function OrganMaps() {
  const { maps } = model()
  const panels = [
    { id: 'young', title: 'Young thymus (child)', map: maps.young, label: 'Young thymus: both lobes vibrate as one smooth, strong pattern of bands' },
    { id: 'aged', title: 'Aged thymus (about 70 years)', map: maps.aged, label: 'Aged thymus: mostly fat, which stays still; the islands of tissue left vibrate weakly and out of step' },
  ]
  return (
    <>
      <div className="thy-maps">
        {panels.map((p) => (
          <div key={p.id} className="thy-panel">
            <h3>{p.title}</h3>
            <OrganMapSvg id={p.id} map={p.map} label={p.label} />
            <dl className="wave-facts">
              <div>
                <dt>Tissue</dt>
                <dd>{pct(1 - p.map.fat)} of the organ</dd>
              </div>
              <div>
                <dt>Vibration</dt>
                <dd>{pct(p.map.rms)} of the young thymus (rms)</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <ul className="skb-legend">
        <li>
          <span className="thy-ramp" aria-hidden="true" />
          moving in · still · moving out
        </li>
        <li>
          <span className="thy-swatch" style={{ background: FAT }} />
          fat (does not vibrate)
        </li>
      </ul>
    </>
  )
}

const fixed = (v: number, d = 2) => v.toFixed(d)

function Readings() {
  const s = model()
  const y = read(s.young)
  const a = read(s.aged)
  const strength = (p: number[]) => `${Math.round(toDb(Math.max(...p.slice(1))))} dB`
  return (
    <ReadingsTable
      columns={['Young', 'Aged']}
      rows={[
        ['Main line strength', [strength(s.young), strength(s.aged)], 'power of the strongest line, against the young thymus'],
        ['Main line at', [`${fixed(y.peak)} f₀`, `${fixed(a.peak)} f₀`], 'where the strongest vibration sits'],
        ['Line width', [`${fixed(y.linewidth, 3)} f₀`, `${fixed(a.linewidth, 3)} f₀`], 'how long the vibration stays in step (young: the window’s resolution limit, about f₀/48)'],
        ['Noise floor', [`${Math.round(y.floorDb)} dB`, `${Math.round(a.floorDb)} dB`], 'median power across the band, below its own main line'],
        ['Disorder (spectral entropy)', [fixed(y.entropy), fixed(a.entropy)], '0 = one pure tone, 1 = white noise'],
      ]}
    />
  )
}

const SERIES = [
  { id: 'young', name: 'Young thymus (model)', color: '#2e7d32' },
  { id: 'aged', name: 'Aged thymus (model)', color: '#c62828' },
] as const

// What has actually been measured about the thymus, its ageing and how it meets waves.
const FINDINGS: Finding[] = [
  {
    id: 'involution',
    title: 'The thymus turns to fat with age',
    text: 'The thymus is where T cells, a family of white blood cells, learn to tell the body from invaders. Its working tissue shrinks from the first year of life — by about 3% a year until middle age and about 1% a year after — and fat fills the space, so in old age only a small fraction of the organ is still thymic tissue.',
    source: 'Steinmann, Klaus, Müller-Hermelink, Scandinavian Journal of Immunology (1985)',
  },
  {
    id: 'output',
    title: 'The aged thymus still works, less',
    text: 'New T cells carry a small circle of DNA (TREC) left over from their making in the thymus. Counting these circles in blood showed the thymus still sends out new T cells late in adult life, at a rate that falls with age.',
    source: 'Douek et al., Nature (1998)',
  },
  {
    id: 'ultrasound',
    title: 'Ultrasound measures the child’s thymus',
    text: 'In infants the thymus is large and is imaged by ultrasound through the chest; its size is measured as a “thymic index”. This is how the organ reflects sound sent into it, not a sound or wave it sends out. No thymus vibration “signature” — and no genetic signal in any vibration — has been established.',
    source: 'Hasselbalch et al., Acta Paediatrica (1996)',
  },
]

export default function ThymusWaves() {
  return (
    <div className="waves">
      <h1>Thymus vibrations in Garyaev’s wave genetics</h1>
      <p className="muted">
        Pyotr P. Garyaev’s “wave genome” (1990s) holds that DNA works as an antenna and a sound source: chromosomes
        are said to send and take in light, sound and radio waves that carry genetic information, so that an
        organ’s health would show as a coherent wave pattern and its decline as a garbled one. The theory gives no
        thymus frequencies of its own; this page applies that general picture to the thymus — the organ behind the
        breastbone that trains T cells and, with age, turns to fat.
      </p>
      <p className="muted">
        Below, that picture is turned into numbers: a young and an aged thymus are modelled as 2D vibration maps
        over the organ, then the same vibrations are decoded into frequency spectra and read.{' '}
        <strong>This is a drawing of a hypothesis, not a measurement and not a diagnostic</strong> — the thymus
        is examined by doctors, with imaging and blood tests.
      </p>

      <figure className="wave wave-hypothesis" id="organ-map">
        <figcaption>
          <h2>
            The 2D vibration map
            <span className="wave-badge">Hypothesis — not confirmed</span>
          </h2>
          <p>
            Each lobe is modelled as a sheet fixed at its edges. Its k-th mode has k bands along the lobe and
            vibrates at k·f₀ — the lines of the spectrum below; the map shows how far each point is pushed out
            (red) or in (blue) at one instant. In the aged thymus {pct(AGED_FAT)} of the organ is fat, which
            stays still; the tissue left vibrates at {pct(AGED_AMP)} of the young amplitude and partly out of
            step. The theory gives none of these numbers — they are this page’s illustrative choices.
          </p>
        </figcaption>
        <OrganMaps />
      </figure>

      <figure className="wave wave-hypothesis" id="spectrum">
        <figcaption>
          <h2>
            The decoded spectrum
            <span className="wave-badge">Hypothesis — not confirmed</span>
          </h2>
          <p>
            Young, in the theory’s terms, is a coherent vibration: sharp lines at f₀ and its harmonics, far above a
            quiet floor. Aged is weaker and garbled: the same lines {Math.round(-toDb(Math.max(...model().aged.slice(1))))} dB
            lower and more, their phase wandering so each line smears out (the higher harmonics most), over a floor of
            noise.
          </p>
        </figcaption>
        <SpectrumChart
          series={SERIES.map((ser) => ({ ...ser, power: model()[ser.id] }))}
          yTitle="Power, dB below the young thymus’s strongest line"
          label="Decoded spectra: the young thymus model shows sharp lines at f₀, 2f₀, 3f₀…; the aged model shows weaker, broadened lines over a noise floor"
        />
        <Readings />
        <p className="muted sem-note">
          How it is decoded: each signal is {N.toLocaleString('en')} samples long; it is cut into half-overlapping
          pieces of {SEG}, each is tapered (Hann window) and run through a Fourier transform, and the power of the
          pieces is averaged (Welch’s method). The readings are then taken from the averaged spectrum.
        </p>
      </figure>

      <h2 className="wave-group">What has been measured</h2>
      <p className="muted">
        No independent laboratory has reproduced Garyaev’s results; his core claims appeared mainly in books,
        conference proceedings and minor journals, and members of the Russian Academy of Sciences’ commission
        against pseudoscience named wave genetics as pseudoscience. What is known about the thymus comes from
        anatomy, immunology and imaging:
      </p>
      <MeasuredCards findings={FINDINGS} />
    </div>
  )
}
