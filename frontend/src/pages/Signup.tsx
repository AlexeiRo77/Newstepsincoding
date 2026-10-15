import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import AuthForm from '../components/AuthForm'

export default function Signup() {
  const { user, loading, signup } = useAuth()
  const navigate = useNavigate()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return (
    <AuthForm
      title="Create an account"
      submitLabel="Sign up"
      passwordAutoComplete="new-password"
      onSubmit={async (email, password) => {
        await signup(email, password)
        navigate('/', { replace: true })
      }}
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    />
  )
}
