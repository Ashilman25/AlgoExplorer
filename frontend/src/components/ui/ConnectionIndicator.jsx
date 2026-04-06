import { RefreshCw, Loader2, Check } from 'lucide-react'

export function ConnectionDot({ status }) {
  if (status === 'CONNECTING' || status === 'WAKING_UP') {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2
          size={10}
          strokeWidth={2}
          className="animate-spin text-brand-400"
          aria-label="Checking server connection"
        />
        <span className="text-[10px] font-mono text-brand-300">Connecting…</span>
      </div>
    )
  }

  if (status === 'CONNECTED' || status === 'HEALTHY') {
    return (
      <span
        className="block w-1.5 h-1.5 rounded-full bg-emerald-400"
        style={{ boxShadow: '0 0 6px rgba(52,211,153,0.4)' }}
        title={status === 'HEALTHY' ? 'Server connected' : undefined}
        aria-label="Server connected"
      />
    )
  }

  if (status === 'UNREACHABLE') {
    return (
      <span
        className="block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
        style={{ boxShadow: '0 0 6px rgba(251,191,36,0.4)' }}
        aria-label="Server unreachable"
      />
    )
  }

  return null
}

export function ConnectionBanner({ status, onRetry }) {
  if (status === 'WAKING_UP') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-500/5 border-b border-brand-500/12">
        <Loader2 size={12} strokeWidth={2} className="animate-spin text-brand-300" />
        <p className="text-xs text-brand-300">
          Server is waking up — this usually takes about 30 seconds
        </p>
      </div>
    )
  }

  if (status === 'CONNECTED') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/6 border-b border-emerald-500/15">
        <Check size={12} strokeWidth={2.5} className="text-emerald-400" />
        <p className="text-xs text-emerald-400 font-medium">Connected!</p>
      </div>
    )
  }

  if (status === 'UNREACHABLE') {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-500/6 border-b border-amber-500/15">
        <span
          className="block w-[5px] h-[5px] rounded-full bg-amber-400 shrink-0"
        />
        <p className="text-xs text-amber-300">
          Can't reach the server — some features won't be available
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-amber-300 hover:text-amber-200 bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
          aria-label="Retry connection"
        >
          <RefreshCw size={10} strokeWidth={1.5} />
          Retry
        </button>
      </div>
    )
  }

  // CONNECTING and HEALTHY — no banner
  return null
}
