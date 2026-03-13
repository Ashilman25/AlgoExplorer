import { usePlaybackStore } from '../../stores/usePlaybackStore'
import Skeleton from '../ui/Skeleton'


export default function StepInspector({ metrics = [] }) {
  const stepIndex = usePlaybackStore((s) => s.stepIndex)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isLoading = usePlaybackStore((s) => s.isLoading)
  const currentStep = usePlaybackStore((s) => s.currentStep)

  const hasTimeline = totalSteps > 0

  const displayMetrics = metrics.length > 0 ? metrics : [
    {label: 'Steps total',  value: hasTimeline ? totalSteps : '—'},
    {label: 'Current step', value: hasTimeline ? stepIndex + 1 : '—'},
  ]

  return (
    <>
      <div className="panel-header shrink-0">Step Inspector</div>

      {/* scrollable body */}
      <div className = "flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className = "p-4 space-y-3">
            <Skeleton className = "h-3 w-20" />
            <Skeleton className = "h-14 w-full" />
            <Skeleton className = "h-3 w-28" />
            <Skeleton className = "h-3 w-24" />
          </div>

        ) : !hasTimeline ? (
          <div className = "flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <div className = "w-8 h-8 rounded-full bg-slate-800/60 border border-white/[0.06] flex items-center justify-center">
              <span className = "text-slate-600 text-sm font-mono">∅</span>
            </div>

            <p className = "text-xs text-slate-600 leading-relaxed max-w-[180px]">
              Step details, highlighted entities, and explanations will appear here during playback.
            </p>
          </div>
        ) : (
          <StepDetail step = {currentStep} stepIndex = {stepIndex} />
        )}
      </div>

      {/* footer */}
      <div className = "shrink-0 p-3 border-t border-white/[0.07] space-y-1.5">
        {displayMetrics.map((m) => (
          <div key = {m.label} className = "metric-card flex items-center justify-between py-2 px-3">
            <span className = "mono-label">{m.label}</span>
            <span className = "mono-value text-sm">{m.value ?? '—'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function StepDetail({ step, stepIndex }) {
  if (!step) return null

  const eventType = step.event_type ?? step.eventType ?? 'STEP'
  const explanation = step.explanation?.text ?? step.explanation ?? null
  const entities = step.highlighted_entities ?? step.highlightedEntities ?? []
  const snapshot = step.metrics_snapshot ?? step.metricsSnapshot ?? {}

  return (
    <div className="p-4 space-y-4">

      {/* Event type badge + step number */}
      <div className = "flex items-center gap-2 flex-wrap">
        <span className = "font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
          {eventType}
        </span>

        <span className = "mono-label">#{stepIndex + 1}</span>
      </div>

      {/* Explanation text */}
      {explanation && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Explanation</p>
          <p className = "text-xs text-slate-400 leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* Highlighted entities */}
      {entities.length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Highlighted</p>
          <div className = "flex flex-wrap gap-1.5">
            {entities.map((e, i) => (
              <span
                key = {i}
                className = "font-mono text-[10px] px-2 py-0.5 rounded bg-slate-700/50 border border-white/[0.06] text-slate-300"
              >
                {typeof e === 'object' ? JSON.stringify(e) : String(e)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metrics snapshot */}
      {Object.keys(snapshot).length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Snapshot</p>
          {Object.entries(snapshot).map(([k, v]) => (
            <div key = {k} className = "flex items-center justify-between">
              <span className = "mono-sm">{k}</span>
              <span className = "mono-value text-sm">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
