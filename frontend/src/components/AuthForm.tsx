import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../api'

// The shared email + password card behind both the login and the sign-up page.

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Wrong email or password.',
  email_taken: 'An account with this email already exists.',
  password_too_short: 'The password must be at least 8 characters.',
  password_too_long: 'The password must be at most 128 characters.',
  too_many_attempts: 'Too many attempts from your network. Please wait a few minutes and try again.',
}

function message(err: unknown): string {
  if (err instanceof ApiError && typeof err.detail === 'string') return MESSAGES[err.detail] ?? err.detail
  if (err instanceof ApiError && err.status === 422) return 'Please enter a valid email address.'
  return 'Something went wrong. Please try again.'
}

type Props = {
  title: string
  submitLabel: string
  passwordAutoComplete: 'current-password' | 'new-password'
  onSubmit: (email: string, password: string) => Promise<void>
  footer: ReactNode
}

export default function AuthForm({ title, submitLabel, passwordAutoComplete, onSubmit, footer }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handle(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(message(err))
      setBusy(false)
    }
  }

  return (
    <main className="center">
      <form className="card" onSubmit={handle}>
        <h1>{title}</h1>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={passwordAutoComplete}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {submitLabel}
        </button>
        <p className="muted">{footer}</p>
      </form>
    </main>
  )
}
