import { cn } from '../../utils/cn'


export default function Input({ label, error, hint, className, inputClassName, ...props }) {
  const ariaLabel = props['aria-label'] ?? label

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-muted uppercase tracking-wide">
          {label}
        </label>
      )}

      <input
        aria-label={ariaLabel}
        className={cn(
          'w-full bg-base border border-default rounded-lg px-3 py-2',
          'text-secondary text-sm outline-none transition-colors duration-fast',
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
        <p className="text-[11px] text-muted">{hint}</p>
      )}
    </div>
  )
}
