import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

// Wraps the pages that need a login: a signed-out visitor is sent to /login and brought back after.
export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="muted center">Loading…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  return <Outlet />
}
