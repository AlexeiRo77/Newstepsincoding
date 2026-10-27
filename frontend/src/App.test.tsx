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

test('the body waves page is public: a signed-out visitor sees the picture', async () => {
  mockBackend()
  renderAt('/body-waves')
  expect(await screen.findByRole('heading', { name: 'Waves from the human body' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Body waves' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
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

test('the sound-to-EM page is public: a signed-out visitor sees the picture', async () => {
  mockBackend()
  renderAt('/sound-em')
  expect(await screen.findByRole('heading', { name: 'Sound that makes electromagnetic waves' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sound → EM' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})

test('the brain-band emitters page is public: a signed-out visitor sees it', async () => {
  mockBackend()
  renderAt('/brain-emitters')
  expect(await screen.findByRole('heading', { name: 'Emitters in the brain’s frequency range' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Brain-band emitters' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})

test('the antimatter-versus-ether page is public: a signed-out visitor sees it', async () => {
  mockBackend()
  renderAt('/matter-ether')
  expect(await screen.findByRole('heading', { name: 'Matter and antimatter versus the ether' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Antimatter × ether' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})

test('the tumor-vibrations page is public: a signed-out visitor sees it', async () => {
  mockBackend()
  renderAt('/tumor-waves')
  expect(await screen.findByRole('heading', { name: 'Tumor vibrations in Garyaev’s wave genetics' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tumor vibrations' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})

test('the thymus-vibrations page is public: a signed-out visitor sees it', async () => {
  mockBackend()
  renderAt('/thymus-waves')
  expect(await screen.findByRole('heading', { name: 'Thymus vibrations in Garyaev’s wave genetics' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Thymus vibrations' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})

test('the light-pressure page is public: a signed-out visitor sees it', async () => {
  mockBackend()
  renderAt('/light-pressure')
  expect(await screen.findByRole('heading', { name: 'Light pressure by source' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Light pressure' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})

test('the ether-wind page is public: a signed-out visitor sees it', async () => {
  mockBackend()
  renderAt('/ether-wind')
  expect(await screen.findByRole('heading', { name: 'The ether wind in 2D' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ether wind' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
})
