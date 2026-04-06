import { Navigate } from 'react-router-dom'
import Spinner from '../ui/Spinner'
import { useAuthStore } from '../../stores/useAuthStore'


export default function PublicOnlyRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <Spinner size="lg" />
      </div>
    )
  }

  if (accessToken && user) {
    return <Navigate to="/account" replace />
  }

  return children
}
