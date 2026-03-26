import { cn } from '../../utils/cn'


export default function Input({ label, error, hint, className, inputClassName, ...props }) {
  const ariaLabel = props['aria-label'] ?? label

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </label>
      )}

      <input
        aria-label={ariaLabel}
        className={cn(
          'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2',
          'text-slate-200 text-sm outline-none transition-colors duration-fast',
          'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40',
          error && 'border-rose-500/40 focus:border-rose-500 focus:ring-rose-500/30',
          inputClassName,
        )}
        {...props}
      />

      {error && (
        <p className="text-[11px] font-mono text-rose-400/80">{error}</p>
      )}

      {!error && hint && (
        <p className="text-[11px] text-slate-500">{hint}</p>
      )}
    </div>
  )
}
