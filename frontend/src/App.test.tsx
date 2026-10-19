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

test('the body waves page is behind login and opens once signed in', async () => {
  mockBackend()
  const user = userEvent.setup()
  renderAt('/body-waves')
  await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'correct horse')
  await user.click(screen.getByRole('button', { name: 'Log in' }))
  expect(await screen.findByRole('heading', { name: 'Waves from the human body' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Body waves' })).toBeInTheDocument()
})

test('the sky page is public: a signed-out visitor sees it with a log-in link', async () => {
  mockBackend()
  renderAt('/sky')
  expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sky 1977' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
})

test('the waves page is public: a signed-out visitor sees the drawing', async () => {
  mockBackend()
  renderAt('/waves')
  expect(await screen.findByRole('heading', { name: 'Brain wave' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
})
