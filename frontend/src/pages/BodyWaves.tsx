// Waves from the human body: a figure showing where each wave comes from (electromagnetic on the right,
// sound on the left), then one panel per wave with its real numbers. Garyaev's "wave genome" is drawn as
// an unconfirmed hypothesis, apart from the measured waves. Everything is computed here; no API call.
import { eeg, TAU, type Wave, WavePanel, wavePath } from '../components/WavePanel'

const gauss = (x: number, at: number, width: number) => Math.exp(-(((x - at) / width) ** 2))
const frac = (x: number) => x - Math.floor(x)
// Noise-like but fixed: high, unrelated frequencies summed, so every render draws the same picture.
const hiss = (x: number) =>
  (Math.sin(TAU * 97 * x) + Math.sin(TAU * 131 * x + 1) + Math.sin(TAU * 173 * x + 2) + Math.sin(TAU * 211 * x + 3)) / 3

// Infrared: an even oscillation; the body's heat glow peaks near 9.3 µm (Wien's law at about 310 K).
const IR_CYCLES = 24
const infrared = (x: number) => Math.sin(TAU * IR_CYCLES * x)

// ECG: three heartbeats, each a P wave, the sharp QRS spike and a T wave.
const BEATS = 3
const ecg = (x: number) => {
  const p = frac(x * BEATS)
  return (
    0.15 * gauss(p, 0.2, 0.025) -
    0.12 * gauss(p, 0.33, 0.008) +
    1.0 * gauss(p, 0.36, 0.01) -
    0.25 * gauss(p, 0.39, 0.01) +
    0.3 * gauss(p, 0.6, 0.04)
  )
}

// Biophotons: single photons counted one by one — sparse spikes of uneven height on a flat line.
const PHOTONS = [0.04, 0.11, 0.16, 0.29, 0.33, 0.47, 0.52, 0.58, 0.71, 0.76, 0.83, 0.94]
const biophotons = (x: number) => PHOTONS.reduce((s, at, i) => s + (0.45 + 0.4 * ((i * 5) % 3) * 0.5) * gauss(x, at, 0.0025), 0)

// Heart sound: a "lub" burst as the R wave ends (valves between atria and ventricles close) and a
// softer "dub" after the T wave (valves to the arteries close), on the same three beats as the ECG.
const heartSound = (x: number) => {
  const p = frac(x * BEATS)
  return (gauss(p, 0.4, 0.035) + 0.7 * gauss(p, 0.64, 0.025)) * Math.sin(TAU * 140 * x)
}

// Breathing: two breaths of airflow hiss — a louder, longer breath in and a quieter breath out.
const BREATHS = 2
const breathing = (x: number) => {
  const p = frac(x * BREATHS)
  return hiss(x) * (0.85 * gauss(p, 0.22, 0.13) + 0.4 * gauss(p, 0.6, 0.1))
}

// Gut: irregular gurgles — short bursts of uneven loudness and pitch at uneven times.
const GURGLES: [number, number, number][] = [
  [0.07, 0.9, 150],
  [0.26, 0.5, 210],
  [0.31, 0.7, 180],
  [0.58, 1.0, 130],
  [0.84, 0.6, 240],
]
const gut = (x: number) => GURGLES.reduce((s, [at, amp, f]) => s + amp * gauss(x, at, 0.018) * Math.sin(TAU * f * x), 0)

// Muscle: a low rumble that grows as the muscle tightens, holds, and fades as it lets go.
const MUSCLE_HZ = 25
const muscle = (x: number) =>
  Math.min(1, Math.max(0, Math.min((x - 0.05) / 0.25, (0.95 - x) / 0.2))) *
  (0.6 * Math.sin(TAU * MUSCLE_HZ * x) + 0.25 * Math.sin(TAU * 41 * x + 1) + 0.15 * Math.sin(TAU * 63 * x + 2))

// Garyaev's claimed "solitons": evenly spaced lone pulses. Purely illustrative — the theory gives no
// measured shape or frequency.
const SOLITONS = 4
const soliton = (x: number) => 1 / Math.cosh((frac(x * SOLITONS) - 0.5) / 0.04) ** 2

const ELECTROMAGNETIC: Wave[] = [
  {
    id: 'infrared',
    title: 'Infrared heat',
    what: 'Every warm object glows. The body glows in infrared — too long a wavelength for the eye, but a thermal camera sees it. This is the strongest electromagnetic wave the body sends out.',
    facts: [
      ['Wavelength', 'about 3–50 µm, brightest near 9.3 µm (≈ 32 THz)'],
      ['Power', 'net about 100 W to a 20 °C room, at rest and unclothed — like a bright light bulb'],
      ['Seen by', 'thermal (infrared) cameras and ear thermometers'],
    ],
    color: '#e65100',
    path: wavePath(infrared),
    period: 1 / IR_CYCLES,
    periodLabel: 'λ ≈ 9.3 µm',
  },
  {
    id: 'ecg',
    title: 'Heart electrical signal (ECG)',
    what: 'Each heartbeat starts with an electrical wave spreading through the heart muscle. Electrodes on the skin pick it up as the familiar P, QRS spike and T pattern.',
    facts: [
      ['Frequency', '60–100 beats a minute at rest (1–1.7 Hz); the trace holds 0.05–150 Hz'],
      ['Strength', 'about 1 mV at the skin; magnetic field about 50–100 pT just outside the chest'],
      ['Shown', 'three beats at 75 a minute'],
    ],
    color: '#d32f2f',
    path: wavePath(ecg),
    period: 1 / BEATS,
    periodLabel: '≈ 0.8 s',
  },
  {
    id: 'eeg',
    title: 'Brain electrical signal (EEG)',
    what: 'The tiny voltage of millions of neurons firing together, picked up by electrodes on the scalp. A rhythm of electrical activity rather than a wave that travels away from the body.',
    facts: [
      ['Frequency', 'delta 0.5–4 Hz · theta 4–8 Hz · alpha 8–13 Hz · beta 13–30 Hz · gamma 30–100 Hz'],
      ['Strength', 'about 10–100 µV at the scalp; magnetic field about 0.1 pT'],
      ['Shown', 'alpha rhythm, about 10 Hz (relaxed, eyes closed)'],
    ],
    color: '#c2185b',
    path: wavePath(eeg),
    period: 1 / 10,
    periodLabel: '≈ 0.1 s',
  },
  {
    id: 'biophotons',
    title: 'Biophotons (ultra-weak light)',
    what: 'Cells give off a very faint light as a side effect of their chemistry (oxidation in metabolism). It is about a thousand times too weak for the eye; each spike is one photon caught by a sensitive detector in total darkness.',
    facts: [
      ['Wavelength', 'about 200–800 nm, mostly visible light'],
      ['Strength', 'about 1–1000 photons per second per cm² of skin'],
      ['Seen by', 'cooled photon counters and cameras, in a fully dark room'],
    ],
    color: '#f57f17',
    path: wavePath(biophotons),
    period: 0.1,
    periodLabel: 'no cycle — photons arrive at random',
  },
]

const SOUND: Wave[] = [
  {
    id: 'heart-sound',
    title: 'Heartbeat sound',
    what: 'The “lub-dub” heard through a stethoscope: the heart valves snapping shut. “Lub” as the ventricles squeeze, a softer “dub” as they relax.',
    facts: [
      ['Frequency', 'about 20–150 Hz, mostly below 100 Hz — at the low edge of hearing'],
      ['Length', '“lub” ≈ 0.14 s, “dub” ≈ 0.11 s'],
      ['Shown', 'the same three beats as the ECG above'],
    ],
    color: '#2e7d32',
    path: wavePath(heartSound),
    period: 1 / BEATS,
    periodLabel: '≈ 0.8 s',
  },
  {
    id: 'breathing',
    title: 'Breathing sound',
    what: 'Air rushing through the windpipe and airways makes a soft hiss. Over the lungs the breath in is louder and longer than the breath out.',
    facts: [
      ['Frequency', 'about 100–1000 Hz (fades above 200 Hz over the lungs)'],
      ['Rate', '12–20 breaths a minute at rest'],
      ['Shown', 'two breaths, about 4 s each'],
    ],
    color: '#00897b',
    path: wavePath(breathing),
    period: 1 / BREATHS,
    periodLabel: '≈ 4 s',
  },
  {
    id: 'gut',
    title: 'Gut sounds',
    what: 'Gurgles and clicks as the intestines squeeze food, liquid and gas along. They come at irregular times, some loud, some faint.',
    facts: [
      ['Frequency', 'mostly 100–1000 Hz'],
      ['Rate', 'about 5–35 gurgles a minute; each lasts from a few ms to a few seconds'],
      ['Shown', 'about 15 s of gut sound'],
    ],
    color: '#6d4c41',
    path: wavePath(gut),
    period: GURGLES[1][0] - GURGLES[0][0],
    periodLabel: '≈ 3 s between gurgles',
  },
  {
    id: 'muscle',
    title: 'Muscle sound',
    what: 'A working muscle vibrates as its fibres twitch. Press your thumbs into your ears and clench your fists: the low rumble you hear is your own muscles.',
    facts: [
      ['Frequency', 'about 5–100 Hz, strongest near 10–40 Hz'],
      ['Loudness', 'grows the harder the muscle works'],
      ['Shown', 'one clench, about 1 s'],
    ],
    color: '#558b2f',
    path: wavePath(muscle),
    period: 1 / MUSCLE_HZ,
    periodLabel: '≈ 0.04 s (25 Hz)',
  },
  {
    id: 'garyaev',
    title: 'Organ sounds in Garyaev’s “wave genome”',
    what: 'Pyotr P. Garyaev’s theory of “wave genetics” (1990s) holds that DNA in every cell works as an antenna and a sound source: chromosomes are said to send and take in sound, light and radio waves (“solitons”) that carry genetic information between cells and organs. The drawing is an illustration only — the theory gives no measured frequencies.',
    facts: [
      ['Proposed by', 'P. P. Garyaev, Russia, 1990s'],
      ['Claims', 'organs and DNA “sound” and glow to signal each other; the “phantom DNA effect”; genetic information carried by laser and radio waves'],
      ['Status', 'not reproduced by independent laboratories; not accepted by mainstream biology'],
    ],
    color: '#7e57c2',
    path: wavePath(soliton),
    period: 1 / SOLITONS,
    periodLabel: 'illustrative only',
    hypothesis: true,
  },
]

// The figure: a body at the centre, sound sources labelled on the left, electromagnetic on the right.
const FW = 660
const FH = 540
const CX = FW / 2

interface Label {
  name: string
  value: string
  color: string
  // Where the leader line starts (on the body) and the label's height.
  from: [number, number]
  y: number
  dashed?: boolean
}

const EM_LABELS: Label[] = [
  { name: 'Brain (EEG)', value: '10–100 µV', color: '#c2185b', from: [CX + 20, 62], y: 62 },
  { name: 'Heart (ECG)', value: '≈ 1 mV', color: '#d32f2f', from: [CX + 18, 186], y: 172 },
  { name: 'Infrared heat', value: '≈ 9 µm · 100 W', color: '#e65100', from: [CX + 66, 262], y: 282 },
  { name: 'Biophotons', value: 'faint visible light', color: '#f57f17', from: [CX + 108, 330], y: 392 },
]

const SOUND_LABELS: Label[] = [
  { name: 'Breathing', value: '100–1000 Hz', color: '#00897b', from: [CX - 50, 92], y: 92 },
  { name: 'Heartbeat', value: '20–150 Hz', color: '#2e7d32', from: [CX - 64, 186], y: 186 },
  { name: 'Gut', value: '100–1000 Hz', color: '#6d4c41', from: [CX - 56, 252], y: 266 },
  { name: 'Muscle', value: '5–100 Hz', color: '#558b2f', from: [CX - 46, 348], y: 352 },
  { name: 'Garyaev', value: 'hypothesis', color: '#7e57c2', from: [CX - 30, 440], y: 452, dashed: true },
]

// Three arcs opening to the left, as sound spreading from a point.
function soundArcs(x: number, y: number) {
  const a = (50 * Math.PI) / 180
  return [10, 20, 30]
    .map((r) => {
      const dx = (r * Math.cos(a)).toFixed(1)
      const dy = (r * Math.sin(a)).toFixed(1)
      return `M${x - +dx},${y - +dy} A${r},${r} 0 0 0 ${x - +dx},${y + +dy}`
    })
    .join(' ')
}

// Fixed spots around the outline where the faint biophoton sparkles are drawn.
const SPARKLES: [number, number][] = [
  [CX - 46, 44], [CX + 44, 90], [CX - 60, 128], [CX + 76, 120], [CX + 110, 230], [CX - 116, 250],
  [CX + 120, 318], [CX - 100, 318], [CX + 56, 300], [CX - 52, 410], [CX + 52, 440], [CX + 44, 500],
  [CX - 40, 498], [CX + 30, 20], [CX - 84, 190], [CX + 90, 180],
]

function Silhouette({ className }: { className: string }) {
  return (
    <g className={className}>
      <circle cx={CX} cy={72} r={32} />
      <path d={`M${CX - 54},124 Q${CX},112 ${CX + 54},124 L${CX + 46},292 Q${CX},306 ${CX - 46},292 Z`} />
      <polyline className="limb" points={`${CX},100 ${CX},124`} />
      <polyline className="limb" points={`${CX - 46},136 ${CX - 92},216 ${CX - 104},292`} />
      <polyline className="limb" points={`${CX + 46},136 ${CX + 92},216 ${CX + 104},292`} />
      <polyline className="limb leg" points={`${CX - 22},292 ${CX - 28},392 ${CX - 32},488`} />
      <polyline className="limb leg" points={`${CX + 22},292 ${CX + 28},392 ${CX + 32},488`} />
    </g>
  )
}

function LabelText({ l, side }: { l: Label; side: 'left' | 'right' }) {
  const x = side === 'left' ? 170 : FW - 170
  return (
    <g className="body-label">
      <path
        className={l.dashed ? 'leader dashed' : 'leader'}
        d={`M${l.from[0]},${l.from[1]} L${side === 'left' ? x + 6 : x - 6},${l.y}`}
        stroke={l.color}
      />
      <text x={x} y={l.y} textAnchor={side === 'left' ? 'end' : 'start'}>
        <tspan className="name" fill={l.color}>
          {l.name}
        </tspan>
        <tspan className="value" x={x} dy="1.15em">
          {l.value}
        </tspan>
      </text>
    </g>
  )
}

function BodyFigure() {
  return (
    <svg className="body-figure" viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label="Human body with the waves it gives off">
      <defs>
        <filter id="body-heat" x="-40%" y="-20%" width="180%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <text className="body-side" x={14} y={26}>
        Sound
      </text>
      <text className="body-side" x={FW - 14} y={26} textAnchor="end">
        Electromagnetic
      </text>
      <Silhouette className="body-heat" />
      <Silhouette className="body-skin" />
      <ellipse className="organ" cx={CX} cy={64} rx={22} ry={15} fill="#f48fb1" />
      <ellipse className="organ" cx={CX - 18} cy={172} rx={16} ry={32} fill="#90caf9" />
      <ellipse className="organ" cx={CX + 20} cy={172} rx={16} ry={32} fill="#90caf9" />
      <path
        className="organ"
        fill="#e53935"
        d={`M${CX + 8},${200} C${CX - 10},${186} ${CX - 4},${170} ${CX + 8},${178} C${CX + 20},${170} ${CX + 26},${186} ${CX + 8},${200} Z`}
      />
      <path
        className="gut"
        d={`M${CX - 26},236 h52 c9,0 9,14 0,14 h-52 c-9,0 -9,14 0,14 h52 c9,0 9,14 0,14 h-52`}
      />
      <ellipse className="organ" cx={CX - 25} cy={346} rx={11} ry={34} fill="#bcaaa4" />
      {SPARKLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="sparkle" cx={x} cy={y} r={3} />
      ))}
      {SOUND_LABELS.filter((l) => !l.dashed).map((l) => (
        <path key={l.name} className="sound-arcs" d={soundArcs(l.from[0] - 4, l.from[1])} stroke={l.color} />
      ))}
      {SOUND_LABELS.map((l) => (
        <LabelText key={l.name} l={l} side="left" />
      ))}
      {EM_LABELS.map((l) => (
        <LabelText key={l.name} l={l} side="right" />
      ))}
    </svg>
  )
}

export default function BodyWaves() {
  return (
    <div className="waves">
      <h1>Waves from the human body</h1>
      <p className="muted">
        The body gives off electromagnetic waves — heat, electrical signals, a faint light — and sounds from its
        organs. The figure shows where each comes from; the panels below draw each wave. Shapes are illustrative
        and not to a common scale; the real numbers are written under each one, and the bracket marks one cycle.
      </p>
      <BodyFigure />
      <h2 className="wave-group">Electromagnetic waves</h2>
      {ELECTROMAGNETIC.map((w) => (
        <WavePanel key={w.id} wave={w} />
      ))}
      <h2 className="wave-group">Sound waves</h2>
      {SOUND.map((w) => (
        <WavePanel key={w.id} wave={w} />
      ))}
    </div>
  )
}
