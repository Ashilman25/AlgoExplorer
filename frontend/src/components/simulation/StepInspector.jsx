import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../utils/cn'
import { usePlaybackStore } from '../../stores/usePlaybackStore'
import { useRunStore } from '../../stores/useRunStore'
import { useMetadataStore } from '../../stores/useMetadataStore'
import Skeleton from '../ui/Skeleton'
import AlgorithmInfo from './AlgorithmInfo'
import GridFocusCard from './GridFocusCard'

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
  bfs_grid: 'BFS Grid',
  dfs_grid: 'DFS Grid',
  dijkstra_grid: 'Dijkstra Grid',
  astar_grid: 'A* Grid',
}

function fmtAlgo(key) {
  return ALGO_LABELS[key] ?? key?.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? '—'
}


export default function StepInspector({ metrics = [], moduleKey, algorithmKey, explanationLevel }) {
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

  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Playback mode ──────────────────────────────────────
  if (hasTimeline) {
    const eventType = currentStep?.event_type ?? currentStep?.eventType ?? 'STEP'

    return (
      <>
        {/* header: event badge + step counter */}
        <div className = "panel-header shrink-0 flex items-center justify-between">
          <div className = "flex items-center gap-2">
            <span className = "font-mono text-[9px] font-bold uppercase tracking-widest text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
              {eventType}
            </span>
            <span className = "font-mono text-[9px] text-faint">
              #{stepIndex + 1} of {totalSteps}
            </span>
          </div>
          {runId && (
            <span className = "font-mono text-[8px] text-faint">
              #{runId}
            </span>
          )}
        </div>

        {/* body: step detail */}
        <div className = "flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <StepDetail step = {currentStep} explanationLevel = {explanationLevel} />
          )}
        </div>

        {/* grid focus — inline within body area, grid-mode only */}
        <GridFocusCard />

        {/* drawer: info & metrics */}
        <InfoDrawer
          algorithmKey = {summary?.algorithm_key}
          learningInfo = {learningInfo}
          metrics = {displayMetrics}
          isOpen = {drawerOpen}
          onToggle = {() => setDrawerOpen((v) => !v)}
        />
      </>
    )
  }

  // ── Idle mode (no playback) ────────────────────────────
  return (
    <>
      {/* header: static label */}
      <div className = "panel-header shrink-0">
        Step Inspector
      </div>

      {/* body: algorithm info + empty state */}
      <div className = "flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className = "flex flex-col">
            {learningInfo && (
              <div className = "px-4 pt-4 pb-2">
                <AlgorithmInfo learningInfo = {learningInfo} />
              </div>
            )}
            <EmptyState />
          </div>
        )}
      </div>

      {/* footer: summary metrics */}
      <div className = "shrink-0 p-3 border-t border-hairline space-y-1.5">
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


// ── StepDetail ──────────────────────────────────────────

function StepDetail({ step, explanationLevel = 'detailed' }) {
  if (!step) return null

  const rawExplanation = step.explanation
  const entities = step.highlighted_entities ?? step.highlightedEntities ?? []
  const snapshot = step.metrics_snapshot ?? step.metricsSnapshot ?? {}

  let title = null
  let body = null
  let dataSnapshot = null

  if (typeof rawExplanation === 'string') {
    body = rawExplanation
  } else if (rawExplanation && typeof rawExplanation === 'object') {
    if (rawExplanation.title) {
      title = rawExplanation.title
      body = rawExplanation.body ?? null
      dataSnapshot = rawExplanation.data_snapshot ?? null
    } else if (rawExplanation.text) {
      body = rawExplanation.text
    }
  }

  const showBody = explanationLevel !== 'none'
  const showDataSnapshot = explanationLevel === 'detailed'

  return (
    <div className = "p-4 space-y-5">

      {/* Explanation */}
      {(title || (showBody && body) || (showDataSnapshot && dataSnapshot)) && (
        <div className = "space-y-2">
          <p className = "mono-label">Explanation</p>

          {title && (
            <p className = "text-xs font-medium text-secondary">{title}</p>
          )}

          {showBody && body && (
            <p className = "text-xs text-secondary leading-relaxed">{body}</p>
          )}

          {showDataSnapshot && dataSnapshot && Object.keys(dataSnapshot).length > 0 && (
            <div className = "pt-2 mt-2 border-t border-hairline space-y-1">
              {Object.entries(dataSnapshot).map(([key, value]) => (
                <div
                  key = {key}
                  className = "flex items-start justify-between gap-3 rounded bg-surface-dim border border-hairline px-2.5 py-1.5"
                >
                  <span className = "font-mono text-[10px] text-muted shrink-0">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className = "font-mono text-[10px] text-secondary text-right break-all">
                    {formatSnapshotValue(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Changed entities */}
      {entities.length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Entities</p>

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

      {/* Step snapshot — 2-column grid */}
      {Object.keys(snapshot).length > 0 && (
        <div className = "space-y-1.5">
          <p className = "mono-label">Snapshot</p>

          <div className = "grid grid-cols-2 gap-1">
            {Object.entries(snapshot).map(([k, v]) => (
              <div
                key = {k}
                className = "flex items-center justify-between rounded bg-surface-translucent border border-hairline px-2.5 py-1.5"
              >
                <span className = "font-mono text-[9px] text-muted">{k.replace(/_/g, ' ')}</span>
                <span className = "font-mono text-[9px] text-secondary tabular-nums">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── InfoDrawer ──────────────────────────────────────────

function InfoDrawer({ algorithmKey, learningInfo, metrics, isOpen, onToggle }) {
  const algoLabel = fmtAlgo(algorithmKey)
  const primaryComplexity = learningInfo?.complexity?.time?.average ?? null
  const hint = [algoLabel, primaryComplexity].filter(Boolean).join(' · ')

  return (
    <div className = "shrink-0 border-t border-hairline">
      {/* toggle bar */}
      <button
        onClick = {onToggle}
        className = "w-full flex items-center justify-between px-3 py-2 hover:bg-hover transition-colors duration-100"
      >
        <div className = "flex items-center gap-1.5">
          <ChevronRight
            size = {10}
            className = {cn(
              'text-faint transition-transform duration-150',
              isOpen && 'rotate-90',
            )}
          />
          <span className = "font-mono text-[9px] text-secondary uppercase tracking-wider">
            Info & Metrics
          </span>
        </div>

        {hint && (
          <span className = "font-mono text-[8px] text-secondary">
            {hint}
          </span>
        )}
      </button>

      {/* expandable content */}
      {isOpen && (
        <div className = "px-3 pb-3 space-y-4 border-t border-hairline animate-enter">
          {/* Algorithm info — compact: complexity + properties only */}
          {learningInfo && (
            <div className = "space-y-3 pt-2">
              <div className = "space-y-1">
                <p className = "mono-label">Complexity</p>
                <div className = "space-y-1">
                  {Object.entries({
                    'TIME (avg)': learningInfo.complexity.time.average,
                    'TIME (worst)': learningInfo.complexity.time.worst,
                    'SPACE': learningInfo.complexity.space,
                  }).map(([label, value]) => (
                    <div key = {label} className = "flex items-center justify-between rounded bg-surface-translucent border border-hairline px-2.5 py-1">
                      <span className = "font-mono text-[9px] text-muted">{label}</span>
                      <span className = "font-mono text-[9px] text-secondary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {learningInfo.properties.length > 0 && (
                <div className = "space-y-1">
                  <p className = "mono-label">Properties</p>
                  <div className = "flex flex-wrap gap-1.5">
                    {learningInfo.properties.map((prop) => (
                      <span key = {prop} className = "font-mono text-[10px] px-2 py-0.5 rounded-full border border-brand-500/20 bg-brand-500/10 text-brand-400">
                        {prop}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary metrics */}
          <div className = "space-y-1.5">
            <p className = "mono-label">Run Metrics</p>
            {metrics.map((m) => (
              <div key = {m.label} className = "metric-card flex items-center justify-between py-1.5 px-3">
                <span className = "mono-label">{m.label}</span>
                <span className = "mono-value text-sm">{m.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Helpers ─────────────────────────────────────────────

function formatSnapshotValue(value) {
  if (value === null || value === undefined) return '\u2014'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
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
      <div className = "w-8 h-8 rounded-full bg-surface-translucent border border-hairline flex items-center justify-center">
        <span className = "text-faint text-sm font-mono">∅</span>
      </div>

      <p className = "text-xs text-faint leading-relaxed max-w-[180px]">
        Run a simulation to see step-by-step details here.
      </p>
    </div>
  )
}
