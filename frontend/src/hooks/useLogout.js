import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui/Toast'
import { authService } from '../services/authService'
import { useAuthStore } from '../stores/useAuthStore'


export function useLogout() {
  const navigate = useNavigate()
  const toast = useToast()
  const clearSession = useAuthStore((s) => s.clearSession)

  return async function logout() {
    try {
      await authService.logout()
      toast({
        type: 'success',
        title: 'Signed out',
        message: 'Your session has been closed.',
      })
    } catch {
      // Server unreachable or token already invalid — still clear locally
    }

    clearSession()
    navigate('/', { replace: true })
  }
}
