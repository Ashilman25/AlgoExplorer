import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { Network, Play, RotateCcw, Save, MousePointer, Plus, Link, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, useToast, ErrorAlert } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection, ModeToggle, GridCanvas, GridConfig, GridDataStructurePanel } from '../components/simulation'
import { GRID_TIMING_CONFIG } from '../components/simulation/PlaybackBar'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { useGridState } from '../hooks/useGridState'
import { useReopenRun } from '../hooks/useReopenRun'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'
import { generateId } from '../services/guestService'
import { EXPLANATION_LEVELS } from '../config/simulationConfig'
import { metadataService } from '../services/metadataService'
import { useMetadataStore } from '../stores/useMetadataStore'
import GuestPromptBanner from '../components/guest/GuestPromptBanner'


const ALGORITHM_CATEGORY = {
  bfs: 'pathfinding',
  dijkstra: 'pathfinding',
  dfs: 'pathfinding',
  astar: 'pathfinding',
  bellman_ford: 'pathfinding',
  prims: 'mst',
  kruskals: 'mst',
  topological_sort: 'ordering',
}

const GRAPH_ALGOS = [
  { value: '_pathfinding', label: '── Pathfinding ──', disabled: true },
  { value: 'bfs',         label: 'BFS — Breadth-First Search' },
  { value: 'dfs',         label: 'DFS — Depth-First Search' },
  { value: 'dijkstra',    label: 'Dijkstra — Shortest Path' },
  { value: 'astar',       label: 'A* — Heuristic Search' },
  { value: 'bellman_ford', label: 'Bellman-Ford — Negative Weights' },
  { value: '_mst',        label: '── Minimum Spanning Tree ──', disabled: true },
  { value: 'prims',       label: "Prim's — Greedy MST" },
  { value: 'kruskals',    label: "Kruskal's — Union-Find MST" },
  { value: '_ordering',   label: '── Ordering ──', disabled: true },
  { value: 'topological_sort', label: 'Topological Sort — DAG Ordering' },
]



export function GraphConfig({
  algorithm, onAlgorithmChange,
  preset, onPresetChange, presetOptions,
  source, onSourceChange,
  target, onTargetChange,
  weighted, onWeightedChange,
  directed, onDirectedChange,
  explanationLevel, onExplanationLevelChange,
  mode, onModeChange,
  nodeOptions, edgeCount,
  error,
}) {
  const category = ALGORITHM_CATEGORY[algorithm] ?? 'pathfinding'
  const showSource = category === 'pathfinding' || (category === 'mst' && algorithm === 'prims')
  const showTarget = category === 'pathfinding'
  const showWeighted = category !== 'ordering'
  const showDirected = category === 'pathfinding'
  const lockWeighted = category === 'mst'
  const lockDirected = category === 'ordering'

  return (
    <ConfigPanel header = {<ModeToggle mode = {mode} onChange = {onModeChange} />}>

      <ConfigSection title = "Algorithm">
        <Select aria-label = "Algorithm" options = {GRAPH_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Preset">
        <Select
          aria-label = "Preset"
          options = {presetOptions}
          value = {preset}
          onChange = {onPresetChange}
        />
      </ConfigSection>

      {(showSource || showTarget) && (
        <ConfigSection title = {showSource && showTarget ? "Source / Target" : "Start Node"}>
          <div className = {`grid ${showSource && showTarget ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            {showSource && (
              <Select label = "Source" options = {nodeOptions} value = {source} onChange = {onSourceChange} />
            )}
            {showTarget && (
              <Select label = "Target" options = {nodeOptions} value = {target} onChange = {onTargetChange} />
            )}
          </div>
        </ConfigSection>
      )}

      <ConfigSection title = "Options">
        {showWeighted && (
          <label className = "flex items-center gap-2 cursor-pointer">
            <input
              type = "checkbox"
              checked = {lockWeighted ? true : weighted}
              onChange = {lockWeighted ? undefined : onWeightedChange}
              disabled = {lockWeighted}
              className = "accent-brand-500 w-3.5 h-3.5"
            />
            <span className = {`text-xs ${lockWeighted ? 'text-faint' : 'text-muted'}`}>
              Weighted edges {lockWeighted ? '(required)' : ''}
            </span>
          </label>
        )}

        {(showDirected || lockDirected) && (
          <label className = "flex items-center gap-2 cursor-pointer">
            <input
              type = "checkbox"
              checked = {lockDirected ? true : directed}
              onChange = {lockDirected ? undefined : onDirectedChange}
              disabled = {lockDirected}
              className = "accent-brand-500 w-3.5 h-3.5"
            />
            <span className = {`text-xs ${lockDirected ? 'text-faint' : 'text-muted'}`}>
              Directed graph {lockDirected ? '(required)' : ''}
            </span>
          </label>
        )}
      </ConfigSection>

      <ConfigSection title = "Explanation">
        <Select aria-label = "Explanation" options = {EXPLANATION_LEVELS} value = {explanationLevel} onChange = {onExplanationLevelChange} />
      </ConfigSection>

      {error && (
        <ConfigSection>
          <ErrorAlert title="Simulation failed" message={error} />
        </ConfigSection>
      )}

    </ConfigPanel>
  )
}



function computeNodePositions(nodes, centerX = 300, centerY = 250, radius = 140) {
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

function stateColor(s) {
  return STATE_COLOR[s] ?? STATE_COLOR.default
}

function edgeColor(s) {
  if (s === 'frontier') return STATE_COLOR.frontier
  if (s === 'visited') return STATE_COLOR.visited
  if (s === 'success') return STATE_COLOR.success

  return 'rgba(100,116,139,0.20)'
}

// Shorten a line so the arrow tip stops at the node edge (radius 15) instead of the center.
function shortenLine(x1, y1, x2, y2, pad = 15) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { x1, y1, x2, y2 }
  const ux = dx / len
  const uy = dy / len
  return { x1: x1 + ux * pad, y1: y1 + uy * pad, x2: x2 - ux * pad, y2: y2 - uy * pad }
}

function GraphCanvas({
  nodes, edges, nodePositions, weighted, directed, algorithm, source, target,
  builderMode, connectSource, canvasSize, containerRef,
  onAddNode, onDragNode, onConnectClick, onDeleteNode, onDeleteEdge, onEdgeWeightEdit,
}) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isLoading = usePlaybackStore((s) => s.isLoading)

  const svgRef = useRef(null)
  const [dragTarget, setDragTarget] = useState(null)

  // When no simulation is running, build a "step 0" baseline from the config:
  // source node → source color, target node → target color, everything else → default.
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

  const hasSimulation = currentStep != null
  const nodeStates = hasSimulation ? (currentStep.state_payload?.node_states ?? baselineNodeStates) : baselineNodeStates
  const edgeStates = currentStep?.state_payload?.edge_states ?? {}
  const frontier = currentStep?.state_payload?.frontier ?? []
  const distances = currentStep?.state_payload?.distances ?? null
  const pathData = currentStep?.state_payload?.path ?? null

  const nodePos = nodePositions ?? computeNodePositions(nodes)

  // Convert DOM mouse coords → SVG viewBox coords
  const toSVG = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())

    return { x: svgPt.x, y: svgPt.y }
  }, [])

  // Find which node (if any) is under the pointer
  const hitNode = useCallback((clientX, clientY) => {
    const { x, y } = toSVG(clientX, clientY)
    for (const n of nodes) {
      const nid = String(n.id)
      const p = nodePos[nid]
      if (!p) continue
      
      const dx = x - p.cx, dy = y - p.cy
      if (dx * dx + dy * dy <= 18 * 18) return nid

    }

    return null
  }, [toSVG, nodes, nodePos])

  // ── Pointer handlers ────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    if (builderMode !== 'drag') return
    const nid = hitNode(e.clientX, e.clientY)

    if (nid) {
      setDragTarget(nid)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }, [builderMode, hitNode])

  const handlePointerMove = useCallback((e) => {
    if (!dragTarget) return
    const { x, y } = toSVG(e.clientX, e.clientY)
    onDragNode(dragTarget, Math.round(x), Math.round(y))

  }, [dragTarget, toSVG, onDragNode])

  const handlePointerUp = useCallback(() => {
    setDragTarget(null)
  }, [])

  const handleCanvasClick = useCallback((e) => {
    if (builderMode === 'add') {
      const { x, y } = toSVG(e.clientX, e.clientY)
      onAddNode(Math.round(x), Math.round(y))
    }

  }, [builderMode, toSVG, onAddNode])

  const handleNodeClick = useCallback((e, nid) => {
    e.stopPropagation()
    if (builderMode === 'connect') onConnectClick(nid)
    else if (builderMode === 'delete') onDeleteNode(nid)

  }, [builderMode, onConnectClick, onDeleteNode])

  const handleEdgeClick = useCallback((e, src, tgt) => {
    e.stopPropagation()
    if (builderMode === 'delete') onDeleteEdge(src, tgt)
    else if (builderMode === 'drag') onEdgeWeightEdit(src, tgt)

  }, [builderMode, onDeleteEdge, onEdgeWeightEdit])

  // cursor style per mode
  const cursorClass = builderMode === 'add' ? 'cursor-crosshair'
    : builderMode === 'connect' ? 'cursor-pointer'
    : builderMode === 'delete' ? 'cursor-pointer'
    : dragTarget ? 'cursor-grabbing' : 'cursor-grab'

  const HIGHLIGHTED = new Set(['active', 'frontier', 'success', 'source', 'target'])

  return (
    <div className = "flex-1 flex flex-col min-h-0 relative">

      {/* loading overlay — sits on top of the graph, does not replace it */}
      {isLoading && (
        <div className = "absolute inset-0 flex items-center justify-center bg-base/60 z-10">
          <div className = "flex flex-col items-center gap-3">
            <div className = "w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className = "text-xs text-muted font-mono">Running simulation…</p>
          </div>
        </div>
      )}

      {/* ── SVG graph ─────────────────────────────────────────────────────── */}
      <div ref = {containerRef} className = "flex-1 min-h-0 overflow-hidden">
        <svg
          ref = {svgRef}
          viewBox = {`0 0 ${canvasSize.w} ${canvasSize.h}`}
          className = {`w-full h-full ${cursorClass}`}
          onPointerDown = {handlePointerDown}
          onPointerMove = {handlePointerMove}
          onPointerUp = {handlePointerUp}
          onClick = {handleCanvasClick}
        >
          {/* arrow marker for directed edges */}
          {directed && (
            <defs>
              <marker id = "arrow-default"  markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
                <path d = "M0,0 L8,3 L0,6" fill = "rgba(100,116,139,0.35)" />
              </marker>

              <marker id = "arrow-frontier" markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
                <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-frontier)" />
              </marker>

              <marker id = "arrow-visited"  markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
                <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-visited)" />
              </marker>

              <marker id = "arrow-success"  markerWidth = "8" markerHeight = "6" refX = "8" refY = "3" orient = "auto">
                <path d = "M0,0 L8,3 L0,6" fill = "var(--color-state-success)" />
              </marker>
            </defs>
          )}

          {/* edges */}
          {edges.map((e) => {
            const src  = String(e.source)
            const tgt  = String(e.target)
            const from = nodePos[src]
            const to   = nodePos[tgt]
            if (!from || !to) return null

            const key    = `${src}-${tgt}`
            const keyRev = `${tgt}-${src}`
            const state  = edgeStates[key] ?? edgeStates[keyRev] ?? 'default'

            const line = directed
              ? shortenLine(from.cx, from.cy, to.cx, to.cy)
              : { x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy }

            const arrowState = state === 'default' ? 'default'
              : state === 'success' ? 'success'
              : state === 'visited' ? 'visited'
              : 'frontier'

            const mx = (from.cx + to.cx) / 2
            const my = (from.cy + to.cy) / 2

            return (
              <g key = {key} onClick = {(ev) => handleEdgeClick(ev, src, tgt)}>
                {/* invisible wider hit area for clicking edges */}
                <line
                  x1 = {from.cx} y1 = {from.cy} x2 = {to.cx} y2 = {to.cy}
                  stroke = "transparent" strokeWidth = {12}
                />
                <line
                  x1 = {line.x1}
                  y1 = {line.y1}
                  x2 = {line.x2}
                  y2 = {line.y2}
                  stroke = {edgeColor(state)}
                  strokeWidth = {state === 'default' ? 1.5 : 2.5}
                  strokeLinecap = "round"
                  markerEnd = {directed ? `url(#arrow-${arrowState})` : undefined}
                  style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease', pointerEvents: 'none' }}
                />
                {weighted && e.weight != null && (
                  <text
                    x = {mx}
                    y = {my - 6}
                    textAnchor = "middle"
                    fill = "var(--color-state-frontier)"
                    fontSize = {9}
                    fontFamily = "'IBM Plex Mono', monospace"
                    fontWeight = "500"
                    opacity = {0.8}
                    style = {{ pointerEvents: 'none' }}
                  >
                    {e.weight}
                  </text>
                )}
              </g>
            )
          })}

          {/* connect-in-progress line */}
          {builderMode === 'connect' && connectSource && nodePos[connectSource] && (
            <line
              x1 = {nodePos[connectSource].cx}
              y1 = {nodePos[connectSource].cy}
              x2 = {nodePos[connectSource].cx}
              y2 = {nodePos[connectSource].cy}
              stroke = "var(--color-state-source)"
              strokeWidth = {1.5}
              strokeDasharray = "4 3"
              opacity = {0.5}
              style = {{ pointerEvents: 'none' }}
            />
          )}

          {/* Nodes */}
          {nodes.map(({ id }) => {
            const nid = String(id)
            const pos = nodePos[nid]
            if (!pos) return null

            const { cx, cy } = pos
            const state = nodeStates[nid] ?? 'default'
            const color = stateColor(state)
            const active = HIGHLIGHTED.has(state)
            const isConnectSrc = builderMode === 'connect' && connectSource === nid

            return (
              <g
                key = {nid}
                style = {{ transition: dragTarget === nid ? 'none' : 'all 0.2s ease' }}
                onClick = {(ev) => handleNodeClick(ev, nid)}
              >

                {(active || isConnectSrc) && (
                  <circle cx = {cx} cy = {cy} r = {20} fill = {isConnectSrc ? 'var(--color-state-source)' : color} opacity = {0.12} />
                )}

                <circle
                  cx = {cx}
                  cy = {cy}
                  r = {15}
                  fill = "rgba(15, 23, 42, 0.92)"
                  stroke = {isConnectSrc ? 'var(--color-state-source)' : color}
                  strokeWidth = {active || isConnectSrc ? 2.5 : 1.5}
                  style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
                />

                <text
                  x = {cx}
                  y = {cy}
                  textAnchor  = "middle"
                  dominantBaseline = "central"
                  fill = {color}
                  fontSize = {12}
                  fontFamily = "'IBM Plex Mono', monospace"
                  fontWeight = "600"
                  style = {{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                >
                  {nid}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* data structure inspector  */}
      <DataStructurePanel
        algorithm = {algorithm}
        frontier = {frontier}
        distances = {distances}
        path = {pathData}
      />
    </div>
  )
}


// Data structure inspector (queue / distances / path)

export function DataStructurePanel({ algorithm, frontier, distances, path }) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const category = ALGORITHM_CATEGORY[algorithm] ?? 'pathfinding'

  const hasQueue = (algorithm === 'bfs' || algorithm === 'dfs') && frontier.length > 0
  const hasDistances = ['dijkstra', 'astar', 'bellman_ford'].includes(algorithm) && distances && Object.keys(distances).length > 0
  const hasPath = path && path.length > 0

  // MST data from state_payload
  const mstEdges = currentStep?.state_payload?.mst_edges
  const mstWeight = currentStep?.state_payload?.mst_total_weight
  const hasMst = category === 'mst' && mstEdges && mstEdges.length > 0

  // Ordering data from state_payload
  const ordering = currentStep?.state_payload?.ordering
  const hasOrdering = category === 'ordering' && ordering && ordering.length > 0

  // Negative cycle
  const negativeCycle = currentStep?.state_payload?.negative_cycle
  const hasNegCycle = negativeCycle && negativeCycle.length > 0

  // Heuristic values for A*
  const heuristicValues = currentStep?.state_payload?.heuristic_values
  const hasHeuristic = algorithm === 'astar' && heuristicValues && Object.keys(heuristicValues).length > 0

  const queueLabel = algorithm === 'dfs' ? 'Stack' : 'Queue'

  return (
    <div className = "shrink-0 border-t border-hairline px-4 py-3 space-y-2 overflow-x-auto min-h-[40px]">

      {/* BFS queue / DFS stack */}
      {hasQueue && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">{queueLabel}</span>
          <div className = "flex gap-1">
            {frontier.map((id, i) => (
              <span
                key = {i}
                className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-frontier bg-state-frontier/10 border-state-frontier/30"
              >
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Distances (Dijkstra / A* / Bellman-Ford) */}
      {hasDistances && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Dist</span>
          <div className = "flex gap-1 flex-wrap">
            {Object.entries(distances).map(([node, d]) => (
              <span
                key = {node}
                className = "font-mono text-[10px] px-1.5 py-0.5 rounded border border-subtle bg-surface-translucent text-muted"
              >
                {node}:<span className = {d === 'inf' ? 'text-faint' : 'text-state-active'}>{d}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* A* heuristic values */}
      {hasHeuristic && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">f(n)</span>
          <div className = "flex gap-1 flex-wrap">
            {Object.entries(heuristicValues).map(([node, vals]) => (
              <span
                key = {node}
                className = "font-mono text-[10px] px-1.5 py-0.5 rounded border border-subtle bg-surface-translucent text-muted"
              >
                {node}:<span className = {vals.f === 'inf' ? 'text-faint' : 'text-brand-400'}>{vals.f}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MST edges */}
      {hasMst && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">MST</span>
          <div className = "flex items-center gap-1 flex-wrap">
            {mstEdges.map((e, i) => (
              <span
                key = {i}
                className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-success bg-state-success/10 border-state-success/30"
              >
                {e.source}-{e.target} ({e.weight})
              </span>
            ))}
            <span className = "font-mono text-[10px] text-muted ml-1">
              = {mstWeight}
            </span>
          </div>
        </div>
      )}

      {/* Topological ordering */}
      {hasOrdering && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Order</span>
          <div className = "flex items-center gap-0.5">
            {ordering.map((id, i) => (
              <span key = {i} className = "flex items-center gap-0.5">
                <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-success bg-state-success/10 border-state-success/30">
                  {i + 1}. {id}
                </span>
                {i < ordering.length - 1 && (
                  <span className = "text-[10px] text-faint">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Negative cycle */}
      {hasNegCycle && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0 text-state-target">Cycle</span>
          <div className = "flex items-center gap-0.5">
            {negativeCycle.map((id, i) => (
              <span key = {i} className = "flex items-center gap-0.5">
                <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-target bg-state-target/10 border-state-target/30">
                  {id}
                </span>
                {i < negativeCycle.length - 1 && (
                  <span className = "text-[10px] text-faint">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Path */}
      {hasPath && !hasMst && !hasOrdering && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Path</span>
          <div className = "flex items-center gap-0.5">
            {path.map((id, i) => (
              <span key = {i} className = "flex items-center gap-0.5">
                <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-success bg-state-success/10 border-state-success/30">
                  {id}
                </span>
                {i < path.length - 1 && (
                  <span className = "text-[10px] text-faint">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// builder tools

const BUILDER_MODES = [
  {value: 'drag', icon: MousePointer, label: 'Drag'},
  {value: 'add', icon: Plus, label: 'Add Node'},
  {value: 'connect', icon: Link, label: 'Connect'},
  {value: 'delete', icon: Trash2, label: 'Delete'},
]

function BuilderToolbar({ builderMode, onModeChange, connectSource }) {
  return (
    <div className = "shrink-0 flex items-center gap-1 px-4 py-2 border-b border-hairline">
      {BUILDER_MODES.map(({ value, icon: Icon, label }) => (
        <button
          key = {value}
          title = {label}
          onClick = {() => onModeChange(value)}
          className = {`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium uppercase tracking-wide transition-colors ${
            builderMode === value
              ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
              : 'text-muted hover:text-secondary hover:bg-hover border border-transparent'
          }`}
        >
          <Icon size = {12} strokeWidth = {1.5} />
          {label}
        </button>
      ))}

      {builderMode === 'connect' && connectSource && (
        <span className = "ml-2 font-mono text-[10px] text-state-source">
          from {connectSource} → …
        </span>
      )}
    </div>
  )
}


// next node id

let _nodeCounter = 0
function nextNodeId(existingNodes) {
  const ids = new Set(existingNodes.map((n) => String(n.id)))
  // try letters first, then numbers
  for (let c = 65; c <= 90; c++) {
    const ch = String.fromCharCode(c)
    if (!ids.has(ch)) return ch
  }

  while (ids.has(String(++_nodeCounter))) { /* skip */ }
  return String(_nodeCounter)
}


export default function GraphLabPage() {
  const { run, isRunning } = useRunSimulation()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const { clearTimeline, error: timelineError } = usePlaybackStore()
  const { clearRun } = useRunStore()
  const { saveScenario } = useGuestStore()
  const toast = useToast()


  // --- load scenario from library (if navigated from Scenario Library) ---
  const [loadedScenario] = useState(() => {
    const s = useScenarioStore.getState().scenario
    return s?.module_type === 'graph' ? s : null
  })
  const gp = loadedScenario?.input_payload

  const [algorithm, setAlgorithm] = useState(loadedScenario?.algorithm_key ?? 'bfs')
  const [presetKey, setPresetKey] = useState(loadedScenario ? 'custom' : '')
  const [graphPresets, setGraphPresets] = useState([])
  const [source, setSource] = useState(gp?.source != null ? String(gp.source) : '')
  const [target, setTarget] = useState(gp?.target != null ? String(gp.target) : '')
  const [weighted, setWeighted] = useState(gp?.weighted ?? false)
  const [directed, setDirected] = useState(gp?.directed ?? false)
  const [explanationLevel, setExplanationLevel] = useState('standard')
  const [mode, setMode] = useState(gp?.mode ?? 'graph')

  // ── Grid state ──
  const gridInitial = useMemo(() => {
    if (gp?.mode !== 'grid') return undefined
    const sz = gp.grid?.length ?? 20
    const wallSet = new Set()
    if (gp.grid) {
      for (let r = 0; r < gp.grid.length; r++) {
        for (let c = 0; c < gp.grid[r].length; c++) {
          if (gp.grid[r][c] === 1) wallSet.add(`${r},${c}`)
        }
      }
    }
    const colCount = gp.grid?.[0]?.length ?? sz
    return {
      rows: sz,
      cols: colCount,
      walls: wallSet,
      startCell: gp.source ? [gp.source.row, gp.source.col] : null,
      endCell: gp.target ? [gp.target.row, gp.target.col] : null,
      allowDiagonal: gp.allow_diagonal ?? false,
      density: gp.density ?? 0.25,
    }
  }, [gp])

  const gridState = useGridState(gridInitial)

  const canvasContainerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 500 })

  useEffect(() => {
    const el = canvasContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  const [graphNodes, setGraphNodes] = useState(gp?.nodes ?? [])
  const [graphEdges, setGraphEdges] = useState(gp?.edges ?? [])
  const [nodePositions, setNodePositions] = useState(() =>
    gp?.nodePositions ?? (gp?.nodes ? computeNodePositions(gp.nodes) : {}),
  )
  const hasInitialized = useRef(!!gp?.nodePositions)

  // Re-center nodes once the real container size is known (first mount only)
  // Skipped when positions were restored from a saved scenario.
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    setNodePositions(computeNodePositions(graphNodes, canvasSize.w / 2, canvasSize.h / 2, Math.min(canvasSize.w, canvasSize.h) * 0.3))

  }, [canvasSize])

  // Clear scenario store after hydration + clear stale timeline for fresh scenario loads
  useEffect(() => {
    if (loadedScenario) {
      useScenarioStore.getState().clearScenario()
      if (!loadedScenario._reopenRunId) {
        usePlaybackStore.getState().clearTimeline()
        useRunStore.getState().clearRun()
      }
    }
  }, [loadedScenario])

  // Reopen run: fetch stored timeline if navigated from Run History
  const reopenTimingConfig = loadedScenario?.input_payload?.mode === 'grid' ? GRID_TIMING_CONFIG : undefined
  useReopenRun(loadedScenario?._reopenRunId, reopenTimingConfig)

  // builder mode: drag | add | connect | delete
  const [builderMode, setBuilderMode]     = useState('drag')
  const [connectSource, setConnectSource] = useState(null)

  const nodeOptions = useMemo(
    () => graphNodes.map((n) => ({ value: String(n.id), label: String(n.id) })),
    [graphNodes],
  )

  // ── Preset fetching ──
  useEffect(() => {
    if (mode !== 'graph') return

    const cached = useMetadataStore.getState().getPresets('graph', algorithm)
    if (cached) {
      setGraphPresets(cached)
      return
    }

    let cancelled = false
    metadataService.getPresets('graph', algorithm).then((resp) => {
      if (cancelled) return
      const items = resp.groups.flatMap((g) => g.presets)
      useMetadataStore.getState().setPresets('graph', algorithm, items)
      setGraphPresets(items)
    }).catch(() => {
      // Graceful degradation — presets dropdown will just show "Custom"
    })
    return () => { cancelled = true }
  }, [algorithm, mode])

  // Apply first preset on initial load (once presets arrive and no scenario is loaded)
  const appliedInitialPreset = useRef(!!loadedScenario)
  useEffect(() => {
    if (appliedInitialPreset.current || graphPresets.length === 0) return
    appliedInitialPreset.current = true
    const first = graphPresets[0]
    const p = first.input_payload
    setPresetKey(first.key)
    setGraphNodes(p.nodes)
    setGraphEdges(p.edges)
    setNodePositions(computeNodePositions(p.nodes, canvasSize.w / 2, canvasSize.h / 2, Math.min(canvasSize.w, canvasSize.h) * 0.3))
    setSource(p.source ? String(p.source) : '')
    setTarget(p.target ? String(p.target) : '')
    setWeighted(p.weighted ?? false)
    setDirected(p.directed ?? false)
  }, [graphPresets, canvasSize])

  const presetOptions = useMemo(() => [
    { value: 'custom', label: 'Custom (loaded scenario)' },
    ...graphPresets.map((p) => ({ value: p.key, label: p.label })),
  ], [graphPresets])

  // presets
  const handlePresetChange = useCallback((e) => {
    const key = e.target.value
    setPresetKey(key)
    clearTimeline()
    clearRun()
    const found = graphPresets.find((pr) => pr.key === key)
    if (found) {
      const p = found.input_payload
      setGraphNodes(p.nodes)
      setGraphEdges(p.edges)
      setNodePositions(computeNodePositions(p.nodes, canvasSize.w / 2, canvasSize.h / 2, Math.min(canvasSize.w, canvasSize.h) * 0.3))
      setSource(p.source ? String(p.source) : '')
      setTarget(p.target ? String(p.target) : '')
      setWeighted(p.weighted ?? false)
      setDirected(p.directed ?? false)
      setConnectSource(null)
    }
  }, [graphPresets, canvasSize, clearTimeline, clearRun])

  //build actions
  const handleAddNode = useCallback((cx, cy) => {
    const id = nextNodeId(graphNodes)
    setGraphNodes((prev) => [...prev, { id }])
    setNodePositions((prev) => ({ ...prev, [id]: { cx, cy } }))

  }, [graphNodes])

  const handleDeleteNode = useCallback((nid) => {
    setGraphNodes((prev) => prev.filter((n) => String(n.id) !== nid))
    setGraphEdges((prev) => prev.filter((e) => String(e.source) !== nid && String(e.target) !== nid))
    setNodePositions((prev) => {
      const next = { ...prev }
      delete next[nid]
      return next
    })
    if (source === nid) setSource('')
    if (target === nid) setTarget('')
    setConnectSource(null)
  }, [source, target])

  const handleDeleteEdge = useCallback((src, tgt) => {
    setGraphEdges((prev) => prev.filter((e) =>
      !(String(e.source) === src && String(e.target) === tgt) &&
      !(String(e.source) === tgt && String(e.target) === src)
    ))
  }, [])

  const handleConnectClick = useCallback((nid) => {
    if (!connectSource) {
      setConnectSource(nid)
    } else if (connectSource !== nid) {
      // check duplicate
      const exists = graphEdges.some((e) => {
        const s = String(e.source), t = String(e.target)
        return (s === connectSource && t === nid) || (s === nid && t === connectSource)
      })
      if (!exists) {
        const newEdge = { source: connectSource, target: nid }
        if (weighted) newEdge.weight = 1
        setGraphEdges((prev) => [...prev, newEdge])
      }
      setConnectSource(null)

    } else {
      setConnectSource(null)
    }

  }, [connectSource, graphEdges, weighted])

  const handleDragNode = useCallback((nid, cx, cy) => {
    setNodePositions((prev) => ({ ...prev, [nid]: { cx, cy } }))
  }, [])

  const handleEdgeWeightEdit = useCallback((src, tgt) => {
    const input = prompt('Edge weight:', '1')
    if (input === null) return
    const w = parseFloat(input)
    if (isNaN(w)) return
    if (w < 0 && algorithm !== 'bellman_ford') return
    setGraphEdges((prev) => prev.map((e) => {
      const es = String(e.source), et = String(e.target)
      if ((es === src && et === tgt) || (es === tgt && et === src)) {
        return { ...e, weight: w }
      }
      return e
    }))
  }, [algorithm])

  // ── Mode switching ──────────────────────────────────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode)
    setAlgorithm(newMode === 'grid' ? 'bfs_grid' : 'bfs')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleAlgorithmChange = useCallback((e) => {
    setAlgorithm(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleSourceChange = useCallback((e) => {
    setSource(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleTargetChange = useCallback((e) => {
    setTarget(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleWeightedChange = useCallback((e) => {
    setWeighted(e.target.checked)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleDirectedChange = useCallback((e) => {
    setDirected(e.target.checked)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleAllowDiagonalChange = useCallback((e) => {
    gridState.setAllowDiagonal(e.target.checked)
    clearTimeline()
    clearRun()
  }, [gridState.setAllowDiagonal, clearTimeline, clearRun])

  // ── Run / Reset / Save ─────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (mode === 'grid') {
      const payload = gridState.buildGridPayload()
      if (!payload) return
      run({
        module_type: 'graph',
        algorithm_key: algorithm,
        input_payload: payload,
        execution_mode: 'simulate',
        explanation_level: 'detailed',
      }, GRID_TIMING_CONFIG)
      return
    }

    const category = ALGORITHM_CATEGORY[algorithm] ?? 'pathfinding'

    // apply category overrides
    const effectiveWeighted = category === 'mst' ? true : weighted
    const effectiveDirected = category === 'ordering' ? true : directed
    const effectiveTarget = category === 'pathfinding' ? target : undefined
    const effectiveSource = (category === 'pathfinding' || algorithm === 'prims') ? source : undefined

    run({
      module_type: 'graph',
      algorithm_key: algorithm,
      input_payload: {
        nodes: graphNodes,
        edges: graphEdges,
        source: effectiveSource,
        target: effectiveTarget,
        weighted: effectiveWeighted,
        directed: effectiveDirected,
        mode,
      },
      execution_mode: 'simulate',
      explanation_level: 'detailed',
    })
  }, [run, algorithm, graphNodes, graphEdges, source, target, weighted, directed, mode, gridState])

  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
    if (mode === 'grid') {
      gridState.resetGrid()
    }
  }, [clearTimeline, clearRun, mode, gridState])

  const handleSave = useCallback(() => {
    const name = `Custom Graph — ${algorithm.toUpperCase()}`
    saveScenario({
      id: generateId(),
      name,
      module_type: 'graph',
      algorithm_key: algorithm,
      input_payload: { nodes: graphNodes, edges: graphEdges, source, target, weighted, directed, mode, nodePositions },
      tags: [],
      created_at: new Date().toISOString(),
    })
    toast({ type: 'success', title: 'Scenario saved', message: `"${name}" added to library.` })
  }, [saveScenario, toast, graphNodes, graphEdges, algorithm, source, target, weighted, directed, mode, nodePositions])

  return (
    <>
      <PageHeader
        icon = {Network}
        title = "Graph Lab"
        description = "Interactive graph traversal and pathfinding simulations."
        accent = "brand"
        badge = "Phase 5"
      >
        <div className = "flex items-center gap-1 bg-base border border-hairline rounded-lg p-1">
          <Button variant = "primary" size = "sm" icon = {Play} onClick = {handleRun} disabled = {isRunning || isPlaying || (mode === 'grid' && (!gridState.startCell || !gridState.endCell))}>
            {isRunning || isPlaying ? 'Running…' : 'Run'}
          </Button>
          <Button variant = "ghost" size = "sm" icon = {Save} onClick = {handleSave} disabled = {isRunning || isPlaying}>
            Save
          </Button>
          <div className = "w-px h-4 border-l border-hairline" />
          <Button variant = "ghost" size = "sm" icon = {RotateCcw} onClick = {handleReset} disabled = {isRunning || isPlaying}>
            Reset
          </Button>
        </div>
      </PageHeader>

      <GuestPromptBanner />

      <SimulationLayout
        moduleKey = "graph"
        algorithmKey = {algorithm}
        explanationLevel = {explanationLevel}
        configPanel = {
          mode === 'graph' ? (
            <GraphConfig
              algorithm = {algorithm}
              onAlgorithmChange = {handleAlgorithmChange}
              preset = {presetKey}
              onPresetChange = {handlePresetChange}
              presetOptions = {presetOptions}
              source = {source}
              onSourceChange = {handleSourceChange}
              target = {target}
              onTargetChange = {handleTargetChange}
              weighted = {weighted}
              onWeightedChange = {handleWeightedChange}
              directed = {directed}
              onDirectedChange = {handleDirectedChange}
              explanationLevel = {explanationLevel}
              onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
              mode = {mode}
              onModeChange = {handleModeChange}
              nodeOptions = {nodeOptions}
              edgeCount = {graphEdges.length}
              error = {timelineError}
            />
          ) : (
            <GridConfig
              algorithm = {algorithm}
              onAlgorithmChange = {handleAlgorithmChange}
              rows = {gridState.rows}
              cols = {gridState.cols}
              allowDiagonal = {gridState.allowDiagonal}
              onAllowDiagonalChange = {handleAllowDiagonalChange}
              explanationLevel = {explanationLevel}
              onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
              mode = {mode}
              onModeChange = {handleModeChange}
              error = {timelineError}
            />
          )
        }
      >
        {mode === 'graph' ? (
          <div className = "flex flex-col flex-1 min-h-0">
            <BuilderToolbar builderMode = {builderMode} onModeChange = {setBuilderMode} connectSource = {connectSource} />
            <GraphCanvas
              nodes = {graphNodes}
              edges = {graphEdges}
              nodePositions = {nodePositions}
              weighted = {weighted}
              directed = {directed}
              algorithm = {algorithm}
              source = {source}
              target = {target}
              builderMode = {builderMode}
              connectSource = {connectSource}
              canvasSize = {canvasSize}
              containerRef = {canvasContainerRef}
              onAddNode = {handleAddNode}
              onDragNode = {handleDragNode}
              onConnectClick = {handleConnectClick}
              onDeleteNode = {handleDeleteNode}
              onDeleteEdge = {handleDeleteEdge}
              onEdgeWeightEdit = {handleEdgeWeightEdit}
            />
          </div>
        ) : (
          <div className = "flex flex-col flex-1 min-h-0">
            <div ref = {canvasContainerRef} className = "flex-1 min-h-0 overflow-hidden">
              <GridCanvas
                rows = {gridState.rows}
                cols = {gridState.cols}
                walls = {gridState.walls}
                startCell = {gridState.startCell}
                endCell = {gridState.endCell}
                onWallBatch = {gridState.handleWallBatch}
                onStartPlace = {gridState.handleStartPlace}
                onEndPlace = {gridState.handleEndPlace}
                mazeType = {gridState.mazeType}
                onGenerate = {gridState.generateMaze}
                onMazeTypeChange = {gridState.setMazeType}
                containerRef = {canvasContainerRef}
                onDimensionsChange = {gridState.setDimensions}
              />
            </div>
            <GridDataStructurePanel algorithm = {algorithm} />
          </div>
        )}
      </SimulationLayout>
    </>
  )
}
