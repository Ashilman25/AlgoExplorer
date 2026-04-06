import { cn } from '../../utils/cn'
import { fmtAlgorithmName } from '../../utils/comparisonUtils'

export default function DeltaMetricsTable({ slots, deltaMetrics }) {
  if (!deltaMetrics?.metrics?.length) {
    return (
      <div className = "flex items-center justify-center py-8">
        <p className = "text-xs text-faint">No metrics available yet</p>
      </div>
    )
  }

  return (
    <div className = "overflow-x-auto">
      <table className = "w-full text-xs">
        <thead>
          <tr className = "border-b border-hairline">
            <th className = "text-left py-2 px-3 mono-label">Metric</th>
            {slots.map((slot) => (
              <th key = {slot.id} className = "text-right py-2 px-3 mono-label">
                <span className = "text-state-source">{fmtAlgorithmName(slot.algorithmKey)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deltaMetrics.metrics.map((metric) => (
            <tr key = {metric.key} className = "border-b border-hairline hover:bg-surface-dim">
              <td className = "py-2 px-3 text-muted">{metric.label}</td>
              {slots.map((slot) => {
                const value = metric.values[slot.id]
                const delta = metric.deltas[slot.id]
                const isBest = metric.best === slot.id
                return (
                  <td key = {slot.id} className = "text-right py-2 px-3">
                    <span className = {cn(
                      'font-mono tabular-nums',
                      isBest ? 'text-state-success font-medium' : 'text-secondary'
                    )}>
                      {value ?? '—'}
                    </span>
                    {delta != null && delta > 0 && (
                      <span className = "ml-1.5 font-mono text-[10px] text-state-target/70">+{delta}</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
