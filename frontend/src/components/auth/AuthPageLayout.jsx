import { Link } from 'react-router-dom'


export default function AuthPageLayout({ eyebrow, title, description, footer, children }) {
  return (
    <div className="min-h-screen bg-void relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_28%)]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative min-h-screen grid lg:grid-cols-[1.1fr_480px]">
        <section className="hidden lg:flex flex-col justify-between px-12 py-10 border-r border-hairline">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 text-muted hover:text-primary transition-colors duration-fast"
            >
              <span className="font-mono font-bold text-[18px] text-brand-400">AX</span>
              <span className="text-sm font-medium">Algorithm Explorer</span>
            </Link>
          </div>

          <div className="max-w-xl">
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-400 mb-4">
              {eyebrow}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-primary mb-4">
              {title}
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-lg">
              {description}
            </p>
          </div>

          <div className="text-xs text-faint font-mono">
            Guest mode still works. Accounts add sync and protected persistence.
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md glass border border-subtle rounded-2xl p-6 sm:p-7">
            <div className="lg:hidden mb-6">
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 text-muted hover:text-primary transition-colors duration-fast"
              >
                <span className="font-mono font-bold text-[18px] text-brand-400">AX</span>
                <span className="text-sm font-medium">Algorithm Explorer</span>
              </Link>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-brand-400 mt-6 mb-3">
                {eyebrow}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-primary mb-2">
                {title}
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                {description}
              </p>
            </div>

            {children}

            {footer && (
              <div className="mt-6 pt-5 border-t border-hairline text-sm text-muted">
                {footer}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
