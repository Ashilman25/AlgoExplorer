import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CloudUpload, X } from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { useGuestStore } from '../../stores/useGuestStore'

const DISMISS_KEY = 'ax-guest-prompt-dismissed'

export default function GuestPromptBanner() {
  const user = useAuthStore((s) => s.user)
  const runs = useGuestStore((s) => s.runs)
  const scenarios = useGuestStore((s) => s.scenarios)

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  // Don't show if user is authenticated or has no guest data or was dismissed
  if (user || dismissed || (runs.length === 0 && scenarios.length === 0)) {
    return null
  }

  const parts = []
  if (runs.length > 0) parts.push(`${runs.length} run${runs.length !== 1 ? 's' : ''}`)
  if (scenarios.length > 0) parts.push(`${scenarios.length} scenario${scenarios.length !== 1 ? 's' : ''}`)

  function handleDismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch { /* ignore */ }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-brand-500/8 border border-brand-500/15 mb-4">
      <CloudUpload size={15} strokeWidth={1.5} className="text-brand-400 shrink-0" />
      <p className="flex-1 text-xs text-muted">
        You have {parts.join(' and ')} stored locally.{' '}
        <Link
          to="/register"
          className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          Create an account
        </Link>
        {' '}to sync your data and access it anywhere.
      </p>
      <button
        onClick={handleDismiss}
        className="p-1 rounded text-faint hover:text-muted transition-colors"
        aria-label="Dismiss"
      >
        <X size={13} strokeWidth={1.5} />
      </button>
    </div>
  )
}
