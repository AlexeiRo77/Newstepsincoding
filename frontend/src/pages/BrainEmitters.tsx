// Electromagnetic fields that oscillate at the brain's own frequencies (0.5–100 Hz): natural, man-made and
// the body's own, with the magnetic field each puts on a person and what research says about effects on
// the brain. One chart places them all on frequency × field strength (both log scales) against the EEG
// bands and the ICNIRP public limit; a card per emitter carries the numbers. Everything is computed here;
// no API call.
import { W } from '../components/WavePanel'

// EEG bands, Hz — the same ones the /waves page names.
const BANDS: { name: string; lo: number; hi: number; color: string }[] = [
  { name: 'delta', lo: 0.5, hi: 4, color: '#e3f2fd' },
  { name: 'theta', lo: 4, hi: 8, color: '#e8f5e9' },
  { name: 'alpha', lo: 8, hi: 13, color: '#fff8e1' },
  { name: 'beta', lo: 13, hi: 30, color: '#fbe9e7' },
  { name: 'gamma', lo: 30, hi: 100, color: '#f3e5f5' },
]

// The bands a frequency range overlaps, e.g. "beta, gamma"; a single frequency falls in [lo, hi) of one.
export function bandsOf(lo: number, hi: number): string {
  return BANDS.filter((b) => (lo === hi ? lo >= b.lo && lo < b.hi : lo < b.hi && hi > b.lo))
    .map((b) => b.name)
    .join(', ')
}

type Status = 'disputed' | 'none-found' | 'not-studied' | 'reference'

const STATUS_LABEL: Record<Status, string> = {
  disputed: 'Effects reported, not confirmed',
  'none-found': 'No effect found',
  'not-studied': 'Not studied',
  reference: 'For scale',
}

interface Emitter {
  id: string
  title: string
  what: string
  // Frequency ranges in Hz; a single frequency is [f, f].
  freqs: [number, number][]
  freqLabel: string
  // Magnetic flux density at the person, tesla: [low, high].
  field: [number, number]
  fieldLabel: string
  status: Status
  effects: string
  color: string
  // Drawing only: shift the bars sideways (units) so emitters at the same frequency sit side by side, and
  // put the number inside the box where the left is taken.
  dx?: number
  numInside?: boolean
}

const EMITTERS: Emitter[] = [
  {
    id: 'brain',
    title: 'Another person’s brain',
    what: 'The brain itself is an emitter: the currents of firing neurons make a magnetic field outside the head, the one magnetoencephalography (MEG) records.',
    freqs: [[8, 13]],
    freqLabel: 'all the EEG bands, 0.5–100 Hz (shown: the alpha rhythm, 8–13 Hz, its strongest)',
    field: [5e-14, 1e-12],
    fieldLabel: 'about 50 fT – 1 pT at the scalp, falling off within centimetres',
    status: 'reference',
    numInside: true,
    effects:
      'The yardstick for everything below: a signal this weak can only be measured in a shielded room with SQUID or optically pumped sensors.',
    color: '#c2185b',
  },
  {
    id: 'heart',
    title: 'The heart',
    what: 'Each heartbeat drives a current through the chest; its magnetic field (magnetocardiogram) is the strongest the body makes.',
    freqs: [[1, 1.7]],
    freqLabel: '1–1.7 Hz beat at rest (the trace holds components up to about 40 Hz)',
    field: [1e-11, 1e-10],
    fieldLabel: 'about 10–100 pT at the chest',
    status: 'reference',
    effects:
      'For scale: roughly 100 times the brain’s own field. No effect on the brain from it is established; the heart’s electrical activity does leak into scalp EEG as an artefact.',
    color: '#2e7d32',
  },
  {
    id: 'schumann',
    title: 'Schumann resonances',
    what: 'Lightning — about 50 strikes a second worldwide — rings the cavity between the ground and the ionosphere like a bell. The resonances are a natural, always-present EM field around the whole Earth.',
    freqs: [
      [7.83, 7.83],
      [14.1, 14.1],
      [20.3, 20.3],
      [26.3, 26.3],
      [32.5, 32.5],
    ],
    freqLabel: '7.83 Hz, then about 14.1, 20.3, 26.3, 32.5 Hz (each wanders by about ±0.5 Hz)',
    field: [3e-13, 1e-12],
    fieldLabel: 'about 0.3–1 pT magnetic and about 0.3 mV/m electric per mode',
    status: 'disputed',
    effects:
      'The fundamental sits right at the theta/alpha border, which has prompted many claims of “tuning” the brain. Small studies (Persinger and Saroka) reported EEG coherence with the resonances; these have not been independently replicated, and no mechanism lets a field at the brain’s own strength steer it.',
    color: '#6a1b9a',
  },
  {
    id: 'pc1',
    title: 'Geomagnetic pulsations (Pc1)',
    what: 'Waves in the plasma around the Earth that reach the ground as slow oscillations of the Earth’s magnetic field — “pearls” — strongest at high latitudes.',
    freqs: [[0.5, 5]],
    freqLabel: '0.2–5 Hz (the part from 0.5 Hz up is in the delta band)',
    field: [1e-11, 1e-10],
    fieldLabel: 'about 0.01–0.1 nT',
    status: 'disputed',
    effects:
      'Studies correlating geomagnetic activity with heart-rate variability, mood, seizures and hospital admissions give mixed results; some find links, others do not, and no cause is established.',
    color: '#00838f',
  },
  {
    id: 'elf-transmitters',
    title: 'Submarine ELF transmitters',
    what: 'Navies send messages to deep submarines with ELF, which seawater does not block: Russia’s ZEVS near Murmansk at 82 Hz, and the US Navy’s Project ELF in Wisconsin and Michigan at 76 Hz (shut down in 2004). The antennas are wires tens of kilometres long; only a few watts are radiated.',
    freqs: [
      [76, 76],
      [82, 82],
    ],
    freqLabel: '76 Hz (Project ELF, closed 2004) and 82 Hz (ZEVS)',
    field: [1e-15, 1e-12],
    fieldLabel: 'far below 1 pT thousands of kilometres away',
    status: 'none-found',
    effects:
      'A US Navy–funded programme (1982–1993) monitoring plants, animals and soil around the Project ELF antennas found no biologically significant effect. Claims that these transmitters act on people’s brains have no evidence behind them.',
    color: '#37474f',
  },
  {
    id: 'home',
    title: 'Mains wiring at home',
    what: 'Every live wire and appliance in a building makes a 50 Hz (Europe, Asia, Africa) or 60 Hz (the Americas) field, so this is the brain-band field almost everyone lives in.',
    freqs: [
      [50, 50],
      [60, 60],
    ],
    freqLabel: '50 or 60 Hz, plus harmonics at 100–300 Hz',
    field: [1e-8, 2e-7],
    fieldLabel: 'about 0.01–0.2 µT background in a typical home',
    status: 'disputed',
    effects:
      'Pooled studies found childhood leukaemia about twice as common where the average field exceeds 0.3–0.4 µT, so IARC rated ELF magnetic fields “possibly carcinogenic” (2B, 2002); no mechanism is known and a cause is not shown. Laboratory exposures to 50/60 Hz report small, inconsistent changes in the EEG alpha rhythm.',
    color: '#1565c0',
  },
  {
    id: 'power-lines',
    title: 'High-voltage power lines',
    what: 'Overhead transmission lines carry hundreds of amperes; the field is strongest directly under the line and falls to background within 100–200 m.',
    freqs: [
      [50, 50],
      [60, 60],
    ],
    freqLabel: '50 or 60 Hz',
    field: [1e-6, 3e-5],
    fieldLabel: 'about 1–30 µT directly underneath (electric field several kV/m)',
    status: 'disputed',
    effects:
      'The same childhood-leukaemia association as for homes, seen mostly in people living very close to lines. Studies of headaches, sleep and depression near lines are inconsistent.',
    color: '#0d47a1',
    dx: -4,
  },
  {
    id: 'appliances',
    title: 'Appliances held to the head',
    what: 'A hair dryer or an electric shaver has its motor a few centimetres from the head; the field is strong there but drops roughly with the cube of the distance.',
    freqs: [
      [50, 50],
      [60, 60],
    ],
    freqLabel: '50 or 60 Hz',
    field: [6e-6, 2e-3],
    fieldLabel: 'hair dryer 6–2000 µT, shaver 15–1500 µT at 3 cm; under 7 µT at 30 cm (WHO)',
    status: 'disputed',
    effects:
      'The highest brain-band fields most people meet, but only for minutes and only near the device. The one confirmed effect of such fields on the nervous system, flickering lights seen in the eyes (magnetophosphenes), needs several millitesla and has not been reported from appliances.',
    color: '#1976d2',
    dx: 4,
  },
  {
    id: 'railway',
    title: 'Electric railways at 16.7 Hz',
    what: 'Railways in Germany, Austria, Switzerland, Sweden and Norway run on 16.7 Hz alternating current. Passengers and above all drivers sit close to the traction motors and the overhead line.',
    freqs: [[16.7, 16.7]],
    freqLabel: '16.7 Hz',
    field: [1e-6, 1e-4],
    fieldLabel: 'a few µT in passenger cars; about 21 µT on average in drivers’ cabs',
    status: 'disputed',
    effects:
      'A cohort of Swiss railway workers (Röösli, 2007) found Alzheimer’s deaths rising with years of exposure; train drivers — the most exposed group — had about three times the rate of station staff (about 1 µT), though that comparison alone was not statistically significant. Not confirmed elsewhere; a cause is not shown.',
    color: '#ef6c00',
  },
  {
    id: 'tyres',
    title: 'Magnetised car tyres',
    what: 'The steel belts in tyres are slightly magnetised; as the wheels turn, each one makes a field that oscillates at its rotation rate — about 14 times a second at 100 km/h.',
    freqs: [[1, 20]],
    freqLabel: 'about 1–20 Hz, rising with speed',
    field: [1e-7, 1e-5],
    fieldLabel: 'about 0.1–10 µT in the cabin, strongest at the floor near the wheels',
    status: 'not-studied',
    effects:
      'Measured, but no study has looked for an effect on drivers’ brains. It is a delta-to-beta field at the level of a power-line field.',
    color: '#5d4037',
  },
]

// ICNIRP (2010) reference level for the general public, magnetic flux density in tesla.
export function icnirpLimit(f: number): number {
  if (f < 8) return 4e-2 / f ** 2
  if (f < 25) return 5e-3 / f
  return 2e-4
}

// Chart: log frequency across, log field strength up. 720 × 470 viewBox.
const CH = 470
const PL = 64
const PR = W - 16
const PT = 40
const PB = 420
const F_MIN = 0.5
const F_MAX = 100
const B_MIN = 1e-15
const B_MAX = 1e-2

const fx = (f: number) => PL + (Math.log10(f / F_MIN) / Math.log10(F_MAX / F_MIN)) * (PR - PL)
const by = (b: number) => PB - (Math.log10(b / B_MIN) / Math.log10(B_MAX / B_MIN)) * (PB - PT)

const F_TICKS = [0.5, 1, 2, 5, 10, 20, 50, 100]
const B_TICKS: [number, string][] = [
  [1e-15, '1 fT'],
  [1e-12, '1 pT'],
  [1e-9, '1 nT'],
  [1e-6, '1 µT'],
  [1e-3, '1 mT'],
]

function limitPath(): string {
  const steps = 200
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const f = F_MIN * (F_MAX / F_MIN) ** (i / steps)
    const b = icnirpLimit(f)
    if (b > B_MAX) continue
    d += `${d ? 'L' : 'M'}${fx(f).toFixed(1)},${by(b).toFixed(1)}`
  }
  return d
}

// A single frequency is drawn as a bar this many units wide.
const MIN_BAR = 6

function EmitterMarks({ e, n }: { e: Emitter; n: number }) {
  const top = by(e.field[1])
  const bottom = by(e.field[0])
  const rects = e.freqs.map(([lo, hi]) => {
    const x0 = fx(lo)
    const x1 = fx(hi)
    const w = Math.max(x1 - x0, MIN_BAR)
    return { x: (x1 - x0 < MIN_BAR ? (x0 + x1) / 2 - MIN_BAR / 2 : x0) + (e.dx ?? 0), w }
  })
  // The number sits just left of the leftmost bar, level with its top — inside it at the chart's left edge.
  const left = Math.min(...rects.map((r) => r.x))
  const right = Math.max(...rects.map((r) => r.x + r.w))
  const cx = e.numInside ? (left + right) / 2 : left - 14 < PL + 14 ? left + 16 : left - 14
  const cy = e.numInside ? (top + bottom) / 2 : top + 2
  return (
    <g className="bem-mark" data-emitter={e.id}>
      {rects.map((r) => (
        <rect key={r.x} x={r.x} y={top} width={r.w} height={bottom - top} fill={e.color} stroke={e.color} />
      ))}
      <g className="bem-num">
        <circle cx={cx} cy={cy} fill={e.color} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
          {n}
        </text>
      </g>
    </g>
  )
}

function EmitterChart() {
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Magnetic field at the person (log scale)</p>
      <svg
        className="sem-plot"
        viewBox={`0 0 ${W} ${CH}`}
        role="img"
        aria-label="Brain-band emitters: magnetic field against frequency, with the EEG bands and the ICNIRP public limit"
      >
        {BANDS.map((b) => (
          <g key={b.name} className="bem-band">
            <rect x={fx(b.lo)} y={PT} width={fx(b.hi) - fx(b.lo)} height={PB - PT} fill={b.color} />
            <text x={(fx(b.lo) + fx(b.hi)) / 2} y={PT - 8} textAnchor="middle">
              {b.name}
            </text>
          </g>
        ))}
        {B_TICKS.map(([t, label]) => (
          <g key={label}>
            <line className="sem-grid" x1={PL} x2={PR} y1={by(t)} y2={by(t)} />
            <text className="sem-tick" x={PL - 8} y={by(t)} textAnchor="end" dominantBaseline="middle">
              {label}
            </text>
          </g>
        ))}
        {F_TICKS.map((t) => (
          <text
            key={t}
            className="sem-tick"
            x={fx(t)}
            y={PB + 8}
            textAnchor={t === F_MAX ? 'end' : 'middle'}
            dominantBaseline="hanging"
          >
            {t}
          </text>
        ))}
        <path className="sem-axes" d={`M${PL},${PT} V${PB} H${PR}`} />
        <g className="sem-mark bem-limit">
          <path d={limitPath()} />
          <text x={fx(0.6)} y={PT + 20}>
            ICNIRP limit
          </text>
        </g>
        {EMITTERS.map((e, i) => (
          <EmitterMarks key={e.id} e={e} n={i + 1} />
        ))}
      </svg>
      <p className="sem-axis-title sem-x-title">Frequency, Hz (log scale) →</p>
    </div>
  )
}

function EmitterCard({ e, n }: { e: Emitter; n: number }) {
  const lo = Math.min(...e.freqs.map((f) => f[0]))
  const hi = Math.max(...e.freqs.map((f) => f[1]))
  return (
    <figure className="wave bem" id={e.id}>
      <figcaption>
        <h2>
          <span className="bem-n" style={{ background: e.color }}>
            {n}
          </span>
          {e.title}
          <span className={`wave-badge bem-status-${e.status}`}>{STATUS_LABEL[e.status]}</span>
        </h2>
        <p>{e.what}</p>
      </figcaption>
      <dl className="wave-facts">
        <div>
          <dt>Frequency</dt>
          <dd>{e.freqLabel}</dd>
        </div>
        <div>
          <dt>Brain band</dt>
          <dd>{bandsOf(lo, hi)}</dd>
        </div>
        <div>
          <dt>Field</dt>
          <dd>{e.fieldLabel}</dd>
        </div>
        <div>
          <dt>Effects</dt>
          <dd>{e.effects}</dd>
        </div>
      </dl>
    </figure>
  )
}

export default function BrainEmitters() {
  return (
    <div className="waves">
      <h1>Emitters in the brain’s frequency range</h1>
      <p className="muted">
        Brain waves run from 0.5 to 100 Hz. Many electromagnetic fields oscillate at the same rates — from
        lightning-driven resonances of the whole Earth to the wiring in every wall. The chart places each one by its
        frequency and the magnetic field it puts on a person; both scales are logarithmic, so each step up is a
        thousand times stronger. For scale, the Earth’s steady (0 Hz) field is about 50 µT.
      </p>
      <p className="muted">
        Sharing a frequency with the brain is not the same as acting on it. The one confirmed effect of such fields
        on the nervous system is seeing faint flickering light (magnetophosphenes) at several millitesla, most easily
        near 20 Hz; the ICNIRP public limit (dashed) is set well below that. Every other effect named below is a
        reported association or a claim, labelled as such.
      </p>
      <EmitterChart />
      {EMITTERS.map((e, i) => (
        <EmitterCard key={e.id} e={e} n={i + 1} />
      ))}
    </div>
  )
}
