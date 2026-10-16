import { useEffect, useState } from 'react'
import { get } from '../api'

// The sky over Almaty at 21:35 on 3 February 1977: positions from GET /api/sky and the light matrix it
// computes (the visible dome as an LED grid, zenith in the centre; see backend/app/sky/lightmap.py).

interface Body {
  alt: number
  az: number
  ra: number
  dec: number
  vmag: number
  distance_km: number
  illuminated?: number
}

interface Star {
  hr: number
  designation: string
  name: string
  alt: number
  az: number
  ra: number
  dec: number
  vmag: number
}

interface Light {
  name: string
  kind: 'sun' | 'moon' | 'star'
  col: number
  row: number
  vmag: number
}

export interface SkyData {
  observer: {
    place: string
    lat: number
    lon: number
    local_time: string
    utc_time: string
    local_sidereal_time_deg: number
  }
  sun: Body
  moon: Body
  stars: Star[]
  light_matrix: { size: number; magnitude_limit: number; leds: number[][]; lit: Light[] }
}

const CELL = 20 // drawing units per LED
const MARGIN = 26 // room for the compass letters
const LABEL_MAG = 1 // stars at least this bright are named on the matrix
const COLORS = { sun: [255, 196, 70], moon: [255, 246, 220], star: [200, 220, 255] } as const

const fmt = (n: number, digits = 2) => n.toFixed(digits)
const hms = (deg: number) => {
  const total = Math.round(((((deg % 360) + 360) % 360) / 15) * 3600) % 86400
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${Math.floor(total / 3600)}h ${pad(Math.floor(total / 60) % 60)}m ${pad(total % 60)}s`
}

// A star's best label: proper name, else catalogue designation.
const starLabel = (s: { name: string; designation: string }) => s.name || s.designation

// LED value (1 = faintest catalogued star … 255 = the Sun, linear in magnitude) → glow strength 0.3–1.
// The brightest star, Sirius, is value ~66: stretching the star range to the full scale makes their
// differences visible; the Moon and the Sun saturate and stand out by colour and halo instead.
const SIRIUS_VALUE = 66
const glow = (value: number) => 0.3 + 0.7 * Math.min(1, (value - 1) / (SIRIUS_VALUE - 1))

function LightMatrix({ matrix, onPoint }: { matrix: SkyData['light_matrix']; onPoint: (text: string | null) => void }) {
  const { size, leds, lit } = matrix
  const span = size * CELL
  const full = span + 2 * MARGIN
  const centre = MARGIN + span / 2
  // Occupants per LED; the brightest one (first in `lit`) sets the colour.
  const byCell = new Map<string, Light[]>()
  for (const l of lit) {
    const key = `${l.col},${l.row}`
    byCell.set(key, [...(byCell.get(key) ?? []), l])
  }
  const at = (n: number) => MARGIN + (n + 0.5) * CELL
  const labelled = lit.filter((l) => l.kind !== 'star' || l.vmag <= LABEL_MAG)

  return (
    <svg className="matrix" viewBox={`0 0 ${full} ${full}`} role="img" aria-label="Light matrix of the visible sky">
      <defs>
        <filter id="led-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width={full} height={full} rx="14" fill="#04060c" />
      <circle cx={centre} cy={centre} r={span / 2} fill="#070b16" stroke="rgba(255,170,90,0.55)" />
      {leds.map((line, row) =>
        line.map((value, col) => {
          if (value < 0) return null
          const x = at(col)
          const y = at(row)
          const here = byCell.get(`${col},${row}`)
          if (!value || !here) return <circle key={`${col},${row}`} cx={x} cy={y} r={CELL * 0.3} fill="#161c2b" />
          const [r, g, b] = COLORS[here[0].kind]
          const k = glow(value)
          const color = `rgba(${r},${g},${b},${k})`
          const text = here.map((l) => `${l.name} (mag ${fmt(l.vmag)})`).join(', ')
          return (
            <g key={`${col},${row}`} className="led-on" onMouseEnter={() => onPoint(text)} onMouseLeave={() => onPoint(null)}>
              <title>{text}</title>
              <circle
                cx={x}
                cy={y}
                r={CELL * (here[0].kind === 'star' ? 0.3 + 0.4 * k : 0.95)}
                fill={color}
                filter="url(#led-glow)"
              />
              <circle cx={x} cy={y} r={CELL * (0.24 + 0.12 * k)} fill={color} />
            </g>
          )
        }),
      )}
      {labelled.map((l) => {
        const left = l.col > size * 0.7
        return (
          <text
            key={l.name}
            className={`matrix-label ${l.kind}`}
            x={at(l.col) + (left ? -CELL * 0.6 : CELL * 0.6)}
            y={at(l.row) + 4}
            textAnchor={left ? 'end' : 'start'}
          >
            {l.name}
          </text>
        )
      })}
      {(
        [
          ['N', centre, MARGIN / 2],
          ['E', MARGIN / 2, centre],
          ['S', centre, full - MARGIN / 2],
          ['W', full - MARGIN / 2, centre],
        ] as const
      ).map(([label, x, y]) => (
        <text key={label} className="matrix-compass" x={x} y={y + 5} textAnchor="middle">
          {label}
        </text>
      ))}
    </svg>
  )
}

export default function Sky() {
  const [data, setData] = useState<SkyData | null>(null)
  const [error, setError] = useState(false)
  const [pointed, setPointed] = useState<string | null>(null)

  useEffect(() => {
    get<SkyData>('/api/sky').then(setData, () => setError(true))
  }, [])

  if (error) return <p className="error">Could not load the sky. Try reloading the page.</p>
  if (!data) return <p className="muted">Computing the sky…</p>

  const { observer, sun, moon, stars, light_matrix: matrix } = data
  const local = observer.local_time.replace('T', ' ').slice(0, 16)
  const utc = observer.utc_time.replace('T', ' ').slice(0, 16)
  const lit = stars.filter((s) => s.alt > 0).length

  return (
    <div className="sky">
      <h1>Sky over {observer.place}</h1>
      <p className="muted">
        {local} local time (UTC+6) · {utc} UTC · {fmt(observer.lat, 4)}° N, {fmt(observer.lon, 4)}° E · local
        sidereal time {hms(observer.local_sidereal_time_deg)}
      </p>

      <h2>Light matrix</h2>
      <p className="muted">
        The visible sky as a {matrix.size} × {matrix.size} grid of LEDs, as on a star chart held overhead: the zenith
        in the centre, the horizon (orange circle) at the edge, north up and east on the left. Each lit LED shows the
        Moon or the stars of magnitude {matrix.magnitude_limit} or brighter that fall in it; the brighter, the stronger
        it glows.
      </p>
      <LightMatrix matrix={matrix} onPoint={setPointed} />
      <p className="muted matrix-readout">{pointed ?? 'Point at a lit LED to see what lights it.'}</p>

      <h2>Sun and Moon</h2>
      <table className="positions">
        <thead>
          <tr>
            <th>Body</th>
            <th>Altitude</th>
            <th>Azimuth</th>
            <th>RA</th>
            <th>Dec</th>
            <th>Mag</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sun</td>
            <td>{fmt(sun.alt)}°</td>
            <td>{fmt(sun.az)}°</td>
            <td>{hms(sun.ra)}</td>
            <td>{fmt(sun.dec)}°</td>
            <td>{fmt(sun.vmag)}</td>
            <td>{sun.alt < 0 ? 'below' : 'above'} the horizon</td>
          </tr>
          <tr>
            <td>Moon</td>
            <td>{fmt(moon.alt)}°</td>
            <td>{fmt(moon.az)}°</td>
            <td>{hms(moon.ra)}</td>
            <td>{fmt(moon.dec)}°</td>
            <td>{fmt(moon.vmag)}</td>
            <td>
              {fmt((moon.illuminated ?? 0) * 100, 1)}% lit, {Math.round(moon.distance_km).toLocaleString('en')} km
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Stars</h2>
      <p className="muted">
        The {stars.length} stars of magnitude {matrix.magnitude_limit} or brighter (Yale Bright Star Catalogue), {lit}{' '}
        above the horizon. Brightest first.
      </p>
      <div className="table-scroll">
        <table className="positions">
          <thead>
            <tr>
              <th>Star</th>
              <th>Altitude</th>
              <th>Azimuth</th>
              <th>RA</th>
              <th>Dec</th>
              <th>Mag</th>
            </tr>
          </thead>
          <tbody>
            {stars.map((s) => (
              <tr key={s.hr} className={s.alt < 0 ? 'below' : undefined}>
                <td>
                  {starLabel(s)}
                  {s.name && <span className="muted"> {s.designation}</span>}
                </td>
                <td>{fmt(s.alt)}°</td>
                <td>{fmt(s.az)}°</td>
                <td>{hms(s.ra)}</td>
                <td>{fmt(s.dec)}°</td>
                <td>{fmt(s.vmag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Grey rows are below the horizon. Altitudes are geometric (no atmospheric refraction). The Moon&apos;s altitude is as
        seen from the ground; its RA and Dec are geocentric.
      </p>
    </div>
  )
}
