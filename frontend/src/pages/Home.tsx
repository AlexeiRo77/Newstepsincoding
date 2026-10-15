import { useAuth } from '../auth'

// Placeholder page — replace with the first real feature.
export default function Home() {
  const { user } = useAuth()
  return (
    <>
      <h1>Home</h1>
      <p>Welcome, {user?.email}! This page is a placeholder for what you build next.</p>
    </>
  )
}
