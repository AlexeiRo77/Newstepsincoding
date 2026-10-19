import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import BodyWaves from './pages/BodyWaves'
import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Signup from './pages/Signup'
import Sky from './pages/Sky'
import Waves from './pages/Waves'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {/* The 1977 sky and the two waves drawings are public: shared by link, no login needed. */}
      <Route element={<Layout />}>
        <Route path="/sky" element={<Sky />} />
        <Route path="/waves" element={<Waves />} />
        <Route path="/body-waves" element={<BodyWaves />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
