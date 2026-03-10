import { useEffect, useState } from 'react'
import { api } from '../services/api'

function HomePage() {
  const [status, setStatus] = useState('checking...')

  const statusClassName =
    status === 'connected'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : status === 'unreachable'
        ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
        : 'border-sky-400/30 bg-sky-400/10 text-sky-200'

  useEffect(() => {
    api.health()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <section className="grid w-full gap-8 rounded-[2rem] border border-white/10 bg-slate-950/55 p-8 shadow-2xl shadow-sky-950/30 backdrop-blur md:grid-cols-[1.5fr_1fr] md:p-12">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-300/80">
              Algorithm Explorer Web
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Simulation-first frontend foundation with Tailwind wired in globally.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                The frontend now uses a single global stylesheet for base tokens and layout rules,
                while page-level styling stays in Tailwind utility classes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                React + Vite
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Tailwind CSS
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Router-ready shell
              </span>
            </div>
          </div>

          <aside className="flex flex-col justify-between gap-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
                Backend Health
              </p>
              <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusClassName}`}>
                {status}
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <p className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                The API client is still hitting the FastAPI health endpoint and reporting the
                connection state here.
              </p>
              <p className="text-slate-400">
                Base theme, spacing, typography, and background treatment now live in one global
                Tailwind entry stylesheet.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default HomePage
