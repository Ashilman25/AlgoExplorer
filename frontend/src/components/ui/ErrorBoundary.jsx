import { Component } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  handleHome = () => {
    this.setState({ error: null })
    window.location.href = '/'
  }

  render() {
    if (!this.state.error) return this.props.children

    const message = this.state.error?.message || 'Something went wrong'

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-enter">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 mb-6">
          <AlertTriangle size={28} strokeWidth={1.5} className="text-rose-400" />
        </div>

        <h1 className="text-lg font-semibold text-secondary mb-2">
          Something went wrong
        </h1>

        <p className="text-sm text-muted max-w-sm leading-relaxed mb-2">
          An unexpected error occurred while rendering this page.
        </p>

        <p className="text-xs font-mono text-rose-400/70 max-w-md mb-8 break-all">
          {message}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-slate-950 hover:bg-brand-400 transition-colors"
          >
            <RotateCcw size={14} strokeWidth={2} />
            Try Again
          </button>

          <button
            onClick={this.handleHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-primary hover:bg-hover border border-subtle transition-colors"
          >
            <Home size={14} strokeWidth={2} />
            Dashboard
          </button>
        </div>
      </div>
    )
  }
}
