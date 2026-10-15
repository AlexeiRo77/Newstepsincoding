import { useAuth } from '../auth'

// Placeholder page — shows the signed-in account.
export default function Profile() {
  const { user } = useAuth()
  return (
    <>
      <h1>Profile</h1>
      <dl>
        <dt>Email</dt>
        <dd>{user?.email}</dd>
      </dl>
    </>
  )
}
