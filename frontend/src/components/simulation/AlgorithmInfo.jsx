import { cn } from '../../utils/cn'

const PROPERTY_STYLE = 'font-mono text-[10px] px-2 py-0.5 rounded-full border border-brand-500/20 bg-brand-500/10 text-brand-400'

export default function AlgorithmInfo({ learningInfo, className }) {
  if (!learningInfo) return null

  const { complexity, properties, insights, use_cases, scenarios } = learningInfo

  return (
    <div className = {cn('space-y-4', className)}>

      {/* Complexity */}
      <div className = "space-y-1.5">
        <p className = "mono-label">Complexity</p>
        <div className = "space-y-1">
          <ComplexityRow label = "TIME (best)" value = {complexity.time.best} />
          <ComplexityRow label = "TIME (avg)" value = {complexity.time.average} />
          <ComplexityRow label = "TIME (worst)" value = {complexity.time.worst} />
          <ComplexityRow label = "SPACE" value = {complexity.space} />
        </div>
      </div>

      {/* Properties */}
      {properties.length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Properties</p>
          <div className = "flex flex-wrap gap-1.5">
            {properties.map((prop) => (
              <span key = {prop} className = {PROPERTY_STYLE}>
                {prop}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Key Insights</p>
          <ul className = "space-y-1.5 pl-3">
            {insights.map((insight, i) => (
              <li key = {i} className = "text-xs text-slate-400 leading-relaxed list-disc list-outside">
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Use / Avoid */}
      {(use_cases.use_when.length > 0 || use_cases.avoid_when.length > 0) && (
        <div className = "space-y-1.5">
          <p className = "mono-label">When to Use</p>
          <div className = "space-y-1">
            {use_cases.use_when.map((item, i) => (
              <div key = {`use-${i}`} className = "flex items-start gap-2 text-xs">
                <span className = "text-state-success mt-0.5 shrink-0">+</span>
                <span className = "text-slate-400 leading-relaxed">{item}</span>
              </div>
            ))}
            {use_cases.avoid_when.map((item, i) => (
              <div key = {`avoid-${i}`} className = "flex items-start gap-2 text-xs">
                <span className = "text-state-target mt-0.5 shrink-0">-</span>
                <span className = "text-slate-400 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenarios */}
      {(scenarios.best_case || scenarios.worst_case) && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Scenarios</p>
          <div className = "space-y-1">
            {scenarios.best_case && (
              <div className = "flex items-start justify-between gap-3 rounded bg-slate-800/40 border border-white/[0.04] px-2.5 py-1.5">
                <span className = "font-mono text-[10px] text-state-success shrink-0">BEST</span>
                <span className = "font-mono text-[10px] text-slate-300 text-right">{scenarios.best_case}</span>
              </div>
            )}
            {scenarios.worst_case && (
              <div className = "flex items-start justify-between gap-3 rounded bg-slate-800/40 border border-white/[0.04] px-2.5 py-1.5">
                <span className = "font-mono text-[10px] text-state-target shrink-0">WORST</span>
                <span className = "font-mono text-[10px] text-slate-300 text-right">{scenarios.worst_case}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ComplexityRow({ label, value }) {
  return (
    <div className = "flex items-center justify-between rounded bg-slate-800/50 border border-white/[0.05] px-2.5 py-1.5">
      <span className = "font-mono text-[10px] text-slate-500">{label}</span>
      <span className = "font-mono text-[10px] text-slate-300">{value}</span>
    </div>
  )
}
