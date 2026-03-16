import { useCallback, useState, useMemo } from 'react'
import { Network, Play, RotateCcw, Save } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'


const GRAPH_PRESETS = [
  {
    value: 'bfs-demo',
    label: 'BFS Demo — 6 nodes',
    nodes: [{id:'A'},{id:'B'},{id:'C'},{id:'D'},{id:'E'},{id:'F'}],
    edges: [
      {source:'A',target:'B'},{source:'A',target:'C'},
      {source:'B',target:'D'},{source:'C',target:'E'},
      {source:'D',target:'F'},{source:'E',target:'F'},
    ],
    source: 'A',
    target: 'F',
    weighted: false,
  },
  {
    value: 'weighted-diamond',
    label: 'Weighted Diamond — 5 nodes',
    nodes: [{id:'S'},{id:'A'},{id:'B'},{id:'C'},{id:'T'}],
    edges: [
      {source:'S',target:'A',weight:1},{source:'S',target:'B',weight:4},
      {source:'A',target:'C',weight:2},{source:'B',target:'C',weight:1},
      {source:'C',target:'T',weight:3},{source:'A',target:'B',weight:2},
    ],
    source: 'S',
    target: 'T',
    weighted: true,
  },
  {
    value: 'weighted-grid',
    label: 'Weighted 4x4 Grid — 8 nodes',
    nodes: [{id:'1'},{id:'2'},{id:'3'},{id:'4'},{id:'5'},{id:'6'},{id:'7'},{id:'8'}],
    edges:  [
      {source:'1',target:'2',weight:2},{source:'1',target:'3',weight:5},
      {source:'2',target:'4',weight:3},{source:'2',target:'5',weight:1},
      {source:'3',target:'5',weight:2},{source:'3',target:'6',weight:4},
      {source:'4',target:'7',weight:1},{source:'5',target:'7',weight:6},
      {source:'5',target:'8',weight:3},{source:'6',target:'8',weight:2},
      {source:'7',target:'8',weight:1},
    ],
    source: '1',
    target: '8',
    weighted: true,
  },
]

const GRAPH_ALGOS = [
  { value: 'bfs',      label: 'BFS — Breadth-First Search' },
  { value: 'dijkstra',  label: 'Dijkstra — Shortest Path' },
]

const EXPLANATION_LEVELS = [
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'none',     label: 'None' },
]

const MODE_OPTIONS = [
  { value: 'graph', label: 'Graph' },
  { value: 'grid',  label: 'Grid', disabled: true },
]


function GraphConfig({
  algorithm, onAlgorithmChange,
  preset, onPresetChange,
  source, onSourceChange,
  target, onTargetChange,
  weighted, onWeightedChange,
  directed, onDirectedChange,
  explanationLevel, onExplanationLevelChange,
  mode, onModeChange,
  nodeOptions,
  onRun, onReset, onSave,
  isRunning, error,
}) {
  return (
    <ConfigPanel title = "Graph Lab">

      <ConfigSection title = "Mode">
        <Select options = {MODE_OPTIONS} value = {mode} onChange = {onModeChange} />
      </ConfigSection>

      <ConfigSection title = "Algorithm">
        <Select options = {GRAPH_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Preset">
        <Select
          options = {GRAPH_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          value = {preset}
          onChange = {onPresetChange}
        />
      </ConfigSection>

      <ConfigSection title = "Source / Target">
        <div className = "grid grid-cols-2 gap-2">
          <Select label = "Source" options = {nodeOptions} value = {source} onChange = {onSourceChange} />
          <Select label = "Target" options = {nodeOptions} value = {target} onChange = {onTargetChange} />
        </div>
      </ConfigSection>

      <ConfigSection title = "Options">
        <label className = "flex items-center gap-2 cursor-pointer">
          <input
            type = "checkbox"
            checked = {weighted}
            onChange = {onWeightedChange}
            className = "accent-brand-500 w-3.5 h-3.5"
          />
          <span className = "text-xs text-slate-400">Weighted edges</span>
        </label>

        <label className = "flex items-center gap-2 cursor-pointer">
          <input
            type = "checkbox"
            checked = {directed}
            onChange = {onDirectedChange}
            className = "accent-brand-500 w-3.5 h-3.5"
          />
          <span className = "text-xs text-slate-400">Directed graph</span>
        </label>
      </ConfigSection>

      <ConfigSection title = "Explanation">
        <Select options = {EXPLANATION_LEVELS} value = {explanationLevel} onChange = {onExplanationLevelChange} />
      </ConfigSection>

      <ConfigSection title = "Input Summary">
        <div className = "rounded-lg bg-slate-800/50 border border-white/[0.06] px-3 py-2.5 space-y-1">
          <p className = "text-xs font-medium text-slate-300">
            {GRAPH_PRESETS.find((p) => p.value === preset)?.label ?? 'Custom'}
          </p>

          <p className = "font-mono text-[10px] text-slate-500">
            {nodeOptions.length} nodes · {GRAPH_PRESETS.find((p) => p.value === preset)?.edges.length ?? 0} edges
            {weighted ? ' · weighted' : ''}
            {directed ? ' · directed' : ''}
          </p>
          
          <p className = "font-mono text-[10px] text-slate-500">
            Source: <span className = "text-state-source">{source}</span>
            {'  '}Target: <span className = "text-state-target">{target}</span>
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
          icon = {Save}
          className = "w-full text-slate-500"
          onClick = {onSave}
          disabled = {isRunning}
        >
          Save Scenario
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



function computeNodePositions(nodes) {
  const cx = 170
  const cy = 140
  const r = 110

  const positions = {}
  const count = nodes.length

  if (count === 1) {
    positions[String(nodes[0].id)] = { cx, cy }
    return positions
  }

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    positions[String(n.id)] = {
      cx: Math.round(cx + r * Math.cos(angle)),
      cy: Math.round(cy + r * Math.sin(angle)),
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

function GraphCanvas({nodes, edges, weighted}) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isLoading = usePlaybackStore((s) => s.isLoading)
  const error = usePlaybackStore((s) => s.error)

  const nodeStates = currentStep?.state_payload?.node_states ?? {}
  const edgeStates = currentStep?.state_payload?.edge_states ?? {}

  const nodePos = useMemo(() => computeNodePositions(nodes), [nodes])

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
          Click <span className = "text-slate-400 font-medium">Run Simulation</span> to begin playback.
        </p>
      </div>
    )
  }

  const HIGHLIGHTED = new Set(['active', 'frontier', 'success', 'source', 'target'])

  return (
    <div className = "flex-1 flex items-center justify-center p-6">
      <svg
        viewBox   = "0 0 340 280"
        className = "w-full"
        style = {{ maxWidth: '400px', maxHeight: '400px' }}
      >
        {/* edges */}
        {edges.map((e) => {
          const src = String(e.source)
          const tgt = String(e.target)

          const from = nodePos[src]
          const to = nodePos[tgt]

          if (!from || !to) return null

          const key = `${src}-${tgt}`
          const keyRev = `${tgt}-${src}`
          const state = edgeStates[key] ?? edgeStates[keyRev] ?? 'default'

          // midpoint for weight label
          const mx = (from.cx + to.cx) / 2
          const my = (from.cy + to.cy) / 2

          return (
            <g key = {key}>
              <line
                x1 = {from.cx}
                y1 = {from.cy}
                x2 = {to.cx}
                y2 = {to.cy}
                stroke = {edgeColor(state)}
                strokeWidth = {state === 'default' ? 1.5 : 2.5}
                strokeLinecap = "round"
                style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
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

          const {cx, cy} = pos
          const state = nodeStates[nid] ?? 'default'
          const color = stateColor(state)
          const active = HIGHLIGHTED.has(state)

          return (
            <g key = {nid} style = {{ transition: 'all 0.2s ease' }}>

              {active && (
                <circle cx = {cx} cy = {cy} r = {20} fill = {color} opacity = {0.12} />
              )}

              <circle
                cx = {cx}
                cy = {cy}
                r = {15}
                fill = "rgba(15, 23, 42, 0.92)"
                stroke = {color}
                strokeWidth = {active ? 2.5 : 1.5}
                style = {{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
              />

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
                {nid}
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
  const {saveScenario} = useGuestStore()

  // ── Config state ───────────────────────────────────────────────────────────
  const [algorithm, setAlgorithm]             = useState('bfs')
  const [presetKey, setPresetKey]             = useState('bfs-demo')
  const [source, setSource]                   = useState(GRAPH_PRESETS[0].source)
  const [target, setTarget]                   = useState(GRAPH_PRESETS[0].target)
  const [weighted, setWeighted]               = useState(false)
  const [directed, setDirected]               = useState(false)
  const [explanationLevel, setExplanationLevel] = useState('standard')
  const [mode, setMode]                       = useState('graph')

  const currentPreset = GRAPH_PRESETS.find((p) => p.value === presetKey) ?? GRAPH_PRESETS[0]

  const nodeOptions = useMemo(
    () => currentPreset.nodes.map((n) => ({ value: String(n.id), label: String(n.id) })),
    [currentPreset],
  )

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePresetChange = useCallback((e) => {
    const key = e.target.value
    setPresetKey(key)
    const p = GRAPH_PRESETS.find((pr) => pr.value === key)
    if (p) {
      setSource(String(p.source))
      setTarget(String(p.target))
      setWeighted(p.weighted)
    }
  }, [])

  const handleRun = useCallback(() => {
    run({
      module_type:       'graph',
      algorithm_key:     algorithm,
      input_payload:     {
        nodes:    currentPreset.nodes,
        edges:    currentPreset.edges,
        source,
        target,
        weighted,
        directed,
        mode,
      },
      execution_mode:    'simulate',
      explanation_level: explanationLevel,
    })
  }, [run, algorithm, currentPreset, source, target, weighted, directed, mode, explanationLevel])

  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleSave = useCallback(() => {
    const id = `graph-${Date.now()}`
    saveScenario({
      id,
      name:          `${currentPreset.label} — ${algorithm.toUpperCase()}`,
      module_type:   'graph',
      algorithm_key: algorithm,
      input_payload: {
        nodes:    currentPreset.nodes,
        edges:    currentPreset.edges,
        source,
        target,
        weighted,
        directed,
        mode,
      },
      created_at: new Date().toISOString(),
    })
  }, [saveScenario, currentPreset, algorithm, source, target, weighted, directed, mode])

  return (
    <>
      <PageHeader
        icon        = {Network}
        title       = "Graph Lab"
        description = "Interactive graph traversal and pathfinding simulations."
        accent      = "brand"
        badge       = "Phase 5"
      />

      <SimulationLayout
        configPanel = {
          <GraphConfig
            algorithm        = {algorithm}
            onAlgorithmChange = {(e) => setAlgorithm(e.target.value)}
            preset           = {presetKey}
            onPresetChange   = {handlePresetChange}
            source           = {source}
            onSourceChange   = {(e) => setSource(e.target.value)}
            target           = {target}
            onTargetChange   = {(e) => setTarget(e.target.value)}
            weighted         = {weighted}
            onWeightedChange = {(e) => setWeighted(e.target.checked)}
            directed         = {directed}
            onDirectedChange = {(e) => setDirected(e.target.checked)}
            explanationLevel = {explanationLevel}
            onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
            mode             = {mode}
            onModeChange     = {(e) => setMode(e.target.value)}
            nodeOptions      = {nodeOptions}
            onRun            = {handleRun}
            onReset          = {handleReset}
            onSave           = {handleSave}
            isRunning        = {isRunning}
            error            = {timelineError}
          />
        }
      >
        <GraphCanvas nodes = {currentPreset.nodes} edges = {currentPreset.edges} weighted = {weighted} />
      </SimulationLayout>
    </>
  )
}
