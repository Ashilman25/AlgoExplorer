// frontend/src/components/simulation/GridDataStructurePanel.jsx

import { usePlaybackStore } from '../../stores/usePlaybackStore'

const BADGE_LIMIT = 12
const BADGE_MAX = 15

function coordLabel(cell) {
  return `(${cell[0]},${cell[1]})`
}

function truncate(entries, limit, max) {
  if (entries.length <= max) return { visible: entries, hidden: 0 }
  return { visible: entries.slice(0, limit), hidden: entries.length - limit }
}

export default function GridDataStructurePanel({ algorithm }) {
  const currentStep = usePlaybackStore((s) => s.currentStep)

  const payload = currentStep?.state_payload
  const frontier = payload?.frontier_cells ?? []
  const distances = payload?.distances ?? null
  const heuristic = payload?.heuristic_values ?? null
  const path = payload?.path ?? null

  const hasFrontier = frontier.length > 0
  const hasDistances = ['dijkstra_grid', 'astar_grid'].includes(algorithm) && distances && Object.keys(distances).length > 0
  const hasHeuristic = algorithm === 'astar_grid' && heuristic && Object.keys(heuristic).length > 0
  const hasPath = path && path.length > 0

  const frontierT = truncate(frontier, BADGE_LIMIT, BADGE_MAX)
  const distEntries = hasDistances ? Object.entries(distances) : []
  const distT = truncate(distEntries, BADGE_LIMIT, BADGE_MAX)
  const heurEntries = hasHeuristic ? Object.entries(heuristic) : []
  const heurT = truncate(heurEntries, BADGE_LIMIT, BADGE_MAX)
  const pathT = truncate(path ?? [], BADGE_LIMIT, BADGE_MAX)

  function moreBadge(count) {
    return (
      <span className = "font-mono text-[9px] px-1 py-px rounded border border-subtle bg-surface-translucent text-muted">
        +{count} more
      </span>
    )
  }

  return (
    <div className = "shrink-0 border-t border-hairline px-3 py-1 space-y-0.5 overflow-y-auto h-[72px]">

      {hasFrontier && (
        <div className = "flex items-center gap-1.5">
          <span className = "mono-label shrink-0 text-[9px]">Frontier</span>
          <span className = "font-mono text-[9px] text-faint shrink-0">{frontier.length}</span>
          <div className = "flex gap-0.5 flex-wrap">
            {frontierT.visible.map((cell, i) => (
              <span key = {i} className = "font-mono text-[9px] px-1 py-px rounded border text-state-frontier bg-state-frontier/10 border-state-frontier/30">
                {coordLabel(cell)}
              </span>
            ))}
            {frontierT.hidden > 0 && moreBadge(frontierT.hidden)}
          </div>
        </div>
      )}

      {hasDistances && (
        <div className = "flex items-center gap-1.5">
          <span className = "mono-label shrink-0 text-[9px]">Dist</span>
          <span className = "font-mono text-[9px] text-faint shrink-0">{distEntries.length}</span>
          <div className = "flex gap-0.5 flex-wrap">
            {distT.visible.map(([coord, d]) => (
              <span key = {coord} className = "font-mono text-[9px] px-1 py-px rounded border border-subtle bg-surface-translucent text-muted">
                {coord}:<span className = {d === 'inf' ? 'text-faint' : 'text-state-active'}>{d}</span>
              </span>
            ))}
            {distT.hidden > 0 && moreBadge(distT.hidden)}
          </div>
        </div>
      )}

      {hasHeuristic && (
        <div className = "flex items-center gap-1.5">
          <span className = "mono-label shrink-0 text-[9px]">f(n)</span>
          <span className = "font-mono text-[9px] text-faint shrink-0">{heurEntries.length}</span>
          <div className = "flex gap-0.5 flex-wrap">
            {heurT.visible.map(([coord, vals]) => (
              <span key = {coord} className = "font-mono text-[9px] px-1 py-px rounded border border-subtle bg-surface-translucent text-muted">
                {coord}:<span className = {vals.f === 'inf' ? 'text-faint' : 'text-brand-400'}>{vals.f}</span>
              </span>
            ))}
            {heurT.hidden > 0 && moreBadge(heurT.hidden)}
          </div>
        </div>
      )}

      {hasPath && (
        <div className = "flex items-center gap-1.5">
          <span className = "mono-label shrink-0 text-[9px]">Path</span>
          <span className = "font-mono text-[9px] text-faint shrink-0">{(path ?? []).length}</span>
          <div className = "flex items-center gap-0.5 flex-wrap">
            {pathT.visible.map((cell, i) => (
              <span key = {i} className = "flex items-center gap-0.5">
                <span className = "font-mono text-[9px] px-1 py-px rounded border text-state-success bg-state-success/10 border-state-success/30">
                  {coordLabel(cell)}
                </span>
                {i < pathT.visible.length - 1 && (
                  <span className = "text-[9px] text-faint">&rarr;</span>
                )}
              </span>
            ))}
            {pathT.hidden > 0 && (
              <span className = "flex items-center gap-0.5">
                <span className = "text-[9px] text-faint">&rarr;</span>
                {moreBadge(pathT.hidden)}
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
