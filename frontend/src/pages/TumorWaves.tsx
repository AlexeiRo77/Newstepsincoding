// Tumor vibrations as P. P. Garyaev's "wave genetics" pictures them: a healthy cell's genetic signal is
// coherent, a tumor's is garbled. The page builds both signals from that model, decodes each into a
// frequency spectrum (Welch-averaged DFT) and reads the decoded numbers off it, then sets the claims against
// what research has measured. The theory is an unconfirmed hypothesis and gives no real frequencies, so the
// axis is in multiples of a reference frequency f₀. Everything is computed here; no API call.
import { decode, type Finding, harmonicSignal, MeasuredCards, N, ReadingsTable, read, SEG, SpectrumChart } from '../components/Spectrum'

// Tumor: every line drawn 7% low, its phase wandering at random (each harmonic k times faster), on a floor
// of broadband noise. These values are this page's illustrative choices; the theory gives none. σ (sigma)
// sets the fundamental's linewidth: Lorentzian FWHM = σ²·FS/(2π) ≈ 0.06 f₀ (FS = 16, in Spectrum.tsx),
// widened by the Hann window.
export const TUMOR_SHIFT = 0.93
const TUMOR = { seed: 7, shift: TUMOR_SHIFT, sigma: 0.155, noise: 0.25 }
const HEALTHY = { seed: 3, noise: 0.002 }

// Decoded once on first use and kept: the two spectra never change.
let cached: { healthy: number[]; tumor: number[] } | undefined
export function spectra() {
  cached ??= { healthy: decode(harmonicSignal(HEALTHY)), tumor: decode(harmonicSignal(TUMOR)) }
  return cached
}

const SERIES = [
  { id: 'healthy', name: 'Healthy cell (model)', color: '#2e7d32' },
  { id: 'tumor', name: 'Tumor cell (model)', color: '#c62828' },
] as const

const fixed = (v: number, d = 2) => v.toFixed(d)

function Readings() {
  const s = spectra()
  const h = read(s.healthy)
  const t = read(s.tumor)
  return (
    <ReadingsTable
      columns={['Healthy', 'Tumor']}
      rows={[
        ['Main line at', [`${fixed(h.peak)} f₀`, `${fixed(t.peak)} f₀`], 'where the strongest vibration sits'],
        ['Line width', [`${fixed(h.linewidth, 3)} f₀`, `${fixed(t.linewidth, 3)} f₀`], 'how long the vibration stays in step (healthy: the window’s resolution limit, about f₀/48)'],
        ['Noise floor', [`${Math.round(h.floorDb)} dB`, `${Math.round(t.floorDb)} dB`], 'median power across the band'],
        ['Disorder (spectral entropy)', [fixed(h.entropy), fixed(t.entropy)], '0 = one pure tone, 1 = white noise'],
      ]}
    />
  )
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
    text: 'The wall of a yeast cell was found to vibrate at about 0.8–1.6 kHz with a few nanometres’ amplitude, and the motion stopped when the cell was poisoned. Such “nanomotion” is being developed into lab tests of whether bacteria survive an antibiotic. None of it carries genetic information, and no tumor “signature” in it has been established.',
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
            Healthy, in the theory’s terms, is a coherent vibration: here, sharp lines at f₀ and its harmonics, standing
            far above a quiet floor. Tumor is a garbled one: here, the same lines drawn{' '}
            {Math.round((1 - TUMOR_SHIFT) * 100)}% lower, their phase wandering at random so each line smears out (the
            higher harmonics most), over a floor of noise. The theory gives no shift, width or noise level — those
            numbers are this page’s illustrative choices.
          </p>
        </figcaption>
        <SpectrumChart
          series={SERIES.map((ser) => ({ ...ser, power: spectra()[ser.id] }))}
          yTitle="Power, dB below the strongest line"
          label="Decoded spectra: the healthy model shows sharp lines at f₀, 2f₀, 3f₀…; the tumor model shows lines shifted lower, broadened and sunk in a noise floor"
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
        conference proceedings and minor journals, and members of the Russian Academy of Sciences’ commission against pseudoscience
        named wave genetics as pseudoscience. Tumors do differ physically from healthy tissue, though — in ways
        measured and published:
      </p>
      <MeasuredCards findings={FINDINGS} />
    </div>
  )
}
