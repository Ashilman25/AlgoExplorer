import { useMemo, useRef, useEffect } from 'react'
import { usePlaybackStore } from '../../stores/usePlaybackStore'

const NODE_W = 56
const NODE_H = 28
const H_GAP = 8
const V_GAP = 40

const STATE_COLORS = {
  active:   { border: 'var(--color-state-active)',   bg: 'rgba(34,211,238,0.15)' },
  visited:  { border: 'var(--color-state-visited)',  bg: 'rgba(56,189,248,0.10)' },
  frontier: { border: 'var(--color-state-frontier)', bg: 'rgba(251,191,36,0.10)' },
  success:  { border: 'var(--color-state-success)',  bg: 'rgba(52,211,153,0.15)' },
  source:   { border: 'var(--color-state-source)',   bg: 'rgba(167,139,250,0.15)' },
  default:  { border: 'var(--color-border-default)',  bg: 'transparent' },
}


function layoutTree(nodes) {
  if (!nodes || nodes.length === 0) return { positioned: [], width: 0, height: 0 }

  const byId = new Map()
  const children = new Map()

  for (const nd of nodes) {
    byId.set(nd.id, nd)
    if (!children.has(nd.id)) children.set(nd.id, [])
    if (nd.parent_id != null) {
      if (!children.has(nd.parent_id)) children.set(nd.parent_id, [])
      children.get(nd.parent_id).push(nd.id)
    }
  }

  const positioned = []
  let nextX = 0

  function layout(id, depth) {
    const kids = children.get(id) || []
    const nd = byId.get(id)

    if (kids.length === 0) {
      const x = nextX
      nextX += NODE_W + H_GAP
      const y = depth * (NODE_H + V_GAP)
      positioned.push({ ...nd, x, y })
      return x + NODE_W / 2
    }

    const centers = kids.map((kid) => layout(kid, depth + 1))
    const center = (centers[0] + centers[centers.length - 1]) / 2
    const x = center - NODE_W / 2
    const y = depth * (NODE_H + V_GAP)
    positioned.push({ ...nd, x, y })
    return center
  }

  // find root (parent_id === null)
  const root = nodes.find((nd) => nd.parent_id == null)
  if (root) layout(root.id, 0)

  const maxX = Math.max(...positioned.map((p) => p.x + NODE_W), 0)
  const maxY = Math.max(...positioned.map((p) => p.y + NODE_H), 0)

  return { positioned, width: maxX + 16, height: maxY + 16 }
}


export default function FibCallTree() {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const totalSteps  = usePlaybackStore((s) => s.totalSteps)

  const callTree = currentStep?.state_payload?.call_tree ?? null
  const nodes    = callTree?.nodes ?? []
  const hasTimeline = totalSteps > 0

  const containerRef = useRef(null)

  const { positioned, width, height } = useMemo(() => layoutTree(nodes), [nodes])

  // build parent position lookup for edges
  const posMap = useMemo(() => {
    const map = new Map()
    for (const p of positioned) map.set(p.id, p)
    return map
  }, [positioned])

  // auto-scroll to the latest node
  useEffect(() => {
    if (containerRef.current && positioned.length > 0) {
      const last = positioned[positioned.length - 1]
      containerRef.current.scrollTo({
        left: Math.max(0, last.x - containerRef.current.clientWidth / 2 + NODE_W / 2),
        top: Math.max(0, last.y - containerRef.current.clientHeight / 2 + NODE_H / 2),
        behavior: 'smooth',
      })
    }
  }, [positioned])


  if (!hasTimeline) {
    return (
      <div className = "flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className = "text-sm font-medium text-muted">
          Call tree — visualizes recursive Fibonacci call structure
        </p>
        <p className = "text-xs text-faint max-w-xs leading-relaxed">
          Run with Memoized or Naive Recursive mode to see the call tree.
        </p>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className = "flex-1 flex items-center justify-center">
        <p className = "text-sm text-muted">No call tree data yet.</p>
      </div>
    )
  }


  return (
    <div ref = {containerRef} className = "flex-1 overflow-auto min-h-0 p-4">
      <svg width = {width} height = {height} className = "block">

        {/* edges */}
        {positioned.map((nd) => {
          if (nd.parent_id == null) return null
          const parent = posMap.get(nd.parent_id)
          if (!parent) return null

          const x1 = parent.x + NODE_W / 2
          const y1 = parent.y + NODE_H
          const x2 = nd.x + NODE_W / 2
          const y2 = nd.y

          return (
            <line
              key = {`edge-${nd.id}`}
              x1 = {x1} y1 = {y1}
              x2 = {x2} y2 = {y2}
              stroke = "var(--color-border-subtle)"
              strokeWidth = {1}
              strokeOpacity = {0.6}
            />
          )
        })}

        {/* nodes */}
        {positioned.map((nd) => {
          const isLast = nd.id === positioned[positioned.length - 1]?.id
          let state = 'default'

          if (nd.is_base_case && nd.result != null) state = 'success'
          else if (nd.is_memo_hit) state = 'source'
          else if (nd.result != null) state = 'visited'
          else if (isLast) state = 'active'
          else state = 'frontier'

          const colors = STATE_COLORS[state] || STATE_COLORS.default
          const label = nd.result != null ? `F(${nd.n})=${nd.result}` : `F(${nd.n})`

          return (
            <g key = {`node-${nd.id}`}>
              <rect
                x = {nd.x}
                y = {nd.y}
                width = {NODE_W}
                height = {NODE_H}
                rx = {6}
                fill = {colors.bg}
                stroke = {colors.border}
                strokeWidth = {nd.is_memo_hit ? 2 : 1}
              />
              <text
                x = {nd.x + NODE_W / 2}
                y = {nd.y + NODE_H / 2 + 4}
                textAnchor = "middle"
                fill = {colors.border}
                fontSize = {10}
                fontFamily = "var(--font-mono)"
              >
                {label}
              </text>
              {nd.is_memo_hit && (
                <text
                  x = {nd.x + NODE_W - 2}
                  y = {nd.y + 8}
                  textAnchor = "end"
                  fill = "var(--color-state-source)"
                  fontSize = {7}
                  fontFamily = "var(--font-mono)"
                  fontWeight = "bold"
                >
                  memo
                </text>
              )}
            </g>
          )
        })}

      </svg>
    </div>
  )
}
