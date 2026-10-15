import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />
  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      passwordAutoComplete="current-password"
      onSubmit={async (email, password) => {
        await login(email, password)
        navigate(from, { replace: true })
      }}
      footer={
        <>
          No account yet? <Link to="/signup">Sign up</Link>
        </>
      }
    />
  )
}
