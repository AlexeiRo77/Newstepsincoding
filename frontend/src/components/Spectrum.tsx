// The spectrum toolkit the Garyaev pages share: a model signal of harmonics built from seeded noise, decoded
// by a Welch-averaged DFT, the readings taken off the decoded spectrum, the chart and table that show them,
// and the cards of what has been measured. The theory gives no real frequencies, so frequency is in
// multiples of a reference f₀.
import { TAU, W } from './WavePanel'

// The model signal: harmonics k·f₀ (k = 1…5, amplitude 1/k), sampled at FS samples per 1/f₀.
const FS = 16 // samples per period of f₀, so the spectrum reaches 8 f₀
export const SEG = 1024 // samples per DFT segment: resolution f₀/64
export const N = SEG * 8 // the whole recording; 15 half-overlapping segments
export const F_MAX = 6 // the chart shows 0…6 f₀
const BINS = (F_MAX * SEG) / FS
const HARMONICS = 5

// A seeded generator (mulberry32) and Gaussian draws, so every render decodes the same recording.
export function rng(seed: number) {
  let a = seed
  const uniform = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(TAU * uniform())
}

export interface SignalModel {
  seed: number
  amp?: number // scales every harmonic (default 1)
  shift?: number // every line drawn at shift·k·f₀ (default 1)
  sigma?: number // phase random walk per sample, k times faster for harmonic k (default 0: coherent)
  noise: number // broadband noise, standard deviation
}

// The phase of harmonic k starts at k radians; `harmonicPhase` exposes that so a page can draw the signal's
// shape at the same instant.
export const harmonicPhase = (k: number) => k
export const harmonicAmp = (k: number) => 1 / k
export const HARMONIC_KS = Array.from({ length: HARMONICS }, (_, i) => i + 1)

export function harmonicSignal({ seed, amp = 1, shift = 1, sigma = 0, noise }: SignalModel): Float64Array {
  const gauss = rng(seed)
  const phase = new Float64Array(HARMONICS)
  const x = new Float64Array(N)
  for (let n = 0; n < N; n++) {
    let v = 0
    for (const k of HARMONIC_KS) {
      if (sigma) phase[k - 1] += k * sigma * gauss()
      v += Math.cos((TAU * k * shift * n) / FS + phase[k - 1] + harmonicPhase(k)) * harmonicAmp(k)
    }
    x[n] = amp * v + noise * gauss()
  }
  return x
}

// Welch's method: Hann-windowed DFT of each half-overlapping segment, power averaged. Returns the raw power
// per bin for 0…F_MAX f₀.
export function welch(x: Float64Array): number[] {
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
  return power
}

// The decoded spectrum normalised so its strongest bin is 1.
export function decode(x: Float64Array): number[] {
  const power = welch(x)
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
  const half = p[top] / 2
  let lo = top
  let hi = top
  while (lo > 0 && p[lo - 1] >= half) lo--
  while (hi < p.length - 1 && p[hi + 1] >= half) hi++
  // Interpolate where each flank crosses half power.
  const left = lo > 0 ? lo - (p[lo] - half) / (p[lo] - p[lo - 1]) : lo
  const right = hi < p.length - 1 ? hi + (p[hi] - half) / (p[hi] - p[hi + 1]) : hi
  const sorted = [...p].sort((a, b) => a - b)
  const total = p.reduce((s, v) => s + v, 0)
  const entropy = -p.reduce((s, v) => (v > 0 ? s + (v / total) * Math.log(v / total) : s), 0) / Math.log(p.length)
  return {
    peak: binHz((left + right) / 2 + 1),
    linewidth: binHz(right - left),
    floorDb: 10 * Math.log10(sorted[Math.floor(sorted.length / 2)] / p[top]),
    entropy,
  }
}

// The chart: frequency 0…F_MAX f₀ across, power in dB (0 down to DB_MIN) up.
const CH = 300
const PL = 56
const PR = W - 12
const PT = 12
const PB = CH - 36
const DB_MIN = -80
export const sx = (f: number) => PL + (f / F_MAX) * (PR - PL)
const sy = (db: number) => PT + (Math.min(0, Math.max(DB_MIN, db)) / DB_MIN) * (PB - PT)
export const toDb = (p: number) => 10 * Math.log10(Math.max(p, 1e-12))

export function spectrumPath(power: number[]): string {
  return `M${power.map((p, b) => `${sx(binHz(b)).toFixed(1)},${sy(toDb(p)).toFixed(1)}`).join('L')}`
}

export interface Series {
  id: string
  name: string
  color: string
  power: number[]
}

export function SpectrumChart({ series, label, yTitle }: { series: Series[]; label: string; yTitle: string }) {
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ {yTitle}</p>
      <svg className="sem-plot" viewBox={`0 0 ${W} ${CH}`} role="img" aria-label={label}>
        {[0, -20, -40, -60, -80].map((db) => (
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
        {series.map((ser) => (
          <path key={ser.id} className="sem-curve spec-curve" data-series={ser.id} d={spectrumPath(ser.power)} stroke={ser.color} />
        ))}
      </svg>
      <p className="sem-axis-title sem-x-title">Frequency, in multiples of the reference f₀ →</p>
      <ul className="skb-legend">
        {series.map((ser) => (
          <li key={ser.id}>
            <span className="spec-swatch" style={{ background: ser.color }} />
            {ser.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

// One row: the reading's name, its value in each column, and what it means.
export type ReadingRow = [string, string[], string]

export function ReadingsTable({ columns, rows }: { columns: string[]; rows: ReadingRow[] }) {
  return (
    <table className="spec-readings">
      <caption>Decoded from the spectra above</caption>
      <thead>
        <tr>
          <th scope="col">Reading</th>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
          <th scope="col">Means</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, values, means]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            {values.map((v, i) => (
              <td key={columns[i]} data-label={columns[i]}>
                {v}
              </td>
            ))}
            <td data-label="Means">{means}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export interface Finding {
  id: string
  title: string
  text: string
  source: string
}

// The cards of what research has actually measured, set beside each page's model.
export function MeasuredCards({ findings }: { findings: Finding[] }) {
  return findings.map((f) => (
    <figure key={f.id} className="wave finding" id={f.id}>
      <figcaption>
        <h3>
          {f.title}
          <span className="wave-badge badge-measured">Measured</span>
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
  ))
}
