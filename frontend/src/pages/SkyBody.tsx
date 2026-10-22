// How the light of the 1977 light matrix (GET /api/sky: the Moon and the bright stars over Almaty at 21:35
// on 3 February 1977) compares with what the human body radiates (the /body-waves set: infrared heat,
// biophotons, ECG, EEG). One chart puts both on frequency × power per square metre (both log scales);
// two tables give the numbers and whether each body wave matches the sky's light.
import { useEffect, useState } from 'react'
import { get } from '../api'
import { W } from '../components/WavePanel'
import type { SkyData } from './Sky'

const C = 2.998e8 // speed of light, m/s
const H_PLANCK = 6.626e-34 // J·s
const SIGMA = 5.67e-8 // Stefan–Boltzmann, W/m²/K⁴
const SOLAR_CONSTANT = 1361 // sunlight above the atmosphere, W/m²
const SUN_VMAG = -26.74

const hz = (metres: number) => C / metres

// Light from a source of visual magnitude m, scaled from sunlight: exact in form for the Moon (reflected
// sunlight), within a factor of a few for stars, whose colours differ from the Sun's. Above the atmosphere,
// on a square metre facing the source.
export const irradiance = (vmag: number) => SOLAR_CONSTANT * 10 ** (-0.4 * (vmag - SUN_VMAG))
export const illuminance = (vmag: number) => 10 ** (-0.4 * (vmag + 14.18)) // lux

// The band that light occupies: sunlight's spectrum as far as it reaches the ground, 0.3–2.5 µm.
const SKY_BAND: [number, number] = [0.3e-6, 2.5e-6]

// Skin at 33 °C (306 K), emissivity 0.98: the heat glow per square metre, peaking at Wien's 2898 µm·K / T.
const SKIN_K = 306
export const SKIN_EMITTED = 0.98 * SIGMA * SKIN_K ** 4
// In a 20 °C room, after the heat the skin takes back in from the walls.
export const SKIN_NET = 0.98 * SIGMA * (SKIN_K ** 4 - 293 ** 4)

// Biophotons: about 10–1000 photons per second per cm², around 500 nm.
const photonsToWatts = (perCm2: number) => perCm2 * 1e4 * ((H_PLANCK * C) / 500e-9)
export const BIOPHOTONS: [number, number] = [photonsToWatts(10), photonsToWatts(1000)]
const BIOPHOTON_MID = photonsToWatts(100)

export interface SkyLight {
  moon: number | null // W/m², null when below the horizon
  stars: number // all lit stars together, W/m²
  starCount: number
}

// What the matrix shows above the horizon (its `lit` list), summed into the light reaching a person.
export function skyLight(matrix: SkyData['light_matrix']): SkyLight {
  const moon = matrix.lit.find((l) => l.kind === 'moon')
  const stars = matrix.lit.filter((l) => l.kind === 'star')
  return {
    moon: moon ? irradiance(moon.vmag) : null,
    stars: stars.reduce((sum, s) => sum + irradiance(s.vmag), 0),
    starCount: stars.length,
  }
}

const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const pow10 = (e: number) => `10${[...String(e)].map((c) => SUP[c]).join('')}`

// 0.00283 → "2.8 × 10⁻³"; numbers between 0.1 and 1000 stay plain.
export function sci(x: number): string {
  if (x >= 0.1 && x < 1000) return x >= 10 ? x.toFixed(0) : x.toPrecision(2)
  let e = Math.floor(Math.log10(x))
  let m = Number((x / 10 ** e).toFixed(1))
  if (m >= 10) [m, e] = [m / 10, e + 1]
  return `${m.toFixed(1)} × ${pow10(e)}`
}

// "about 10⁶ times": the ratio rounded to its power of ten.
export const times = (ratio: number) => `about ${pow10(Math.round(Math.log10(ratio)))} times`

interface Mark {
  n: number
  name: string
  band: [number, number] // wavelength, m
  power: [number, number] // W/m²
  color: string
}

function marks(sky: SkyLight): Mark[] {
  const thin = (p: number): [number, number] => [p / 1.6, p * 1.6]
  return [
    ...(sky.moon === null ? [] : [{ n: 1, name: 'Moon', band: SKY_BAND, power: thin(sky.moon), color: '#f9a825' }]),
    { n: 2, name: 'Bright stars', band: SKY_BAND, power: thin(sky.stars), color: '#3949ab' },
    { n: 3, name: 'Infrared heat', band: [3e-6, 50e-6], power: [SKIN_NET, SKIN_EMITTED], color: '#e65100' },
    { n: 4, name: 'Biophotons', band: [200e-9, 800e-9], power: BIOPHOTONS, color: '#8e24aa' },
  ]
}

// ECG and EEG: legend entries only — at 0.5–100 Hz they sit far off the light chart and are not radiated.
const NEAR_FIELD = [
  { n: 5, name: 'ECG', color: '#2e7d32' },
  { n: 6, name: 'EEG', color: '#c2185b' },
]

// Chart: log wavelength across, log power per m² up. 720 × 450 viewBox.
const PL = 92
const PR = W - 16
const PT = 40
const PB = 410
const CH = PB + 40
const L_MIN = 0.1e-6
const L_MAX = 100e-6
const P_MIN = 1e-15
const P_MAX = 1e3

const lx = (l: number) => PL + (Math.log10(l / L_MIN) / Math.log10(L_MAX / L_MIN)) * (PR - PL)
const py = (p: number) => PB - (Math.log10(p / P_MIN) / Math.log10(P_MAX / P_MIN)) * (PB - PT)

const L_TICKS = [0.1, 0.3, 1, 3, 10, 30, 100] // µm
const P_TICKS = [-15, -12, -9, -6, -3, 0, 3]
const VISIBLE: [number, number] = [380e-9, 780e-9]
const INFRARED: [number, number] = [VISIBLE[1], L_MAX]

function MarkShape({ m }: { m: Mark }) {
  const x = lx(m.band[0])
  const w = lx(m.band[1]) - x
  const top = py(m.power[1])
  const bottom = py(m.power[0])
  return (
    <g className="skb-mark" data-mark={m.n}>
      <rect x={x} y={top} width={w} height={Math.max(bottom - top, 4)} stroke={m.color} fill={m.color} />
      <Num n={m.n} color={m.color} x={x - 16} y={(top + bottom) / 2} />
    </g>
  )
}

function Num({ n, color, x, y }: { n: number; color: string; x: number; y: number }) {
  return (
    <g className="bem-num">
      <circle cx={x} cy={y} r={12} fill={color} />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central">
        {n}
      </text>
    </g>
  )
}

function Chart({ sky }: { sky: SkyLight }) {
  return (
    <div className="sem-chart">
      <p className="sem-axis-title">↑ Power per square metre, W/m² (log scale)</p>
      <svg
        className="sem-plot"
        viewBox={`0 0 ${W} ${CH}`}
        role="img"
        aria-label="Sky light and body radiation: power per square metre against wavelength"
      >
        <g className="skb-region">
          <rect x={lx(INFRARED[0])} y={PT} width={lx(INFRARED[1]) - lx(INFRARED[0])} height={PB - PT} fill="#fff3e0" />
          <rect x={lx(VISIBLE[0])} y={PT} width={lx(VISIBLE[1]) - lx(VISIBLE[0])} height={PB - PT} fill="#fffde7" />
          <text x={(lx(VISIBLE[0]) + lx(VISIBLE[1])) / 2} y={PT - 8} textAnchor="middle">
            visible
          </text>
          <text x={(lx(3e-6) + lx(L_MAX)) / 2} y={PT - 8} textAnchor="middle">
            infrared
          </text>
        </g>
        {P_TICKS.map((e) => (
          <g key={e}>
            <line className="sem-grid" x1={PL} x2={PR} y1={py(10 ** e)} y2={py(10 ** e)} />
            <text className="sem-tick" x={PL - 8} y={py(10 ** e)} textAnchor="end" dominantBaseline="middle">
              {e === 0 ? '1' : pow10(e)}
            </text>
          </g>
        ))}
        {L_TICKS.map((t) => (
          <text
            key={t}
            className="sem-tick"
            x={lx(t * 1e-6)}
            y={PB + 8}
            textAnchor={t === L_TICKS[0] ? 'start' : t === L_TICKS[L_TICKS.length - 1] ? 'end' : 'middle'}
            dominantBaseline="hanging"
          >
            {t}
          </text>
        ))}
        <path className="sem-axes" d={`M${PL},${PT} V${PB} H${PR}`} />
        {marks(sky).map((m) => (
          <MarkShape key={m.n} m={m} />
        ))}
      </svg>
      <p className="sem-axis-title sem-x-title">Wavelength, µm (log scale) →</p>
    </div>
  )
}

const fmtMag = (m: number) => m.toFixed(2)

export default function SkyBody() {
  const [data, setData] = useState<SkyData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    get<SkyData>('/api/sky').then(setData, () => setError(true))
  }, [])

  if (error) return <p className="error">Could not load the sky. Try reloading the page.</p>
  if (!data) return <p className="muted">Computing the sky…</p>

  const matrix = data.light_matrix
  const sky = skyLight(matrix)
  const moonLit = matrix.lit.find((l) => l.kind === 'moon')
  const brightest = matrix.lit.filter((l) => l.kind === 'star').slice(0, 5)
  const local = data.observer.local_time.replace('T', ' ').slice(0, 16)
  const skyPeak = sky.moon ?? sky.stars

  return (
    <div className="waves">
      <h1>The 1977 sky and the body’s own radiation</h1>
      <p className="muted">
        Does the light of the {matrix.size} × {matrix.size} light matrix — the sky over {data.observer.place} at{' '}
        {local} — match what a human body radiates? The chart places both by wavelength and by power per square metre:
        the sky’s light falling on a square metre, and what a square metre of skin gives off. Both scales are
        logarithmic, so each grid line is a thousand times stronger than the one below. The Sun is below the horizon at
        that moment, so the sky’s light is {moonLit ? 'the Moon and ' : ''}the bright stars the matrix shows.
      </p>
      <Chart sky={sky} />
      <ol className="skb-legend">
        {[...marks(sky), ...NEAR_FIELD].map((m) => (
          <li key={m.n}>
            <span className="bem-n" style={{ background: m.color }}>
              {m.n}
            </span>
            {m.name}
          </li>
        ))}
      </ol>
      <p className="muted small">
        Not on the chart: the ECG (5) and EEG (6) beat at 0.5–100 Hz, wavelengths of 3,000–600,000 km — a
        trillion (10¹²) times longer than the sky’s light (0.3–2.5 µm), or more. Their fields stay near the body (a near field) and
        carry away no radiated power.
      </p>

      <h2>Light from the matrix</h2>
      <div className="table-scroll">
        <table className="positions skb-sky">
          <thead>
            <tr>
              <th>Source</th>
              <th>Mag</th>
              <th>Power, W/m²</th>
              <th>Illuminance, lux</th>
            </tr>
          </thead>
          <tbody>
            {moonLit && (
              <tr>
                <td>1 · Moon</td>
                <td>{fmtMag(moonLit.vmag)}</td>
                <td>{sci(irradiance(moonLit.vmag))}</td>
                <td>{sci(illuminance(moonLit.vmag))}</td>
              </tr>
            )}
            <tr>
              <td>2 · All {sky.starCount} bright stars together</td>
              <td>{fmtMag(-2.5 * Math.log10(sky.stars / SOLAR_CONSTANT) + SUN_VMAG)}</td>
              <td>{sci(sky.stars)}</td>
              <td>{sci(sky.stars * (illuminance(0) / irradiance(0)))}</td>
            </tr>
            {brightest.map((s) => (
              <tr key={s.name} className="below">
                <td>&nbsp;&nbsp;{s.name}</td>
                <td>{fmtMag(s.vmag)}</td>
                <td>{sci(irradiance(s.vmag))}</td>
                <td>{sci(illuminance(s.vmag))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Power is scaled from sunlight by magnitude (the Sun: −26.74, 1361 W/m²): close for the Moon, which reflects
        sunlight, and within a factor of a few for stars, whose colours differ. Above the atmosphere, which takes off
        another 20–40 % at these heights. The light spans about 0.3–2.5 µm: near ultraviolet, visible and near infrared.
      </p>

      <h2>Does the body’s radiation match it?</h2>
      <div className="table-scroll">
        <table className="positions skb-match">
          <thead>
            <tr>
              <th>Body wave</th>
              <th>Band</th>
              <th>Power, W/m²</th>
              <th>Match with the sky’s light</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Body wave">3 · Infrared heat</td>
              <td data-label="Band">3–50 µm, peak {(2898 / SKIN_K).toFixed(1)} µm</td>
              <td data-label="Power, W/m²">
                {sci(SKIN_EMITTED)} given off ({sci(SKIN_NET)} net)
              </td>
              <td data-label="Match">
                <span>
                  <strong>No — different band.</strong> The two meet only at their faint tails near 3 µm. The skin gives
                  off {times(SKIN_EMITTED / skyPeak)} more power than the {sky.moon ? 'Moon' : 'stars'} deliver.
                </span>
              </td>
            </tr>
            <tr>
              <td data-label="Body wave">4 · Biophotons</td>
              <td data-label="Band">200–800 nm</td>
              <td data-label="Power, W/m²">
                {sci(BIOPHOTONS[0])} – {sci(BIOPHOTONS[1])}
              </td>
              <td data-label="Match">
                <span>
                  <strong>Same band, not the same strength.</strong> Both are mostly visible light, but{' '}
                  {sky.moon ? `moonlight is ${times(sky.moon / BIOPHOTON_MID)} stronger and ` : ''}the bright stars
                  together are {times(sky.stars / BIOPHOTON_MID)} stronger.
                </span>
              </td>
            </tr>
            <tr>
              <td data-label="Body wave">5 · ECG</td>
              <td data-label="Band">1–1.7 Hz beat, trace to 150 Hz</td>
              <td data-label="Power, W/m²">not radiated</td>
              <td data-label="Match">
                <span>
                  <strong>No.</strong> About {pow10(Math.round(Math.log10(hz(SKY_BAND[1]) / 1.7)))} times lower in frequency;
                  a wavelength of {(C / 1e3 / 1.7 / 1e3).toFixed(0)} thousand km, so the field stays near the body.
                </span>
              </td>
            </tr>
            <tr>
              <td data-label="Body wave">6 · EEG</td>
              <td data-label="Band">0.5–100 Hz</td>
              <td data-label="Power, W/m²">not radiated</td>
              <td data-label="Match">
                <span>
                  <strong>No.</strong> About {pow10(Math.round(Math.log10(hz(SKY_BAND[1]) / 100)))} times lower in frequency;
                  a near field measured only at the scalp.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Skin at 33 °C with emissivity 0.98; “net” is after the heat it takes back from a 20 °C room. Biophotons: about
        10–1000 photons per second per cm² at around 500 nm. A body has about 1.8 m² of skin.
      </p>

      <h2>In short</h2>
      <p>
        The only point of match is the band: the body’s biophotons and the matrix’s light are both visible light. Even
        there the sky is far stronger — {times(skyPeak / BIOPHOTON_MID)} — so a body’s own glow is lost in moonlight and
        starlight. The body’s strongest radiation, its infrared heat, lies outside the band the matrix’s light occupies,
        and its electrical rhythms (ECG, EEG) are not radiated at all.
      </p>
    </div>
  )
}
