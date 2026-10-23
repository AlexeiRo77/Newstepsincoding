// Tumor vibrations as P. P. Garyaev's "wave genetics" pictures them: a healthy cell's genetic signal is
// coherent, a tumor's is garbled. The page builds both signals from that model, decodes each into a
// frequency spectrum (Welch-averaged DFT) and reads the decoded numbers off it, then sets the claims against
// what research has measured. The theory is an unconfirmed hypothesis and gives no real frequencies, so the
// axis is in multiples of a reference frequency f₀. Everything is computed here; no API call.
import { TAU, W } from '../components/WavePanel'

// The model signal: harmonics k·f₀ (k = 1…5, amplitude 1/k), sampled at FS samples per 1/f₀.
const FS = 16 // samples per period of f₀, so the spectrum reaches 8 f₀
const SEG = 1024 // samples per DFT segment: resolution f₀/64
const N = SEG * 8 // the whole recording; 15 half-overlapping segments
export const F_MAX = 6 // the chart shows 0…6 f₀
const BINS = (F_MAX * SEG) / FS
const HARMONICS = 5

// Tumor: every line drawn 7% low, its phase wandering at random (each harmonic k times faster), on a floor
// of broadband noise. TUMOR_SIGMA sets the fundamental's linewidth: Lorentzian FWHM = σ²·FS/π ≈ 0.12 f₀.
export const TUMOR_SHIFT = 0.93
const TUMOR_SIGMA = 0.155
const TUMOR_NOISE = 0.25
const HEALTHY_NOISE = 0.002

// A seeded generator (mulberry32) and Gaussian draws, so every render decodes the same recording.
function rng(seed: number) {
  let a = seed
  const uniform = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(TAU * uniform())
}

export function modelSignal(tumor: boolean): Float64Array {
  const gauss = rng(tumor ? 7 : 3)
  const phase = new Float64Array(HARMONICS)
  const x = new Float64Array(N)
  for (let n = 0; n < N; n++) {
    let v = 0
    for (let k = 1; k <= HARMONICS; k++) {
      if (tumor) phase[k - 1] += k * TUMOR_SIGMA * gauss()
      v += Math.cos((TAU * k * (tumor ? TUMOR_SHIFT : 1) * n) / FS + phase[k - 1] + k) / k
    }
    x[n] = v + (tumor ? TUMOR_NOISE : HEALTHY_NOISE) * gauss()
  }
  return x
}

// Welch's method: Hann-windowed DFT of each half-overlapping segment, power averaged. Returns power per bin
// for 0…F_MAX f₀, normalised so the strongest bin is 1.
export function decode(x: Float64Array): number[] {
  const cos = new Float64Array(SEG)
  const sin = new Float64Array(SEG)
  const hann = new Float64Array(SEG)
  for (let i = 0; i < SEG; i++) {
    cos[i] = Math.cos((TAU * i) / SEG)
    sin[i] = Math.sin((TAU * i) / SEG)
    hann[i] = 0.5 - 0.5 * cos[i]
  }
  const power = new Array<number>(BINS + 1).fill(0)
  for (let start = 0; start + SEG <= x.length; start += SEG / 2) {
    for (let b = 0; b <= BINS; b++) {
      let re = 0
      let im = 0
      for (let i = 0; i < SEG; i++) {
        const v = x[start + i] * hann[i]
        const j = (b * i) % SEG
        re += v * cos[j]
        im -= v * sin[j]
      }
      power[b] += re * re + im * im
    }
  }
  const top = Math.max(...power)
  return power.map((p) => p / top)
}

export const binHz = (b: number) => (b * FS) / SEG // bin → frequency in units of f₀

export interface Reading {
  peak: number // centre of the strongest line (midway between its half-power edges), in f₀
  linewidth: number // its full width at half power, in f₀
  floorDb: number // median power across the band, dB below the peak
  entropy: number // spectral entropy, 0 (one pure line) … 1 (flat noise)
}

// What the decoded spectrum says: where the main line is, how wide, how deep the floor, how disordered.
export function read(power: number[]): Reading {
  const p = power.slice(1) // drop the DC bin
  const top = p.indexOf(Math.max(...p))
  let lo = top
  let hi = top
  while (lo > 0 && p[lo - 1] >= 0.5) lo--
  while (hi < p.length - 1 && p[hi + 1] >= 0.5) hi++
  // Interpolate where each flank crosses half power.
  const left = lo > 0 ? lo - (p[lo] - 0.5) / (p[lo] - p[lo - 1]) : lo
  const right = hi < p.length - 1 ? hi + (p[hi] - 0.5) / (p[hi] - p[hi + 1]) : hi
  const sorted = [...p].sort((a, b) => a - b)
  const total = p.reduce((s, v) => s + v, 0)
  const entropy = -p.reduce((s, v) => (v > 0 ? s + (v / total) * Math.log(v / total) : s), 0) / Math.log(p.length)
  return {
    peak: binHz((left + right) / 2 + 1),
    linewidth: binHz(right - left),
    floorDb: 10 * Math.log10(sorted[Math.floor(sorted.length / 2)]),
    entropy,
  }
}

// Decoded once on first use and kept: the two spectra never change.
let cached: { healthy: number[]; tumor: number[] } | undefined
export function spectra() {
  cached ??= { healthy: decode(modelSignal(false)), tumor: decode(modelSignal(true)) }
  return cached
}

// The chart: frequency 0…F_MAX f₀ across, power in dB (0 down to DB_MIN) up.
const CH = 300
const PL = 56
const PR = W - 12
const PT = 12
const PB = CH - 36
const DB_MIN = -70
export const sx = (f: number) => PL + (f / F_MAX) * (PR - PL)
const sy = (db: number) => PT + (Math.min(0, Math.max(DB_MIN, db)) / DB_MIN) * (PB - PT)
const toDb = (p: number) => 10 * Math.log10(Math.max(p, 1e-12))

export function spectrumPath(power: number[]): string {
  return `M${power.map((p, b) => `${sx(binHz(b)).toFixed(1)},${sy(toDb(p)).toFixed(1)}`).join('L')}`
}

const SERIES = [
  { id: 'healthy', name: 'Healthy cell (model)', color: '#2e7d32' },
  { id: 'tumor', name: 'Tumor cell (model)', color: '#c62828' },
] as const

const fixed = (v: number, d = 2) => v.toFixed(d)

function SpectrumChart() {
  const s = spectra()
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Power, dB below the strongest line</p>
      <svg
        className="sem-plot"
        viewBox={`0 0 ${W} ${CH}`}
        role="img"
        aria-label="Decoded spectra: the healthy model shows sharp lines at f₀, 2f₀, 3f₀…; the tumor model shows lines shifted lower, broadened and sunk in a noise floor"
      >
        {[0, -20, -40, -60].map((db) => (
          <g key={db}>
            <line className="sem-grid" x1={PL} x2={PR} y1={sy(db)} y2={sy(db)} />
            <text className="sem-tick" x={PL - 8} y={sy(db)} textAnchor="end" dominantBaseline="middle">
              {db}
            </text>
          </g>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((f) => (
          <text key={f} className="sem-tick" x={sx(f)} y={PB + 8} textAnchor="middle" dominantBaseline="hanging">
            {f === 0 ? '0' : f === 1 ? 'f₀' : `${f}f₀`}
          </text>
        ))}
        <path className="sem-axes" d={`M${PL},${PT} V${PB} H${PR}`} />
        {SERIES.map((ser) => (
          <path key={ser.id} className="sem-curve tw-curve" data-series={ser.id} d={spectrumPath(s[ser.id])} stroke={ser.color} />
        ))}
      </svg>
      <p className="sem-axis-title sem-x-title">Frequency, in multiples of the reference f₀ →</p>
      <ul className="skb-legend">
        {SERIES.map((ser) => (
          <li key={ser.id}>
            <span className="tw-swatch" style={{ background: ser.color }} />
            {ser.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Readings() {
  const s = spectra()
  const h = read(s.healthy)
  const t = read(s.tumor)
  const rows: [string, string, string, string][] = [
    ['Main line at', `${fixed(h.peak)} f₀`, `${fixed(t.peak)} f₀`, 'where the strongest vibration sits'],
    ['Line width', `${fixed(h.linewidth, 3)} f₀`, `${fixed(t.linewidth, 3)} f₀`, 'how long the vibration stays in step'],
    ['Noise floor', `${Math.round(h.floorDb)} dB`, `${Math.round(t.floorDb)} dB`, 'median power across the band'],
    ['Disorder (spectral entropy)', fixed(h.entropy), fixed(t.entropy), '0 = one pure tone, 1 = white noise'],
  ]
  return (
    <table className="tw-readings">
      <caption>Decoded from the two spectra above</caption>
      <thead>
        <tr>
          <th scope="col">Reading</th>
          <th scope="col">Healthy</th>
          <th scope="col">Tumor</th>
          <th scope="col">Means</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, healthy, tumor, means]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td data-label="Healthy">{healthy}</td>
            <td data-label="Tumor">{tumor}</td>
            <td data-label="Means">{means}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface Finding {
  id: string
  title: string
  text: string
  source: string
}

// What has actually been measured about tumor cells and tissue vibrating or responding to waves.
const FINDINGS: Finding[] = [
  {
    id: 'stiffness',
    title: 'Cancer cells are mechanically softer',
    text: 'Pressing on single cells with an atomic-force microscope, metastatic cancer cells taken from patients were more than 70% softer than benign cells from the same fluid. A softer cell vibrates differently, but this is a mechanical property, not a genetic signal.',
    source: 'Cross, Jin, Rao, Gimzewski, Nature Nanotechnology (2007)',
  },
  {
    id: 'dielectric',
    title: 'Tumor tissue responds differently to microwaves',
    text: 'Malignant breast tissue holds more water than fat and so has a higher permittivity and conductivity — up to about 10:1 against fatty tissue, far less against normal glandular tissue. Microwave breast imaging research builds on this contrast. It is how tissue absorbs an outside field, not a field the tissue sends out.',
    source: 'Lazebnik et al., Physics in Medicine and Biology (2007)',
  },
  {
    id: 'nanomotion',
    title: 'Living cells do move at audio frequencies',
    text: 'The wall of a yeast cell was found to vibrate at about 0.8–1.6 kHz with a few nanometres’ amplitude, and the motion stopped when the cell was killed. Such “nanomotion” is now used in lab tests of whether bacteria survive an antibiotic. None of it carries genetic information, and no tumor “signature” in it has been established.',
    source: 'Pelling et al., Science (2004); Longo et al., Nature Nanotechnology (2013)',
  },
]

export default function TumorWaves() {
  return (
    <div className="waves">
      <h1>Tumor vibrations in Garyaev’s wave genetics</h1>
      <p className="muted">
        Pyotr P. Garyaev’s “wave genome” (1990s) holds that DNA works as an antenna and a sound source: chromosomes
        are said to send and take in light, sound and radio waves that carry genetic information, and his group
        claimed that disease — cancer among it — could be read from these waves and even reversed by sending a
        healthy pattern back. In that picture a tumor is a tissue whose wave “text” has become garbled.
      </p>
      <p className="muted">
        Below, that picture is turned into numbers: a model healthy signal and a model tumor signal are built,
        decoded into their frequency spectra, and read. The theory gives no measured frequencies, so the axis is in
        multiples of a reference f₀. <strong>This is a drawing of a hypothesis, not a measurement and not a
        diagnostic</strong> — cancer is diagnosed and treated by doctors, with imaging and biopsy.
      </p>

      <figure className="wave wave-hypothesis" id="spectrum">
        <figcaption>
          <h2>
            The decoded spectrum
            <span className="wave-badge">Hypothesis — not confirmed</span>
          </h2>
          <p>
            Healthy, as the theory describes it: a coherent vibration — sharp lines at f₀ and its harmonics, standing
            far above a quiet floor. Tumor: the same lines drawn {Math.round((1 - TUMOR_SHIFT) * 100)}% lower, their
            phase wandering at random so each line smears out (the higher harmonics most), over a floor of noise.
          </p>
        </figcaption>
        <SpectrumChart />
        <Readings />
        <p className="muted sem-note">
          How it is decoded: each signal is {N.toLocaleString('en')} samples long; it is cut into half-overlapping
          pieces of {SEG}, each is tapered (Hann window) and run through a Fourier transform, and the power of the
          pieces is averaged (Welch’s method). The readings are then taken from the averaged spectrum.
        </p>
      </figure>

      <h2 className="wave-group">What has been measured</h2>
      <p className="muted">
        No independent laboratory has reproduced Garyaev’s results, they were not published in mainstream
        peer-reviewed journals, and members of the Russian Academy of Sciences’ commission against pseudoscience
        named wave genetics as pseudoscience. Tumors do differ physically from healthy tissue, though — in ways
        measured and published:
      </p>
      {FINDINGS.map((f) => (
        <figure key={f.id} className="wave mae" id={f.id}>
          <figcaption>
            <h3>
              {f.title}
              <span className="wave-badge mae-verdict-confirmed">Measured</span>
            </h3>
            <p>{f.text}</p>
          </figcaption>
          <dl className="wave-facts">
            <div>
              <dt>Source</dt>
              <dd>{f.source}</dd>
            </div>
          </dl>
        </figure>
      ))}
    </div>
  )
}
