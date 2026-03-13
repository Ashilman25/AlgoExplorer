import { cn } from '../../utils/cn'

const VARIANTS = {
  default: 'bg-slate-700 text-slate-300 border-transparent',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  brand: 'bg-brand-500/15 text-brand-400 border-brand-500/20',
  violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
}

export default function Badge({ variant = 'default', children, className }) {
  return (
    <span
      className = {cn(
        'inline-flex items-center gap-1 border rounded-full',
        'text-[10px] font-medium tracking-wide uppercase',
        'px-2 py-0.5',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
