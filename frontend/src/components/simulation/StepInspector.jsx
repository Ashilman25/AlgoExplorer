import { usePlaybackStore } from '../../stores/usePlaybackStore'
import { useRunStore } from '../../stores/useRunStore'
import { useMetadataStore } from '../../stores/useMetadataStore'
import Skeleton from '../ui/Skeleton'
import AlgorithmInfo from './AlgorithmInfo'

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

function entityClasses(state) {
  return ENTITY_STATE_CLASSES[state] ?? ENTITY_STATE_CLASSES.default
}


const ALGO_LABELS = {
  bfs: 'BFS',
  dfs: 'DFS',
  dijkstra: "Dijkstra's",
  astar: 'A*',
  bellman_ford: 'Bellman-Ford',
  prims: "Prim's",
  kruskals: "Kruskal's",
  topological_sort: 'Topo Sort',
  quicksort: 'Quick Sort',
  mergesort: 'Merge Sort',
  lcs: 'LCS',
  edit_distance: 'Edit Distance',
}

const MODULE_LABELS = {
  graph: 'Graph',
  sorting: 'Sorting',
  dp: 'DP',
}

function fmtAlgo(key) {
  return ALGO_LABELS[key] ?? key?.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'
}

function fmtModule(key) {
  return MODULE_LABELS[key] ?? key ?? '—'
}


export default function StepInspector({ metrics = [], moduleKey, algorithmKey }) {
  const stepIndex = usePlaybackStore((s) => s.stepIndex)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isLoading = usePlaybackStore((s) => s.isLoading)
  const currentStep = usePlaybackStore((s) => s.currentStep)

  const runId = useRunStore((s) => s.runId)
  const summary = useRunStore((s) => s.summary)

  const hasTimeline = totalSteps > 0

  const algorithms = useMetadataStore((s) => s.algorithms)
  const learningInfo = moduleKey && algorithmKey
    ? algorithms?.[moduleKey]?.find((a) => a.key === algorithmKey)?.learning_info ?? null
    : null

  const displayMetrics = metrics.length > 0
    ? metrics
    : summary?.summary && Object.keys(summary.summary).length > 0
      ? Object.entries(summary.summary).map(([k, v]) => ({
          label: k.replace(/_/g, ' '),
          value: String(v),
        }))
      : [
          {label: 'Steps total',  value: hasTimeline ? totalSteps : '—'},
          {label: 'Current step', value: hasTimeline ? stepIndex + 1 : '—'},
        ]

  return (
    <>
      {/* header */}
      <div className = "panel-header shrink-0 flex items-center justify-between">
        <span>Step Inspector</span>

        {runId && (
          <span className = "font-mono text-[9px] text-slate-600 tabular-nums">
            #{runId}
          </span>
        )}
      </div>

      {/* scrollable body */}
      <div className = "flex-1 overflow-y-auto min-h-0">
        <AlgorithmInfo learningInfo = {learningInfo} defaultExpanded = {!hasTimeline} />

        {isLoading ? (
          <LoadingSkeleton />

        ) : !hasTimeline ? (
          <EmptyState />


        ) : (
          <div className = "flex flex-col divide-y divide-white/[0.05]">
            <StepDetail
              step = {currentStep}
              stepIndex = {stepIndex}
              algorithmKey = {summary?.algorithm_key}
              moduleType = {summary?.module_type}
            />
          </div>
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

function StepDetail({ step, stepIndex, algorithmKey, moduleType }) {
  if (!step) return null

  const eventType = step.event_type ?? step.eventType ?? 'STEP'
  const rawExplanation = step.explanation
  const entities = step.highlighted_entities ?? step.highlightedEntities ?? []
  const snapshot = step.metrics_snapshot ?? step.metricsSnapshot ?? {}

  // Normalize explanation: support both legacy strings and new structured objects
  let title = null
  let body = null
  let dataSnapshot = null

  if (typeof rawExplanation === 'string') {
    // Legacy format: treat whole string as body
    body = rawExplanation
  } else if (rawExplanation && typeof rawExplanation === 'object') {
    if (rawExplanation.title) {
      // New structured format
      title = rawExplanation.title
      body = rawExplanation.body ?? null
      dataSnapshot = rawExplanation.data_snapshot ?? null
    } else if (rawExplanation.text) {
      // Legacy { text: "..." } format
      body = rawExplanation.text
    }
  }

  return (
    <div className = "p-4 space-y-4">

      {/* Event type badge + step number + algorithm */}
      <div className = "flex items-center gap-2 flex-wrap">
        <span className = "font-mono text-[10px] font-semibold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
          {eventType}
        </span>

        <span className = "mono-label">#{stepIndex + 1}</span>

        {algorithmKey && (
          <span className = "ml-auto font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-700/60 border border-white/[0.06] text-slate-500">
            {fmtAlgo(algorithmKey)}
          </span>
        )}
      </div>

      {/* Explanation */}
      {(title || body || dataSnapshot) && (
        <div className = "space-y-2">
          <p className = "mono-label">Explanation</p>

          {title && (
            <p className = "text-xs font-medium text-slate-300">{title}</p>
          )}

          {body && (
            <p className = "text-xs text-slate-400 leading-relaxed">{body}</p>
          )}

          {dataSnapshot && Object.keys(dataSnapshot).length > 0 && (
            <div className = "pt-2 mt-2 border-t border-white/[0.06] space-y-1">
              {Object.entries(dataSnapshot).map(([key, value]) => (
                <div
                  key = {key}
                  className = "flex items-start justify-between gap-3 rounded bg-slate-800/40 border border-white/[0.04] px-2.5 py-1.5"
                >
                  <span className = "font-mono text-[10px] text-slate-500 shrink-0">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className = "font-mono text-[10px] text-slate-300 text-right break-all">
                    {formatSnapshotValue(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* changed entities */}
      {entities.length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Changed Entities</p>

          <div className = "flex flex-wrap gap-1.5">
            {entities.map((e, i) => {
              const state = e.state ?? 'default'
              const label = e.label ?? (e.id != null ? String(e.id) : `entity-${i}`)

              return (
                <span
                  key = {i}
                  title = {`state: ${state}`}
                  className = {`font-mono text-[10px] px-2 py-0.5 rounded border ${entityClasses(state)}`}
                >
                  {label}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* metrics */}
      {Object.keys(snapshot).length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Step Snapshot</p>

          <div className = "space-y-1">
            {Object.entries(snapshot).map(([k, v]) => (
              <div
                key = {k}
                className = "flex items-center justify-between rounded-lg bg-slate-800/50 border border-white/[0.05] px-2.5 py-1.5"
              >
                <span className = "mono-sm">{k.replace(/_/g, ' ')}</span>
                <span className = "font-mono text-xs text-slate-300 tabular-nums">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}


function formatSnapshotValue(value) {
  if (value === null || value === undefined) return '\u2014'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    // Check if it's a 2D array (DP table)
    if (Array.isArray(value[0])) {
      return value.map(row => '[' + row.join(', ') + ']').join('\n')
    }
    return '[' + value.join(', ') + ']'
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return '{}'
    return entries.map(([k, v]) => k + ': ' + v).join(', ')
  }
  return String(value)
}


function LoadingSkeleton() {
  return (
    <div className = "p-4 space-y-3">
      <Skeleton className = "h-3 w-20" />
      <Skeleton className = "h-14 w-full" />
      <Skeleton className = "h-3 w-28" />
      <Skeleton className = "h-3 w-24" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className = "flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
      <div className = "w-8 h-8 rounded-full bg-slate-800/60 border border-white/[0.06] flex items-center justify-center">
        <span className = "text-slate-600 text-sm font-mono">∅</span>
      </div>

      <p className = "text-xs text-slate-600 leading-relaxed max-w-[180px]">
        Step details, changed entities, and explanations will appear here during playback.
      </p>
    </div>
  )
}
