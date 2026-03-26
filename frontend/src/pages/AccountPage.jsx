import { ShieldCheck, LogOut, UserRound, Mail, SlidersHorizontal } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { useAuthStore } from '../stores/useAuthStore'
import { useLogout } from '../hooks/useLogout'


export default function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const handleLogout = useLogout()

  const settings = user?.settings || {}

  return (
    <div className="animate-enter">
      <PageHeader
        icon={ShieldCheck}
        title="Account"
        description="Authentication is now live. This page confirms your active session and exposes the current protected identity state."
        accent="brand"
        badge="Auth"
      >
        <Button
          variant="danger"
          icon={LogOut}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card title="Identity" bodyClassName="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mb-2">
                Username
              </p>
              <div className="flex items-center gap-2 text-slate-100">
                <UserRound size={14} strokeWidth={1.75} className="text-brand-400" />
                <span className="font-medium">{user?.username}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-slate-900/70 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-600 mb-2">
                Email
              </p>
              <div className="flex items-center gap-2 text-slate-100">
                <Mail size={14} strokeWidth={1.75} className="text-brand-400" />
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Guest mode remains available. Protected ownership rules, guest-to-account migration, and synced resource CRUD land in the next Phase 12 tasks.
            </p>
          </div>
        </Card>

        <Card title="Current Settings Snapshot" bodyClassName="p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <SlidersHorizontal size={14} strokeWidth={1.75} className="text-brand-400" />
            <span className="text-sm font-medium">Defaults from account state</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">theme: {settings.theme ?? 'dark'}</Badge>
            <Badge variant="info">speed: {settings.default_playback_speed ?? 1.0}x</Badge>
            <Badge variant="violet">explanation: {settings.explanation_verbosity ?? 'standard'}</Badge>
            <Badge variant="warning">animation: {settings.animation_detail ?? 'standard'}</Badge>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            This is read-only in 12.1. Editable account preferences arrive with the settings page in 12.3.
          </p>
        </Card>
      </div>
    </div>
  )
}
