import { usePlaybackStore } from '../../stores/usePlaybackStore'
import { useRunStore } from '../../stores/useRunStore'

function formatDist(value) {
  if (value == null || value === 'inf') return '\u221e'
  if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(1)
  return String(value)
}

function findActiveCell(entities) {
  const active = entities?.find((e) => e.state === 'active')
  if (!active || !Array.isArray(active.id)) return null
  return { row: active.id[0], col: active.id[1] }
}

function findTargetCoordKey(cellStates) {
  if (!cellStates) return null
  for (const [key, state] of Object.entries(cellStates)) {
    if (state === 'target') return key
  }
  return null
}

export default function GridFocusCard() {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const summary = useRunStore((s) => s.summary)

  const payload = currentStep?.state_payload
  if (!payload?.grid_meta) return null

  const algorithm = summary?.algorithm_key
  const entities = currentStep?.highlighted_entities ?? currentStep?.highlightedEntities ?? []
  const metrics = currentStep?.metrics_snapshot ?? currentStep?.metricsSnapshot ?? {}
  const activeCell = findActiveCell(entities)
  const activeKey = activeCell ? `${activeCell.row},${activeCell.col}` : null

  const distances = payload.distances
  const heuristic = payload.heuristic_values
  const frontierCount = payload.frontier_cells?.length ?? 0
  const targetKey = findTargetCoordKey(payload.cell_states)

  const rows = []

  // Row: Active cell
  if (activeCell) {
    const label = `(${activeCell.row},${activeCell.col})`

    if (algorithm === 'dijkstra_grid' && distances && activeKey) {
      const dist = formatDist(distances[activeKey])
      rows.push({ label: 'Active', value: label, badge: true, suffix: `dist: ${dist}` })
    } else {
      rows.push({ label: 'Active', value: label, badge: true })
    }
  }

  // Algorithm-specific rows
  if (algorithm === 'dfs_grid') {
    rows.push({ label: 'Stack depth', value: String(metrics.stack_depth ?? 0) })
  } else if (algorithm === 'dijkstra_grid') {
    const targetDist = targetKey && distances ? formatDist(distances[targetKey]) : '\u221e'
    rows.push({ label: 'Target dist', value: targetDist })
    rows.push({ label: 'Frontier', value: String(frontierCount) })
  } else if (algorithm === 'astar_grid') {
    if (heuristic && activeKey && heuristic[activeKey]) {
      const h = heuristic[activeKey]
      rows.push({ label: 'ghf', g: formatDist(h.g), h: formatDist(h.h), f: formatDist(h.f) })
    }
    const targetDist = targetKey && distances ? formatDist(distances[targetKey]) : '\u221e'
    rows.push({ label: 'Target dist', value: targetDist })
  } else {
    // BFS and any other grid algorithm
    rows.push({ label: 'Frontier', value: String(frontierCount) })
  }

  if (rows.length === 0) return null

  return (
    <div className = "shrink-0 border-t border-hairline px-3 py-2 space-y-1">
      <p className = "mono-label">Grid Focus</p>

      {rows.map((row) => {
        if (row.g !== undefined) {
          // g / h / f row
          return (
            <div key = "ghf" className = "flex items-center gap-2 rounded-lg bg-surface-translucent border border-hairline px-2.5 py-1.5">
              <span className = "font-mono text-[10px] text-muted">g</span>
              <span className = "font-mono text-xs text-secondary tabular-nums">{row.g}</span>
              <span className = "text-faint">|</span>
              <span className = "font-mono text-[10px] text-muted">h</span>
              <span className = "font-mono text-xs text-secondary tabular-nums">{row.h}</span>
              <span className = "text-faint">|</span>
              <span className = "font-mono text-[10px] text-muted">f</span>
              <span className = "font-mono text-xs text-brand-400 tabular-nums">{row.f}</span>
            </div>
          )
        }

        return (
          <div key = {row.label} className = "flex items-center justify-between rounded-lg bg-surface-translucent border border-hairline px-2.5 py-1.5">
            <span className = "mono-sm">{row.label}</span>
            <span className = "flex items-center gap-1.5">
              {row.badge ? (
                <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-active bg-state-active/10 border-state-active/30">
                  {row.value}
                </span>
              ) : (
                <span className = "font-mono text-xs text-secondary tabular-nums">{row.value}</span>
              )}
              {row.suffix && (
                <span className = "font-mono text-[10px] text-muted">{row.suffix}</span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
