import { useCallback } from 'react'
import { Network, Play, RotateCcw } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'

// demo
// 6-node, 6-edge graph with a clear BFS traversal from A to F.
// Levels: A → {B,C} → {D,E} → F

const DEMO_NODES = [
  {id: 'A'}, {id: 'B'}, {id: 'C'},
  {id: 'D'}, {id: 'E'}, {id: 'F'},
]

const DEMO_EDGES = [
  {source: 'A', target: 'B'},
  {source: 'A', target: 'C'},
  {source: 'B', target: 'D'},
  {source: 'C', target: 'E'},
  {source: 'D', target: 'F'},
  {source: 'E', target: 'F'},
]

const DEMO_SOURCE = 'A'
const DEMO_TARGET = 'F'



const GRAPH_ALGOS = [{ value: 'bfs', label: 'BFS — Breadth-First Search' }]

function GraphConfig({ onRun, onReset, isRunning, error }) {
  return (
    <ConfigPanel title = "Graph Lab">

      <ConfigSection title = "Algorithm">
        <Select options = {GRAPH_ALGOS} value = "bfs" />
      </ConfigSection>

      <ConfigSection title = "Input Graph">
        <div className = "rounded-lg bg-slate-800/50 border border-white/[0.06] px-3 py-2.5 space-y-1">
          <p className = "text-xs font-medium text-slate-300">BFS Demo Graph</p>
          <p className = "font-mono text-[10px] text-slate-500">6 nodes · 6 edges</p>
          <p className = "font-mono text-[10px] text-slate-500">
            Source: <span className = "text-state-source">A</span>
            {'  '}Target: <span className = "text-state-target">F</span>
          </p>
        </div>
      </ConfigSection>

      {error && (
        <ConfigSection>
          <div className = "rounded-lg bg-state-target/10 border border-state-target/20 px-3 py-2">
            <p className = "text-[10px] font-mono text-state-target leading-relaxed">{error}</p>
          </div>
        </ConfigSection>
      )}

      <ConfigSection>
        <Button
          variant = "primary"
          size = "md"
          icon = {Play}
          className = "w-full"
          onClick = {onRun}
          disabled = {isRunning}
        >
          {isRunning ? 'Running…' : 'Run Simulation'}
        </Button>

        <Button
          variant = "ghost"
          size = "md"
          icon = {RotateCcw}
          className = "w-full text-slate-500"
          onClick = {onReset}
          disabled = {isRunning}
        >
          Reset
        </Button>
      </ConfigSection>

    </ConfigPanel>
  )
}


const NODE_POS = {
  A: {cx: 170, cy: 30 },   // level 0 — source
  B: {cx: 80,  cy: 100},   // level 1
  C: {cx: 260, cy: 100},   // level 1
  D: {cx: 80,  cy: 175},   // level 2
  E: {cx: 260, cy: 175},   // level 2
  F: {cx: 170, cy: 245},   // level 3 — target
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
  if (s === 'visited')  return STATE_COLOR.visited
  if (s === 'success')  return STATE_COLOR.success
  return 'rgba(100,116,139,0.20)'
}

function GraphCanvas() {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isLoading = usePlaybackStore((s) => s.isLoading)
  const error = usePlaybackStore((s) => s.error)

  const nodeStates = currentStep?.state_payload?.node_states ?? {}
  const edgeStates = currentStep?.state_payload?.edge_states ?? {}

  if (isLoading) {
    return (
      <div className = "flex-1 flex items-center justify-center">
        <div className = "flex flex-col items-center gap-3">
          <div className = "w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <p className = "text-xs text-slate-500 font-mono">Running simulation…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className = "flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
        <p className = "text-sm font-medium text-state-target">Simulation error</p>
        <p className = "text-xs text-slate-500 max-w-xs leading-relaxed">{error}</p>
      </div>
    )
  }

  if (!totalSteps) {
    return (
      <div className = "flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className = "text-sm font-medium text-slate-500">Graph canvas</p>
        <p className = "text-xs text-slate-600 max-w-[200px] leading-relaxed">
          Click <span className = "text-slate-400 font-medium">Run Simulation</span> to generate a BFS timeline and begin playback.
        </p>
      </div>
    )
  }

  const HIGHLIGHTED = new Set(['active', 'frontier', 'success', 'source', 'target'])

  return (
    <div className = "flex-1 flex items-center justify-center p-6">
      <svg
        viewBox  = "0 0 340 275"
        className = "w-full"
        style = {{ maxWidth: '340px', maxHeight: '340px' }}
      >
        {/* edges */}
        {DEMO_EDGES.map((e) => {
          const from = NODE_POS[e.source]
          const to = NODE_POS[e.target]
          const key = `${e.source}-${e.target}`
          const keyRev = `${e.target}-${e.source}`
          const state = edgeStates[key] ?? edgeStates[keyRev] ?? 'default'

          return (
            <line
              key = {key}
              x1 = {from.cx}
              y1 = {from.cy}
              x2 = {to.cx}
              y2 = {to.cy}
              stroke = {edgeColor(state)}
              strokeWidth = {state === 'default' ? 1.5 : 2.5}
              strokeLinecap = "round"
              style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
            />
          )
        })}

        {/* Nodes */}
        {DEMO_NODES.map(({ id }) => {
          const { cx, cy } = NODE_POS[id]
          const state = nodeStates[id] ?? 'default'
          const color = stateColor(state)
          const active = HIGHLIGHTED.has(state)

          return (
            <g key = {id} style = {{ transition: 'all 0.2s ease' }}>
              
              {/* Glow for highlighted states */}
              {active && (
                <circle
                  cx = {cx}
                  cy = {cy}
                  r = {20}
                  fill = {color}
                  opacity = {0.12}
                />
              )}

              {/* node background */}
              <circle
                cx = {cx}
                cy = {cy}
                r = {15}
                fill = "rgba(15, 23, 42, 0.92)"
                stroke = {color}
                strokeWidth = {active ? 2.5 : 1.5}
                style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
              />
              {/* Node label */}
              <text
                x = {cx}
                y = {cy}
                textAnchor = "middle"
                dominantBaseline = "central"
                fill = {color}
                fontSize = {12}
                fontFamily = "'IBM Plex Mono', monospace"
                fontWeight = "600"
                style = {{ transition: 'fill 0.2s ease' }}
              >
                {id}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}


export default function GraphLabPage() {
  const {run, isRunning} = useRunSimulation()
  const {clearTimeline, error: timelineError} = usePlaybackStore()
  const {clearRun} = useRunStore()

  const handleRun = useCallback(() => {
    run({
      module_type: 'graph',
      algorithm_key: 'bfs',
      input_payload: {
        nodes: DEMO_NODES,
        edges: DEMO_EDGES,
        source: DEMO_SOURCE,
        target: DEMO_TARGET,
      },
      execution_mode: 'simulate',
      explanation_level: 'standard',
    })
  }, [run])

  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  return (
    <>
      <PageHeader
        icon = {Network}
        title = "Graph Lab"
        description = "BFS demo"
        accent = "brand"
        badge = "Phase 4 Demo"
      />

      <SimulationLayout
        configPanel = {
          <GraphConfig
            onRun = {handleRun}
            onReset = {handleReset}
            isRunning = {isRunning}
            error = {timelineError}
          />
        }
      >
        <GraphCanvas />
      </SimulationLayout>
    </>
  )
}
