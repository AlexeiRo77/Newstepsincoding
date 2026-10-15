import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { get } from '../api'

// The sky over Almaty at 21:35 on 3 February 1977: positions from GET /api/sky and the light map it
// computes (whole sphere, azimuth across, altitude down; see backend/app/sky/lightmap.py).

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
  light_map: { width: number; height: number; naked_eye_limit: number; pixels: string }
}

const SCALE_X = 2 // the map spans 360° across but 180° down: draw columns twice as wide
const STARS_SHOWN = 40
const CARDINALS: [string, number][] = [['N', 0], ['E', 90], ['S', 180], ['W', 270], ['N', 360]]

const fmt = (n: number, digits = 2) => n.toFixed(digits)
const hms = (deg: number) => {
  const total = Math.round(((((deg % 360) + 360) % 360) / 15) * 3600) % 86400
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${Math.floor(total / 3600)}h ${pad(Math.floor(total / 60) % 60)}m ${pad(total % 60)}s`
}

// A star's best label: proper name, else catalogue designation, else its BSC number.
const starLabel = (s: { name: string; designation?: string; hr?: number }) =>
  s.name || s.designation || `HR ${s.hr}`

// Pixel value → display brightness. Values are linear in magnitude (1 = faintest naked-eye star,
// 255 = the Sun); a square root lifts the faint stars so they stay visible on screen.
function shade(value: number): number {
  return value === 0 ? 0 : Math.round(70 + 185 * Math.sqrt((value - 1) / 254))
}

function drawMap(canvas: HTMLCanvasElement, data: SkyData) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height, pixels } = data.light_map
  const W = width * SCALE_X
  const H = height
  ctx.fillStyle = '#05070f'
  ctx.fillRect(0, 0, W, H / 2)
  ctx.fillStyle = '#120d06'
  ctx.fillRect(0, H / 2, W, H / 2)

  const bytes = Uint8Array.from(atob(pixels), (c) => c.charCodeAt(0))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = bytes[y * width + x]
      if (!v) continue
      const s = shade(v)
      ctx.fillStyle = `rgb(${s},${s},${Math.min(255, s + 20)})`
      ctx.fillRect(x * SCALE_X, y, SCALE_X, 1)
    }
  }

  const xOf = (az: number) => (az / 360) * W
  const yOf = (alt: number) => ((90 - alt) / 180) * H
  ctx.strokeStyle = 'rgba(120,140,200,0.18)'
  ctx.lineWidth = 1
  for (let alt = -60; alt <= 60; alt += 30) {
    ctx.beginPath()
    ctx.moveTo(0, yOf(alt) + 0.5)
    ctx.lineTo(W, yOf(alt) + 0.5)
    ctx.stroke()
  }
  for (let az = 45; az < 360; az += 45) {
    ctx.beginPath()
    ctx.moveTo(xOf(az) + 0.5, 0)
    ctx.lineTo(xOf(az) + 0.5, H)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255,170,90,0.75)'
  ctx.beginPath()
  ctx.moveTo(0, H / 2 + 0.5)
  ctx.lineTo(W, H / 2 + 0.5)
  ctx.stroke()

  ctx.font = '13px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,190,120,0.9)'
  ctx.textBaseline = 'bottom'
  for (const [label, az] of CARDINALS) {
    ctx.textAlign = az === 0 ? 'left' : az === 360 ? 'right' : 'center'
    ctx.fillText(label, xOf(az) + (az === 0 ? 4 : az === 360 ? -4 : 0), H / 2 - 3)
  }
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(160,175,220,0.8)'
  ctx.font = '11px system-ui, sans-serif'
  for (let alt = -60; alt <= 60; alt += 30) if (alt) ctx.fillText(`${alt > 0 ? '+' : ''}${alt}°`, 4, yOf(alt) - 2)

  // Ring and label the Sun, the Moon and the brightest named stars; the light itself is in the matrix.
  const mark = (label: string, b: { alt: number; az: number }, color: string, radius: number) => {
    const x = xOf(b.az)
    const y = yOf(b.alt)
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.textAlign = x > W - 80 ? 'right' : 'left'
    ctx.fillText(label, x + (x > W - 80 ? -radius - 3 : radius + 3), y + 4)
  }
  ctx.font = '11px system-ui, sans-serif'
  for (const s of data.stars.filter((s) => s.name && s.vmag < 1.6)) mark(s.name, s, 'rgba(170,200,255,0.75)', 5)
  ctx.font = 'bold 13px system-ui, sans-serif'
  mark('Moon', data.moon, '#e8e3c8', 9)
  mark('Sun', data.sun, '#ffb347', 9)
}

export default function Sky() {
  const [data, setData] = useState<SkyData | null>(null)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    get<SkyData>('/api/sky').then(setData, () => setError(true))
  }, [])

  useEffect(() => {
    if (data && canvas.current) drawMap(canvas.current, data)
  }, [data])

  if (error) return <p className="error">Could not load the sky. Try reloading the page.</p>
  if (!data) return <p className="muted">Computing the sky…</p>

  const { observer, sun, moon, stars, light_map: map } = data
  const local = observer.local_time.replace('T', ' ').slice(0, 16)
  const utc = observer.utc_time.replace('T', ' ').slice(0, 16)
  const listed = showAll ? stars : stars.slice(0, STARS_SHOWN)
  const lit = stars.filter((s) => s.alt > 0).length

  function onMove(e: MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const az = ((e.clientX - r.left) / r.width) * 360
    const alt = 90 - ((e.clientY - r.top) / r.height) * 180
    let near: { name: string; vmag: number } | null = null
    let best = 1.5 // degrees
    for (const o of [{ ...sun, name: 'Sun' }, { ...moon, name: 'Moon' }, ...stars]) {
      const dAz = (((o.az - az + 540) % 360) - 180) * Math.cos((alt * Math.PI) / 180)
      const d = Math.hypot(o.alt - alt, dAz)
      if (d < best) {
        best = d
        near = { name: starLabel(o), vmag: o.vmag }
      }
    }
    const label = near ? ` — ${near.name} (mag ${fmt(near.vmag)})` : ''
    setCursor(`alt ${fmt(alt, 1)}°, az ${fmt(az, 1)}°${label}`)
  }

  return (
    <div className="sky">
      <h1>Sky over {observer.place}</h1>
      <p className="muted">
        {local} local time (UTC+6) · {utc} UTC · {fmt(observer.lat, 4)}° N, {fmt(observer.lon, 4)}° E · local
        sidereal time {hms(observer.local_sidereal_time_deg)}
      </p>

      <h2>Light map</h2>
      <p className="muted">
        The whole sky as a {map.width} × {map.height} pixel matrix. Across: azimuth N → E → S → W → N. Down:
        altitude from the zenith (+90°) to the nadir (−90°); the orange line is the horizon. Each lit pixel holds
        the light of the Sun, the Moon or the naked-eye stars (to magnitude {map.naked_eye_limit}) in it,
        including what is below the horizon.
      </p>
      <canvas
        ref={canvas}
        className="lightmap"
        width={map.width * SCALE_X}
        height={map.height}
        aria-label="Light map of the whole sky"
        onMouseMove={onMove}
        onMouseLeave={() => setCursor(null)}
      />
      <p className="muted lightmap-readout">{cursor ?? 'Point at the map to read altitude and azimuth.'}</p>

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
        {stars.length.toLocaleString('en')} naked-eye stars (Yale Bright Star Catalogue), {lit.toLocaleString('en')}{' '}
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
            {listed.map((s) => (
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
      {!showAll && (
        <button onClick={() => setShowAll(true)}>Show all {stars.length.toLocaleString('en')} stars</button>
      )}
      <p className="muted small">
        Grey rows are below the horizon. Altitudes are geometric (no atmospheric refraction). The Moon&apos;s altitude is as
        seen from the ground; its RA and Dec are geocentric.
      </p>
    </div>
  )
}
