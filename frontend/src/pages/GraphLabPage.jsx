import { Network, Play } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, Slider } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'

const GRAPH_ALGOS = [
  {value: 'bfs', label: 'BFS' },
  {value: 'dijkstra', label: "Dijkstra's"},
]

const GRAPH_PRESETS = [
  {value: 'random_sparse', label: 'Random Sparse'},
  {value: 'random_dense', label: 'Random Dense'},
  {value: 'grid', label: 'Grid'},
  {value: 'custom', label: 'Custom (draw)'},
]

const NODE_OPTS = [{ value: '', label: 'Select…' }]

const GRAPH_METRICS = [
  { label: 'Nodes visited', value: '—' },
  { label: 'Steps total', value: '—' },
  { label: 'Path length', value: '—' },
]

function GraphConfig() {
  return (
    <ConfigPanel title = "Graph Lab">

      <ConfigSection title = "Algorithm">
        <Select options = {GRAPH_ALGOS} />
      </ConfigSection>

      <ConfigSection title = "Graph">
        <Select label = "Preset" options = {GRAPH_PRESETS} />

        <Slider
          label = "Node Count"
          min = {4} max = {30} step = {1}
          value = {10}
          formatValue = {(v) => `${v} nodes`}
        />
      </ConfigSection>

      <ConfigSection title = "Endpoints">
        <Select label = "Source Node" options = {NODE_OPTS} />
        <Select label = "Target Node" options = {NODE_OPTS} />
      </ConfigSection>

      <ConfigSection>
        <Button variant = "primary" size = "md" icon = {Play} className = "w-full">
          Run Simulation
        </Button>

        <Button variant = "ghost" size = "md" className = "w-full text-slate-500">
          Reset Graph
        </Button>
      </ConfigSection>

    </ConfigPanel>
  )
}

export default function GraphLabPage() {
  return (
    <>
      <PageHeader
        icon = {Network}
        title = "Graph Lab"
        description = "Visualize BFS and Dijkstra's algorithm executing step by step on an interactive graph canvas."
        accent = "brand"
        badge = "Phase 5"
      />

      <SimulationLayout configPanel = {<GraphConfig />} metrics = {GRAPH_METRICS}>

        <div className = "flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className = "text-sm font-medium text-slate-500">
            Graph canvas — nodes and edges render here
          </p>

          <p className = "text-xs text-slate-600 max-w-xs leading-relaxed">
            Build your graph, set source and target, then run the simulation.
          </p>

          <div className = "flex gap-2 mt-1">
            {['BFS', 'Dijkstra'].map((alg) => (
              <span
                key = {alg}
                className = "text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-white/[0.06]"
              >
                {alg}
              </span>
            ))}
          </div>
        </div>
      </SimulationLayout>
    </>
  )
}
