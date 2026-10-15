import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth'
import { routerFuture } from './routerFuture'

// A fake backend: `me` answers 401 until someone logs in.
function mockBackend() {
  let signedIn = false
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) => {
      if (path === '/api/auth/me')
        return signedIn ? json(200, { id: '1', email: 'ada@example.com' }) : json(401, { detail: 'not_authenticated' })
      if (path === '/api/auth/login') {
        signedIn = true
        return json(200, { id: '1', email: 'ada@example.com' })
      }
      if (path === '/api/auth/logout') {
        signedIn = false
        return json(200, { ok: true })
      }
      return json(404, { detail: 'not found' })
    }),
  )
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]} future={routerFuture}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

afterEach(() => vi.unstubAllGlobals())

test('a signed-out visitor to a protected page is sent to the login page', async () => {
  mockBackend()
  renderAt('/profile')
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
})

test('log in lands on the page that was asked for, and log out returns to login', async () => {
  mockBackend()
  const user = userEvent.setup()
  renderAt('/profile')
  await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'correct horse')
  await user.click(screen.getByRole('button', { name: 'Log in' }))
  expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
})
