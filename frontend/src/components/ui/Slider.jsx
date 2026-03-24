import { cn } from '../../utils/cn'

export default function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  formatValue,
  className,
}) {
  const display = formatValue ? formatValue(value) : value

  return (
    <div className={cn('space-y-2', className)}>
      {(label || display !== undefined) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {label}
            </span>
          )}
          <span className="font-mono text-xs text-slate-400">{display}</span>
        </div>
      )}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="w-full h-1 rounded-full accent-brand-500 cursor-pointer"
      />
    </div>
  )
}
