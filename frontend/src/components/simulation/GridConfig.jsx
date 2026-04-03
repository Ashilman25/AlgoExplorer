// frontend/src/components/simulation/GridConfig.jsx

import { Select, ErrorAlert } from '../ui'
import ConfigPanel, { ConfigSection, ModeToggle } from './ConfigPanel'
import { EXPLANATION_LEVELS } from '../../config/simulationConfig'

const GRID_ALGOS = [
  { value: 'bfs_grid',      label: 'BFS — Breadth-First Search' },
  { value: 'dfs_grid',      label: 'DFS — Depth-First Search' },
  { value: 'dijkstra_grid', label: 'Dijkstra — Shortest Path' },
  { value: 'astar_grid',    label: 'A* — Heuristic Search' },
]

export default function GridConfig({
  algorithm, onAlgorithmChange,
  rows, cols,
  allowDiagonal, onAllowDiagonalChange,
  explanationLevel, onExplanationLevelChange,
  mode, onModeChange,
  error,
}) {
  return (
    <ConfigPanel header = {<ModeToggle mode = {mode} onChange = {onModeChange} />}>

      <ConfigSection title = "Algorithm">
        <Select aria-label = "Algorithm" options = {GRID_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Options">
        <label className = "flex items-center gap-2 cursor-pointer">
          <input
            type = "checkbox"
            checked = {allowDiagonal}
            onChange = {onAllowDiagonalChange}
            aria-label = "Allow diagonal movement"
            className = "accent-brand-500 w-3.5 h-3.5"
          />
          <span className = "text-xs text-slate-400">Allow diagonal movement</span>
        </label>
      </ConfigSection>

      <ConfigSection title = "Explanation">
        <Select aria-label = "Explanation" options = {EXPLANATION_LEVELS} value = {explanationLevel} onChange = {onExplanationLevelChange} />
      </ConfigSection>

      {error && (
        <ConfigSection>
          <ErrorAlert title = "Simulation failed" message = {error} />
        </ConfigSection>
      )}

    </ConfigPanel>
  )
}
