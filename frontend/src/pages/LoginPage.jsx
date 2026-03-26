import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import AuthPageLayout from '../components/auth/AuthPageLayout'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import Input from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { authService } from '../services/authService'
import { parseApiError } from '../services/client'
import { useAuthStore } from '../stores/useAuthStore'
import { useClaimGuestData } from '../hooks/useClaimGuestData'


export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const setSession = useAuthStore((s) => s.setSession)
  const claimGuestData = useClaimGuestData()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/account'

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await authService.login(form)
      setSession(response)
      toast({
        type: 'success',
        title: 'Signed in',
        message: `Welcome back, ${response.user.username}.`,
      })
      await claimGuestData()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Phase 12.1"
      title="Sign in to sync your work."
      description="Use your account to access protected resources and prepare for cloud-backed scenarios, runs, and settings."
      footer={
        <span>
          No account yet?{' '}
          <Link to="/register" className="text-brand-400 hover:text-brand-300 transition-colors duration-fast">
            Create one
          </Link>
        </span>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorAlert
          title={error?.title}
          message={error?.message}
          fields={error?.fields}
          onDismiss={() => setError(null)}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          placeholder="user@example.com"
          required
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          placeholder="Enter your password"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          icon={LogIn}
          disabled={submitting}
        >
          {submitting ? 'Signing In…' : 'Sign In'}
        </Button>
      </form>
    </AuthPageLayout>
  )
}
