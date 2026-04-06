import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import AuthPageLayout from '../components/auth/AuthPageLayout'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import Input from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { authService } from '../services/authService'
import { parseApiError } from '../services/client'
import { useAuthStore } from '../stores/useAuthStore'
import { useClaimGuestData } from '../hooks/useClaimGuestData'


export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const setSession = useAuthStore((s) => s.setSession)
  const claimGuestData = useClaimGuestData()

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError({
        title: 'Validation error',
        message: 'Passwords do not match.',
        fields: { confirmPassword: ['Passwords must match.'] },
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await authService.register({
        email: form.email,
        username: form.username,
        password: form.password,
      })
      setSession(response)
      toast({
        type: 'success',
        title: 'Account created',
        message: `Signed in as ${response.user.username}.`,
      })
      await claimGuestData()
      navigate('/account', { replace: true })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout
      eyebrow="Register"
      title="Create an account for synced persistence."
      description="Create an account to keep your runs, scenarios, and settings synced across devices."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors duration-fast">
            Sign in
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
          label="Username"
          autoComplete="username"
          value={form.username}
          onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
          placeholder="andrew"
          hint="Use 3-24 lowercase letters, numbers, underscores, or hyphens."
          required
        />

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          placeholder="Choose a password"
          hint="Use at least 8 characters."
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
          placeholder="Re-enter your password"
          required
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          icon={UserPlus}
          disabled={submitting}
        >
          {submitting ? 'Creating Account…' : 'Create Account'}
        </Button>
      </form>
    </AuthPageLayout>
  )
}
