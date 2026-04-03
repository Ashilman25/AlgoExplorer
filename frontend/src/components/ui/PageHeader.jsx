import { cn } from '../../utils/cn'

const ACCENT_STYLES = {
  brand: 'text-brand-400 bg-brand-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  violet: 'text-violet-400 bg-violet-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  sky: 'text-sky-400 bg-sky-500/10',
  rose: 'text-rose-400 bg-rose-500/10',
}

export default function PageHeader({
  icon: Icon,
  title,
  description,
  accent = 'brand',
  badge,
  children,
}) {
  return (
    <div className = "flex items-start justify-between gap-4 mb-4">

      <div className = "flex items-start gap-4">
        {Icon && (
          <div className = {cn('p-2.5 rounded-xl shrink-0 mt-0.5', ACCENT_STYLES[accent])}>
            <Icon size = {20} strokeWidth = {1.5} />
          </div>
        )}

        <div>
          <div className = "flex items-center gap-2.5">
            <h1 className = "text-xl font-semibold text-slate-100 tracking-tight">
              {title}
            </h1>

            {badge && (
              <span className = "text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-500 border border-white/[0.06] uppercase tracking-wide">
                {badge}
              </span>
            )}
          </div>

          {description && (
            <p className = "mt-1 text-sm text-slate-400 max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className = "shrink-0 flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  )
}
