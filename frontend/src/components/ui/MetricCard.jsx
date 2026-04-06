import { cn } from '../../utils/cn'

export default function MetricCard({label, value, sub, valueClassName, className}) {
  return (
    <div className = {cn('metric-card', className)}>
      <div className = {cn('mono-value text-xl', valueClassName)}>
        {value ?? '—'}
      </div>

      <div className = "mono-label mt-1">{label}</div>
      {sub && (
        <div className = "text-[10px] text-faint mt-0.5 font-mono">{sub}</div>
      )}
    </div>
  )
}