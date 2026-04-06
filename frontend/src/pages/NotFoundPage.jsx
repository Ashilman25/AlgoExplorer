import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-enter">
      <p className="font-mono text-6xl font-semibold text-faint mb-4 select-none">
        404
      </p>
      <h1 className="text-lg font-semibold text-secondary mb-2">
        Page not found
      </h1>
      <p className="text-sm text-muted mb-8 max-w-xs">
        This route doesn't exist yet. Head back to the dashboard to explore what's available.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-slate-950 hover:bg-brand-400 transition-colors duration-[100ms]"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Dashboard
      </Link>
    </div>
  )
}
