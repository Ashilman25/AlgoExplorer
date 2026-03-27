import { fmtAlgorithmName } from '../../utils/comparisonUtils'
import Skeleton from '../ui/Skeleton'
import GraphRenderer from './renderers/GraphRenderer'
import SortingRenderer from './renderers/SortingRenderer'
import DpRenderer from './renderers/DpRenderer'

const DOMAIN_RENDERER = {
  graph:   GraphRenderer,
  sorting: SortingRenderer,
  dp:      DpRenderer,
}

export default function SlotPanel({ slot, stepIndex, maxSteps, moduleType, inputPayload, onRetry, children }) {
  const { algorithmKey, status, error, timeline } = slot

  const isComplete = status === 'ready' && stepIndex >= timeline.length
  const effectiveIndex = status === 'ready'
    ? Math.min(stepIndex, timeline.length - 1)
    : 0
  const currentStep = status === 'ready' ? timeline[effectiveIndex] : null

  const Renderer = DOMAIN_RENDERER[moduleType] ?? null

  return (
    <div className = "flex flex-col rounded-xl border border-white/[0.07] bg-slate-800/30 overflow-hidden min-w-0">
      <div className = "flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] bg-slate-800/50">
        <span className = "font-mono text-xs font-semibold uppercase tracking-widest text-state-source bg-state-source/10 px-2 py-0.5 rounded-full border border-state-source/20">
          {fmtAlgorithmName(algorithmKey)}
        </span>
        <span className = "mono-label">
          {status === 'ready' && !isComplete && `Step ${effectiveIndex + 1} / ${timeline.length}`}
          {status === 'ready' && isComplete && <span className = "text-state-success">Done</span>}
          {status === 'running' && <span className = "text-state-frontier">Running...</span>}
          {status === 'loading_timeline' && <span className = "text-state-frontier">Loading...</span>}
          {status === 'error' && <span className = "text-state-target">Error</span>}
          {status === 'idle' && <span className = "text-slate-600">Idle</span>}
        </span>
      </div>

      <div className = "flex-1 min-h-0 overflow-y-auto">
        {status === 'running' || status === 'loading_timeline' ? (
          <LoadingState />
        ) : status === 'error' ? (
          <ErrorState message = {error} onRetry = {onRetry} />
        ) : status === 'ready' && Renderer ? (
          <Renderer currentStep = {currentStep} inputPayload = {inputPayload} />
        ) : status === 'ready' && currentStep ? (
          <StepContent step = {currentStep} />
        ) : (
          children ?? <IdleState />
        )}
      </div>

      {status === 'ready' && currentStep && !isComplete && (
        <MiniMetrics snapshot = {currentStep.metrics_snapshot ?? currentStep.metricsSnapshot ?? {}} />
      )}
    </div>
  )
}

function StepContent({ step }) {
  const eventType = step.event_type ?? step.eventType ?? 'STEP'
  const explanation = step.explanation?.text ?? step.explanation ?? null
  const entities = step.highlighted_entities ?? step.highlightedEntities ?? []

  const ENTITY_STATE_CLASSES = {
    active:   'text-state-active   bg-state-active/10   border-state-active/30',
    frontier: 'text-state-frontier bg-state-frontier/10 border-state-frontier/30',
    visited:  'text-state-visited  bg-state-visited/10  border-state-visited/30',
    swap:     'text-state-swap     bg-state-swap/10     border-state-swap/30',
    success:  'text-state-success  bg-state-success/10  border-state-success/30',
    source:   'text-state-source   bg-state-source/10   border-state-source/30',
    target:   'text-state-target   bg-state-target/10   border-state-target/30',
    default:  'text-state-default  bg-state-default/10  border-state-default/30',
  }

  return (
    <div className = "p-3 space-y-3">
      <span className = "font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
        {eventType}
      </span>
      {explanation && (
        <p className = "text-xs text-slate-400 leading-relaxed">{explanation}</p>
      )}
      {entities.length > 0 && (
        <div className = "flex flex-wrap gap-1">
          {entities.map((e, i) => {
            const state = e.state ?? 'default'
            const label = e.label ?? (e.id != null ? String(e.id) : `entity-${i}`)
            const classes = ENTITY_STATE_CLASSES[state] ?? ENTITY_STATE_CLASSES.default
            return (
              <span key = {i} className = {`font-mono text-[10px] px-1.5 py-0.5 rounded border ${classes}`}>
                {label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniMetrics({ snapshot }) {
  const entries = Object.entries(snapshot)
  if (entries.length === 0) return null

  return (
    <div className = "flex gap-2 px-3 py-2 border-t border-white/[0.05] bg-slate-900/30">
      {entries.slice(0, 3).map(([key, value]) => (
        <div key = {key} className = "flex items-center gap-1.5 min-w-0">
          <span className = "mono-sm truncate">{key.replace(/_/g, ' ')}</span>
          <span className = "font-mono text-xs text-slate-300 tabular-nums">{String(value)}</span>
        </div>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className = "p-4 space-y-3">
      <Skeleton className = "h-3 w-20" />
      <Skeleton className = "h-14 w-full" />
      <Skeleton className = "h-3 w-28" />
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className = "flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
      <p className = "text-xs text-state-target">{message ?? 'Something went wrong'}</p>
      {onRetry && (
        <button onClick = {onRetry} className = "text-xs text-state-source hover:text-state-source/80 underline">
          Retry
        </button>
      )}
    </div>
  )
}

function IdleState() {
  return (
    <div className = "flex items-center justify-center h-full p-4">
      <p className = "text-xs text-slate-600">Waiting for run...</p>
    </div>
  )
}
