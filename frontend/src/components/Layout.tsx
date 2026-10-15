import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

// The frame around every signed-in page: navigation, the user's email and a logout button.
export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="topbar">
        <strong>Newstepsincoding</strong>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <span className="muted">{user?.email}</span>
        <button onClick={onLogout}>Log out</button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
