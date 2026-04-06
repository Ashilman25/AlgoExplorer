import { ArrowRight } from 'lucide-react'

export default function CommentaryPanel({ commentary, onJumpToStep }) {
  const { summary, divergences } = commentary ?? {}

  if (!summary && (!divergences || divergences.length === 0)) {
    return (
      <div className = "flex items-center justify-center py-8">
        <p className = "text-xs text-faint">No commentary available yet</p>
      </div>
    )
  }

  return (
    <div className = "space-y-4 p-4">
      {summary && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Summary</p>
          <p className = "text-xs text-muted leading-relaxed">{summary}</p>
        </div>
      )}

      {divergences && divergences.length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Key Divergences ({divergences.length})</p>
          <div className = "space-y-1">
            {divergences.map((div, i) => (
              <div key = {i} className = "flex items-start gap-2 rounded-lg bg-surface-translucent border border-hairline px-3 py-2">
                <span className = "font-mono text-[10px] text-state-source font-semibold whitespace-nowrap mt-0.5">
                  Step {div.stepIndex + 1}
                </span>
                <p className = "flex-1 text-[11px] text-muted leading-relaxed min-w-0">
                  {div.description}
                </p>
                <button
                  onClick = {() => onJumpToStep(div.stepIndex)}
                  aria-label = {`Jump to step ${div.stepIndex + 1}`}
                  className = "flex-none text-state-source/70 hover:text-state-source transition-colors"
                >
                  <ArrowRight size = {12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
