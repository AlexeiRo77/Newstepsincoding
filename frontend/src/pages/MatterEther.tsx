// Matter and antimatter against the ether: how each picture explains radiation and electromagnetic waves,
// and what experiments decided. Three ether theories (classical, Dirac's sea, the quantum vacuum), a
// spectrum strip marking where annihilation, pair production and the CMB sit, drawings of annihilation,
// pair production and Dirac's sea, then a card per phenomenon. Everything is computed here; no API call.
import { TAU, W } from '../components/WavePanel'

// CODATA exact values (SI 2019) and the electron's rest energy.
const H = 6.62607015e-34 // J·s
const EV = 1.602176634e-19 // J
const C = 299792458 // m/s
export const ELECTRON_EV = 510998.95 // eV, m_e c²
const WIEN_HZ_PER_K = 5.878925757e10 // peak of B_ν per kelvin
export const CMB_K = 2.7255

// Photon frequency (Hz) and wavelength (m) for an energy in eV: E = hf, λ = c/f.
export const photonHz = (ev: number) => (ev * EV) / H
export const photonWavelength = (ev: number) => C / photonHz(ev)

// Frequency at which a black body at T kelvin is brightest (Wien's law, per unit frequency).
export const wienPeakHz = (t: number) => WIEN_HZ_PER_K * t

// Michelson–Morley: fringe shift expected on turning the interferometer 90° in an ether wind v,
// for an arm of optical length L and light of wavelength λ — ΔN = 2Lv²/(λc²).
export const expectedFringeShift = (l: number, v: number, lambda: number) => (2 * l * v ** 2) / (lambda * C ** 2)

// The 1887 run: 11 m folded arms, Earth's orbital speed, sodium light (589 nm); seen: under 0.02 fringe.
const MM_SHIFT = expectedFringeShift(11, 30e3, 589e-9)

type Verdict = 'confirmed' | 'ruled-out' | 'superseded' | 'current' | 'open'

// Labels for the ether cards; topic cards carry their own badge text.
const VERDICT_LABEL: Record<Exclude<Verdict, 'open'>, string> = {
  confirmed: 'Confirmed',
  'ruled-out': 'Ruled out',
  superseded: 'Superseded',
  current: 'Current physics',
}

interface Ether {
  id: string
  title: string
  idea: string
  when: string
  light: string
  antimatter: string
  evidence: string
  verdict: Exclude<Verdict, 'open'>
}

const ETHERS: Ether[] = [
  {
    id: 'classical',
    title: 'The luminiferous ether',
    idea: 'Space is filled with a still, elastic medium; light is a wave in it, as sound is a wave in air. Maxwell’s equations (1865) gave the wave’s speed, c, relative to that medium.',
    when: 'Fresnel (1818), Maxwell (1865), Lorentz (1895–1904)',
    light: 'a transverse vibration of the ether, moving at c only for an observer at rest in it',
    antimatter: 'no place for it: matter and ether are separate substances and one cannot turn into the other',
    evidence:
      'Every test for motion through it — Michelson–Morley (1887) onwards — found none. Lorentz kept the ether by letting moving rods shrink and clocks slow in exactly the way that hides it; his theory then predicts everything special relativity does, but the ether itself can never be detected.',
    verdict: 'ruled-out',
  },
  {
    id: 'dirac',
    title: 'Dirac’s sea and Dirac’s aether',
    idea: 'Dirac’s 1928 equation for the electron also had negative-energy solutions. In 1930 he proposed that empty space is a sea in which every negative-energy state is already filled; a missing electron — a hole — would act as a particle of opposite charge. He first took the holes to be protons; in 1931 he predicted instead an anti-electron with the electron’s mass. Separately, in 1951, he argued that quantum theory allows an aether whose velocity is uncertain, so it marks no preferred direction — an idea that was never tested or taken up.',
    when: 'Dirac (1928, 1930, 1931; the aether paper 1951)',
    light: 'the same electromagnetic field as in Maxwell’s theory; photons with at least 2mc² can lift an electron out of the sea',
    antimatter:
      'predicted by the sea (1931): a hole is the positron; lifting an electron out makes a pair, an electron falling into a hole annihilates it',
    evidence:
      'The positron was found in 1932, with the mass and charge Dirac’s theory required. The sea itself was dropped: it implies an infinite charge and mass in every cubic centimetre, and it cannot work for particles such as the pion, which have antiparticles but no exclusion rule that would let a sea fill up.',
    verdict: 'superseded',
  },
  {
    id: 'vacuum',
    title: 'The quantum vacuum',
    idea: 'In quantum field theory every particle is a ripple in a field that fills all space. Empty space is the fields’ lowest state, which still fluctuates: pairs of virtual particles and antiparticles appear and vanish.',
    when: 'Quantum electrodynamics (Dirac, Heisenberg, Pauli 1929–34; Feynman, Schwinger, Tomonaga 1947–49)',
    light: 'a ripple of the electromagnetic field — no medium needed, the field is the thing that waves',
    antimatter:
      'built in: each field has particles and antiparticles, treated alike, with no sea of filled states',
    evidence:
      'The vacuum’s fluctuations have measurable effects: the Lamb shift in hydrogen (1947), the electron’s magnetic moment (agreeing with theory to about 1 part in 10¹²) and the Casimir force between close metal plates (measured 1997, usually explained by the fluctuations). The vacuum looks the same to every observer moving at steady speed, so it has no “wind” and is not an ether in the 19th-century sense.',
    verdict: 'current',
  },
]

interface Topic {
  id: string
  title: string
  matter: string
  ether: string
  test: string
  outcome: string
  verdict: Verdict
  // The badge names what was decided, since the card compares two pictures.
  badge: string
}

const TOPICS: Topic[] = [
  {
    id: 'light-speed',
    title: 'How light travels, and why c is the same for everyone',
    matter:
      'Light is a wave of the electromagnetic field itself, so it needs no medium. Special relativity (1905) takes c as the same for every observer. Combining relativity with quantum mechanics — Dirac’s 1928 equation — is what forces antiparticles to exist.',
    ether:
      'Light is a wave in the ether and moves at c only relative to it. The Earth orbits at 30 km/s, so it should meet an “ether wind” that makes light faster one way than the other. Lorentz’s version hides the wind by shrinking the measuring apparatus.',
    test: `Michelson–Morley (1887): with 11 m arms the ether wind should have shifted the fringes by ${MM_SHIFT.toFixed(2)} of a fringe; they saw less than 0.02. Modern rotating optical resonators find c the same in all directions to about 1 part in 10¹⁷.`,
    outcome:
      'No ether wind exists. A detectable ether is ruled out; Lorentz’s undetectable one makes the same predictions as relativity and adds nothing that can be tested.',
    verdict: 'ruled-out',
    badge: 'Ether ruled out',
  },
  {
    id: 'annihilation',
    title: 'Annihilation and pair production',
    matter: `An electron and a positron at rest usually annihilate into two gamma photons of ${(ELECTRON_EV / 1e3).toFixed(0)} keV each, flying apart back to back (E = mc²). A photon of at least ${((2 * ELECTRON_EV) / 1e6).toFixed(3)} MeV passing a nucleus can turn into an electron–positron pair.`,
    ether:
      'The classical ether has nothing to say: in it matter never becomes radiation. Dirac’s sea explains both processes and gives the same numbers — pair production lifts an electron out of the sea across a gap of 2mc², annihilation is an electron dropping into a hole.',
    test: 'Anderson saw the positron’s track in a cloud chamber in 1932; Blackett and Occhialini photographed pairs in 1933. Hospital PET scanners detect the back-to-back 511 keV photons every day, and the INTEGRAL satellite sees the same line from the centre of the Galaxy — about 10⁴³ annihilations a second.',
    outcome:
      'Antimatter is confirmed. Dirac’s sea predicted it correctly but was replaced by quantum field theory, which keeps the predictions and drops the sea.',
    verdict: 'confirmed',
    badge: 'Antimatter confirmed',
  },
  {
    id: 'spectrum',
    title: 'The electromagnetic spectrum',
    matter:
      'Radio waves, light, X-rays and gamma rays are the same field oscillating at different frequencies; each comes in photons of energy E = hf. Accelerating charges make radio and heat, electrons jumping between atomic levels make light and X-rays (fast electrons braking in matter make X-rays too), and nuclei and annihilating pairs make gamma rays.',
    ether:
      'Maxwell explained light as an electromagnetic wave in the ether, and Hertz made radio waves in 1887 — both seen as ether vibrations of different lengths. This was the ether’s great success. But a smooth ether wave cannot explain why light knocks out electrons only above a certain frequency.',
    test: 'Planck’s black-body law (1900) and Einstein’s photoelectric law (1905, confirmed by Millikan 1914–16) need energy in packets of hf. Radio, light and gamma rays all travel at the same c in vacuum.',
    outcome:
      'Maxwell’s wave equations survive unchanged; they work in empty space, so the medium was dropped. Radiation is both a wave of the field and a stream of photons.',
    verdict: 'confirmed',
    badge: 'Field confirmed, medium dropped',
  },
  {
    id: 'cosmic',
    title: 'The cosmic background and the missing antimatter',
    matter: `The early universe made matter and antimatter in almost equal amounts — about one extra matter particle for every billion pairs. The pairs annihilated, adding their energy to the hot radiation that filled space; released about 380,000 years later, that radiation has since cooled into the cosmic microwave background (CMB) at ${CMB_K} K, brightest near ${(wienPeakHz(CMB_K) / 1e9).toFixed(0)} GHz. Why there was any excess at all is unsolved: the matter–antimatter difference measured since 1964 is far too small.`,
    ether:
      'No ether theory predicted the CMB; Alpher and Herman predicted it from the Big Bang in 1948. The CMB does define a rest frame — we move through it at about 370 km/s, so it looks slightly warmer ahead — but it is radiation in space, not a medium for light, and measuring it does not change c.',
    test: 'Penzias and Wilson found the CMB in 1965; COBE (1990) measured a near-perfect black body. No gamma glow from matter–antimatter boundaries is seen, so there are no large antimatter regions in the observable universe.',
    outcome:
      'The CMB and the matter excess are confirmed; the excess is not yet explained. Neither revives the ether.',
    verdict: 'open',
    badge: 'Partly open',
  },
]

// Spectrum strip: log frequency, 1 MHz to 10 ZHz. 720 × 216 viewBox.
const SH = 216
const PL = 60
const PR = W - 50
const F_MIN = 1e6
const F_MAX = 1e22
export const sx = (f: number) => PL + (Math.log10(f / F_MIN) / Math.log10(F_MAX / F_MIN)) * (PR - PL)
const STRIP_T = 40
const STRIP_B = 96

const REGIONS: { name: string; short?: string; lo: number; hi: number; color: string }[] = [
  { name: 'radio', lo: F_MIN, hi: 1e9, color: '#e3f2fd' },
  { name: 'microwave', short: 'μwave', lo: 1e9, hi: 3e11, color: '#e0f7fa' },
  { name: 'infrared', short: 'IR', lo: 3e11, hi: 4e14, color: '#fbe9e7' },
  { name: '', lo: 4e14, hi: 7.5e14, color: 'url(#mae-rainbow)' },
  { name: 'UV', lo: 7.5e14, hi: 3e16, color: '#ede7f6' },
  { name: 'X-ray', lo: 3e16, hi: 3e19, color: '#e8eaf6' },
  { name: 'gamma', lo: 3e19, hi: F_MAX, color: '#fce4ec' },
]

// Markers on the strip: label above (or below), anchored where it fits.
const MARKS: { id: string; f: number; label: string; below?: boolean; anchor?: 'start' | 'middle' | 'end' }[] = [
  { id: 'cmb', f: wienPeakHz(CMB_K), label: 'CMB peak' },
  { id: 'visible', f: 5.5e14, label: 'visible' },
  { id: 'annihilation', f: photonHz(ELECTRON_EV), label: '511 keV', anchor: 'end' },
  { id: 'pair', f: photonHz(2 * ELECTRON_EV), label: 'pairs ≥ 1.022 MeV', below: true, anchor: 'end' },
]

const F_TICKS: [number, string][] = [
  [1e6, '1 MHz'],
  [1e9, '1 GHz'],
  [1e12, '1 THz'],
  [1e15, '10¹⁵'],
  [1e18, '10¹⁸'],
  [1e21, '10²¹ Hz'],
]
const E_TICKS: [number, string][] = [
  [1e-6, '1 µeV'],
  [1e-3, '1 meV'],
  [1, '1 eV'],
  [1e3, '1 keV'],
  [1e6, '1 MeV'],
]

function Spectrum() {
  return (
    <div className="sem-chart mae-chart">
      <svg
        className="sem-plot"
        viewBox={`0 0 ${W} ${SH}`}
        role="img"
        aria-label="The electromagnetic spectrum from radio to gamma rays, marking the CMB peak, visible light, the 511 keV annihilation line and the pair-production threshold"
      >
        <defs>
          <linearGradient id="mae-rainbow">
            <stop offset="0" stopColor="#e53935" />
            <stop offset="0.35" stopColor="#fdd835" />
            <stop offset="0.6" stopColor="#43a047" />
            <stop offset="1" stopColor="#5e35b1" />
          </linearGradient>
        </defs>
        {REGIONS.map((r) => (
          <g key={r.lo} className="mae-region">
            <rect x={sx(r.lo)} y={STRIP_T} width={sx(r.hi) - sx(r.lo)} height={STRIP_B - STRIP_T} fill={r.color} />
            {r.name && (
              <text x={(sx(r.lo) + sx(r.hi)) / 2} y={(STRIP_T + STRIP_B) / 2} textAnchor="middle" dominantBaseline="central">
                <tspan className={r.short ? 'mae-wide' : undefined}>{r.name}</tspan>
                {r.short && <tspan className="mae-narrow">{r.short}</tspan>}
              </text>
            )}
          </g>
        ))}
        {MARKS.map((m) => (
          <g key={m.id} className="mae-mark" data-mark={m.id}>
            <line x1={sx(m.f)} x2={sx(m.f)} y1={m.below ? STRIP_T : STRIP_T - 10} y2={m.below ? STRIP_B + 10 : STRIP_B} />
            <text
              x={sx(m.f) + (m.anchor === 'end' ? 4 : 0)}
              y={m.below ? STRIP_B + 14 : STRIP_T - 14}
              textAnchor={m.anchor ?? 'middle'}
              dominantBaseline={m.below ? 'hanging' : 'auto'}
            >
              {m.label}
            </text>
          </g>
        ))}
        {F_TICKS.map(([f, label]) => (
          <text key={label} className="sem-tick" x={sx(f)} y={164} textAnchor="middle">
            {label}
          </text>
        ))}
        {E_TICKS.map(([ev, label]) => (
          <text key={label} className="sem-tick mae-energy" x={sx(photonHz(ev))} y={204} textAnchor="middle">
            {label}
          </text>
        ))}
      </svg>
      <p className="sem-axis-title sem-x-title">Frequency (top row) and photon energy E = hf (bottom row), log scale →</p>
    </div>
  )
}

// A wavy photon line from (x1, y1) to (x2, y2) with `n` wiggles.
function photonPath(x1: number, y1: number, x2: number, y2: number, n = 6, amp = 7): string {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const t = i / 120
    const off = amp * Math.sin(TAU * n * t)
    pts.push(`${(x1 + ux * len * t - uy * off).toFixed(1)},${(y1 + uy * len * t + ux * off).toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

// A charged track curling up in a magnetic field: it starts along +x and its radius shrinks as it slows;
// `turn` +1 curls downward, −1 upward (opposite charges curl opposite ways).
function trackPath(x: number, y: number, turn: 1 | -1): string {
  let a = 0
  let r = 45
  let px = x
  let py = y
  const pts = [`${px},${py}`]
  for (let i = 0; i < 160 && r > 6; i++) {
    a += (turn * 3) / r
    px += 3 * Math.cos(a)
    py += 3 * Math.sin(a)
    r *= 0.985
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`)
  }
  return `M${pts.join('L')}`
}

function Processes() {
  return (
    <svg
      className="body-figure mae-fig"
      viewBox={`0 0 ${W} 280`}
      role="img"
      aria-label="Annihilation: an electron and a positron meet and leave as two 511 keV gamma photons. Pair production: a gamma photon near a nucleus becomes an electron and a positron that curl opposite ways"
    >
      <text className="mae-head" x={180} y={30} textAnchor="middle">
        Annihilation
      </text>
      <g className="mae-annihilation">
        <line className="mae-path" x1={40} y1={150} x2={166} y2={150} />
        <line className="mae-path" x1={320} y1={150} x2={194} y2={150} />
        <circle className="mae-electron" cx={110} cy={150} r={14} />
        <text className="mae-sign" x={110} y={150}>
          e⁻
        </text>
        <circle className="mae-positron" cx={250} cy={150} r={14} />
        <text className="mae-sign" x={250} y={150}>
          e⁺
        </text>
        <path className="mae-photon" d={photonPath(180, 138, 220, 60)} />
        <path className="mae-photon" d={photonPath(180, 162, 140, 240)} />
        <text className="mae-label" x={230} y={72}>
          γ 511 keV
        </text>
        <text className="mae-label" x={130} y={232} textAnchor="end">
          γ 511 keV
        </text>
      </g>
      <line className="mae-divider" x1={W / 2} x2={W / 2} y1={20} y2={260} />
      <text className="mae-head" x={540} y={30} textAnchor="middle">
        Pair production
      </text>
      <g className="mae-pair">
        <path className="mae-photon" d={photonPath(380, 150, 552, 150, 9)} />
        <text className="mae-label" x={384} y={100}>
          γ photon
        </text>
        <text className="mae-label" x={384} y={128}>
          ≥ 1.022 MeV
        </text>
        <circle className="mae-nucleus" cx={540} cy={178} r={8} />
        <text className="mae-label" x={524} y={180} textAnchor="end" dominantBaseline="middle">
          nucleus
        </text>
        <path className="mae-track mae-electron-track" d={trackPath(556, 150, -1)} />
        <path className="mae-track mae-positron-track" d={trackPath(556, 150, 1)} />
        <text className="mae-label mae-e" x={640} y={86}>
          e⁻
        </text>
        <text className="mae-label mae-p" x={640} y={228}>
          e⁺
        </text>
      </g>
    </svg>
  )
}

// Dirac's sea as an energy-level diagram: a filled band below −mc², an empty one above +mc², a photon
// lifting one electron across the 2mc² gap and leaving a hole — the positron.
function DiracSea() {
  const top = 70
  const bottom = 170
  const dots: [number, number][] = []
  for (let row = 0; row < 4; row++) for (let col = 0; col < 14; col++) dots.push([300 + col * 28, bottom + 16 + row * 22])
  const hole = dots[5 + 14]
  return (
    <svg
      className="body-figure mae-fig"
      viewBox={`0 0 ${W} 280`}
      role="img"
      aria-label="Dirac's sea: every negative-energy state is filled; a photon of at least 2mc² lifts one electron above +mc², and the hole it leaves behaves as a positron"
    >
      <line className="mae-level" x1={280} x2={W - 20} y1={top} y2={top} />
      <line className="mae-level" x1={280} x2={W - 20} y1={bottom} y2={bottom} />
      <text className="mae-label" x={270} y={top} textAnchor="end" dominantBaseline="middle">
        +mc²
      </text>
      <text className="mae-label" x={270} y={bottom} textAnchor="end" dominantBaseline="middle">
        −mc²
      </text>
      <text className="mae-label mae-muted" x={W - 20} y={(top + bottom) / 2} textAnchor="end" dominantBaseline="middle">
        gap 2mc²
      </text>
      <text className="mae-label mae-muted" x={W - 20} y={top - 40} textAnchor="end">
        empty: electrons with positive energy
      </text>
      {dots.map(([x, y]) =>
        x === hole[0] && y === hole[1] ? (
          <circle key={`${x},${y}`} className="mae-hole" cx={x} cy={y} r={7} />
        ) : (
          <circle key={`${x},${y}`} className="mae-sea" cx={x} cy={y} r={7} />
        ),
      )}
      <circle className="mae-electron" cx={hole[0]} cy={top - 18} r={9} />
      <path className="mae-lift" d={`M${hole[0]},${hole[1] - 11} V${top - 4}`} markerEnd="url(#mae-arrow)" />
      <defs>
        <marker id="mae-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="mae-arrowhead" />
        </marker>
      </defs>
      <path className="mae-photon" d={photonPath(30, 130, hole[0] - 8, 130, 8)} />
      <text className="mae-label" x={30} y={110}>
        photon ≥ 2mc²
      </text>
      <text className="mae-label mae-e" x={hole[0] + 18} y={top - 18} dominantBaseline="middle">
        electron
      </text>
      <text className="mae-label mae-p" x={hole[0] + 18} y={hole[1] + 34}>
        hole = positron
      </text>
    </svg>
  )
}

function EtherCard({ e }: { e: Ether }) {
  return (
    <figure className="wave mae" id={e.id}>
      <figcaption>
        <h3>
          {e.title}
          <span className={`wave-badge mae-verdict-${e.verdict}`}>{VERDICT_LABEL[e.verdict]}</span>
        </h3>
        <p>{e.idea}</p>
      </figcaption>
      {e.id === 'dirac' && <DiracSea />}
      <dl className="wave-facts mae-facts">
        <div>
          <dt>When</dt>
          <dd>{e.when}</dd>
        </div>
        <div>
          <dt>Light is</dt>
          <dd>{e.light}</dd>
        </div>
        <div>
          <dt>Antimatter</dt>
          <dd>{e.antimatter}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{e.evidence}</dd>
        </div>
      </dl>
    </figure>
  )
}

function TopicCard({ t }: { t: Topic }) {
  return (
    <figure className="wave mae" id={t.id}>
      <figcaption>
        <h3>
          {t.title}
          <span className={`wave-badge mae-verdict-${t.verdict}`}>{t.badge}</span>
        </h3>
      </figcaption>
      {t.id === 'annihilation' && <Processes />}
      <dl className="wave-facts mae-facts">
        <div>
          <dt>Antimatter picture</dt>
          <dd>{t.matter}</dd>
        </div>
        <div>
          <dt>Ether picture</dt>
          <dd>{t.ether}</dd>
        </div>
        <div>
          <dt>Test</dt>
          <dd>{t.test}</dd>
        </div>
        <div>
          <dt>Outcome</dt>
          <dd>{t.outcome}</dd>
        </div>
      </dl>
    </figure>
  )
}

export default function MatterEther() {
  return (
    <div className="waves">
      <h1>Matter and antimatter versus the ether</h1>
      <p className="muted">
        Two ways of explaining radiation. In one, space is filled with a medium — the ether — and light is its
        vibration. In the other, light is a wave of the electromagnetic field itself, and matter has a mirror twin,
        antimatter, that can turn into pure radiation and back. Below, each picture explains the same four things,
        followed by what experiments found.
      </p>
      <p className="muted">
        “The ether” has meant three different things, and only the first was ruled out. Dirac’s sea, an ether of
        electrons, predicted antimatter; today’s quantum vacuum is a full space that carries no wind.
      </p>
      <h2 className="wave-group">Three ethers</h2>
      {ETHERS.map((e) => (
        <EtherCard key={e.id} e={e} />
      ))}
      <h2 className="wave-group">Where the radiation sits</h2>
      <p className="muted">
        Annihilation and pair production happen at the far, gamma-ray end of the spectrum; the light left over
        from the early universe’s annihilations is now microwaves.
      </p>
      <Spectrum />
      <h2 className="wave-group">Four things each picture must explain</h2>
      {TOPICS.map((t) => (
        <TopicCard key={t.id} t={t} />
      ))}
    </div>
  )
}
