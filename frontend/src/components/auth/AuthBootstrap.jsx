import { useEffect } from 'react'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/useAuthStore'


export default function AuthBootstrap() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const setUser = useAuthStore((s) => s.setUser)
  const clearSession = useAuthStore((s) => s.clearSession)
  const markInitialized = useAuthStore((s) => s.markInitialized)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      if (!accessToken) {
        markInitialized()
        return
      }

      try {
        const user = await authService.me()
        if (active) setUser(user)
      } catch {
        if (active) clearSession()
      } finally {
        if (active) markInitialized()
      }
    }

    if (!isInitialized) bootstrap()

    return () => {
      active = false
    }
  }, [accessToken, clearSession, isInitialized, markInitialized, setUser])

  return null
}
