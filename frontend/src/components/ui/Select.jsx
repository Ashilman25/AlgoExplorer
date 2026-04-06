import { ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

// options: { value, label, disabled? }[]
export default function Select({ label, options = [], className, ...props }) {
  const ariaLabel = props['aria-label'] ?? label

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-medium text-muted uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          aria-label={ariaLabel}
          className={cn(
            'w-full appearance-none cursor-pointer',
            'bg-base border border-default',
            'focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40',
            'rounded-lg px-3 py-2 pr-8',
            'text-secondary text-sm',
            'transition-colors duration-fast outline-none',
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size = {14}
          strokeWidth = {1.5}
          className = "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  )
}
