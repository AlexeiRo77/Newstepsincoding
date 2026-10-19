import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

// The frame around every page but login/signup: navigation, the user's email and a logout button.
// A signed-out visitor (on a public page) sees only the public links and a "Log in" link.
export default function Layout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <header className="topbar">
        <strong>Newstepsincoding</strong>
        <nav>
          {user && (
            <NavLink to="/" end>
              Home
            </NavLink>
          )}
          {user && <NavLink to="/profile">Profile</NavLink>}
          <NavLink to="/sky">Sky 1977</NavLink>
          <NavLink to="/waves">Waves</NavLink>
          <NavLink to="/body-waves">Body waves</NavLink>
        </nav>
        {user && (
          <>
            <span className="muted">{user.email}</span>
            <button onClick={onLogout}>Log out</button>
          </>
        )}
        {!user && !loading && <Link to="/login">Log in</Link>}
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
