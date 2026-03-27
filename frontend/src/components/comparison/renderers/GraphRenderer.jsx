import { useMemo, useRef, useState, useEffect } from 'react'

const STATE_COLOR = {
  default:  'var(--color-state-default)',
  active:   'var(--color-state-active)',
  frontier: 'var(--color-state-frontier)',
  visited:  'var(--color-state-visited)',
  swap:     'var(--color-state-swap)',
  success:  'var(--color-state-success)',
  source:   'var(--color-state-source)',
  target:   'var(--color-state-target)',
}

function stateColor(s) { return STATE_COLOR[s] ?? STATE_COLOR.default }

function edgeColor(s) {
  if (s === 'frontier') return STATE_COLOR.frontier
  if (s === 'visited')  return STATE_COLOR.visited
  if (s === 'success')  return STATE_COLOR.success
  if (s === 'target')   return STATE_COLOR.target
  return 'rgba(100,116,139,0.20)'
}

function shortenLine(x1, y1, x2, y2, pad = 15) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { x1, y1, x2, y2 }
  const ux = dx / len, uy = dy / len
  return { x1: x1 + ux * pad, y1: y1 + uy * pad, x2: x2 - ux * pad, y2: y2 - uy * pad }
}

function computeNodePositions(nodes, centerX = 300, centerY = 200, radius = 120) {
  const positions = {}
  const count = nodes.length
  if (count === 1) {
    positions[String(nodes[0].id)] = { cx: centerX, cy: centerY }
    return positions
  }
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    positions[String(n.id)] = {
      cx: Math.round(centerX + radius * Math.cos(angle)),
      cy: Math.round(centerY + radius * Math.sin(angle)),
    }
  })
  return positions
}

const HIGHLIGHTED = new Set(['active', 'frontier', 'success', 'source', 'target'])

export default function GraphRenderer({ currentStep, inputPayload }) {
  const { nodes = [], edges = [], source, target, weighted = false, directed = false } = inputPayload ?? {}

  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const nodePos = useMemo(
    () => computeNodePositions(nodes, canvasSize.w / 2, canvasSize.h / 2, Math.min(canvasSize.w, canvasSize.h) * 0.35),
    [nodes, canvasSize]
  )

  const baselineNodeStates = useMemo(() => {
    const states = {}
    for (const n of nodes) {
      const nid = String(n.id)
      if (nid === source)      states[nid] = 'source'
      else if (nid === target) states[nid] = 'target'
      else                     states[nid] = 'default'
    }
    return states
  }, [nodes, source, target])

  const hasStep = currentStep != null
  const nodeStates = hasStep ? (currentStep.state_payload?.node_states ?? baselineNodeStates) : baselineNodeStates
  const edgeStates = currentStep?.state_payload?.edge_states ?? {}

  const mstEdgeSet = useMemo(() => {
    const mstEdges = currentStep?.state_payload?.mst_edges
    if (!mstEdges) return null
    const set = new Set()
    for (const e of mstEdges) {
      set.add(`${e.source}-${e.target}`)
      set.add(`${e.target}-${e.source}`)
    }
    return set
  }, [currentStep])

  const orderingMap = useMemo(() => {
    const ordering = currentStep?.state_payload?.ordering
    if (!ordering) return null
    const map = {}
    ordering.forEach((id, i) => { map[String(id)] = i + 1 })
    return map
  }, [currentStep])

  const heuristicValues = currentStep?.state_payload?.heuristic_values ?? null

  return (
    <div ref = {containerRef} className = "w-full h-full min-h-0 overflow-hidden">
      <svg viewBox = {`0 0 ${canvasSize.w} ${canvasSize.h}`} className = "w-full h-full">
        {directed && (
          <defs>
            <marker id = "cmp-arrow-default"  markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
              <path d = "M0,0 L8,3 L0,6" fill = "rgba(100,116,139,0.35)" />
            </marker>
            <marker id = "cmp-arrow-frontier" markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
              <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-frontier)" />
            </marker>
            <marker id = "cmp-arrow-visited"  markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
              <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-visited)" />
            </marker>
            <marker id = "cmp-arrow-success"  markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
              <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-success)" />
            </marker>
            <marker id = "cmp-arrow-target" markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
              <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-target)" />
            </marker>
          </defs>
        )}

        {/* Edges */}
        {edges.map((e) => {
          const src = String(e.source), tgt = String(e.target)
          const from = nodePos[src], to = nodePos[tgt]
          if (!from || !to) return null

          const key = `${src}-${tgt}`, keyRev = `${tgt}-${src}`
          const state = edgeStates[key] ?? edgeStates[keyRev] ?? 'default'

          const line = directed
            ? shortenLine(from.cx, from.cy, to.cx, to.cy)
            : { x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy }

          const arrowState = state === 'default' ? 'default'
            : state === 'success' ? 'success'
            : state === 'visited' ? 'visited'
            : state === 'target' ? 'target'
            : 'frontier'

          const mx = (from.cx + to.cx) / 2, my = (from.cy + to.cy) / 2

          return (
            <g key = {key}>
              <line
                x1 = {line.x1} y1 = {line.y1} x2 = {line.x2} y2 = {line.y2}
                stroke = {edgeColor(state)}
                strokeWidth = {mstEdgeSet && mstEdgeSet.has(key) ? 3.5 : state === 'default' ? 1.5 : 2.5}
                strokeLinecap = "round"
                markerEnd = {directed ? `url(#cmp-arrow-${arrowState})` : undefined}
                style = {{
                  transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
                  filter: mstEdgeSet && mstEdgeSet.has(key) ? 'drop-shadow(0 0 4px var(--color-state-success))' : undefined,
                }}
              />
              {weighted && e.weight != null && (
                <text
                  x = {mx} y = {my - 6} textAnchor = "middle"
                  fill = "var(--color-state-frontier)" fontSize = {9}
                  fontFamily = "'IBM Plex Mono', monospace" fontWeight = "500" opacity = {0.8}
                  style = {{ pointerEvents: 'none' }}
                >
                  {e.weight}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map(({ id }) => {
          const nid = String(id)
          const pos = nodePos[nid]
          if (!pos) return null

          const { cx, cy } = pos
          const state = nodeStates[nid] ?? 'default'
          const color = stateColor(state)
          const active = HIGHLIGHTED.has(state)

          return (
            <g key = {nid} style = {{ transition: 'all 0.2s ease' }}>
              {active && (
                <circle cx = {cx} cy = {cy} r = {20} fill = {color} opacity = {0.12} />
              )}
              <circle
                cx = {cx} cy = {cy} r = {15}
                fill = "rgba(15, 23, 42, 0.92)"
                stroke = {color}
                strokeWidth = {active ? 2.5 : 1.5}
                style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
              />
              <text
                x = {cx} y = {cy} textAnchor = "middle" dominantBaseline = "central"
                fill = {color} fontSize = {12}
                fontFamily = "'IBM Plex Mono', monospace" fontWeight = "600"
                style = {{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
              >
                {nid}
              </text>

              {/* A* f-score label */}
              {heuristicValues && heuristicValues[nid] && heuristicValues[nid].f !== 'inf' && (
                <text
                  x = {cx} y = {cy + 24} textAnchor = "middle"
                  fill = "var(--color-brand-400)" fontSize = {9} opacity = {0.8}
                  fontFamily = "'IBM Plex Mono', monospace" fontWeight = "500"
                  style = {{ pointerEvents: 'none' }}
                >
                  f={heuristicValues[nid].f}
                </text>
              )}

              {/* Topo sort ordering badge */}
              {orderingMap && orderingMap[nid] && (
                <g>
                  <circle cx = {cx + 12} cy = {cy - 12} r = {8} fill = "var(--color-state-success)" opacity = {0.9} />
                  <text
                    x = {cx + 12} y = {cy - 12} textAnchor = "middle" dominantBaseline = "central"
                    fill = "rgba(15, 23, 42, 0.95)" fontSize = {8}
                    fontFamily = "'IBM Plex Mono', monospace" fontWeight = "700"
                    style = {{ pointerEvents: 'none' }}
                  >
                    {orderingMap[nid]}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
