// Who is signed in, and the login / sign-up / logout actions — a trimmed-down version of
// jaah-ai/jaah's AuthProvider. The server is the authority: on load we ask GET /api/auth/me.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { get, post } from './api'

export type User = { id: string; email: string }

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    get<User>('/api/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setUser(await post<User>('/api/auth/login', { email, password }))
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    setUser(await post<User>('/api/auth/signup', { email, password }))
  }, [])

  const logout = useCallback(async () => {
    try {
      await post('/api/auth/logout')
    } catch {
      // Signed out locally either way; the cookie expires on its own if the server was unreachable.
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
