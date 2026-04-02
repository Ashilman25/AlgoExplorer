// frontend/src/components/simulation/GridConfig.jsx

import { Play, RotateCcw, Save } from 'lucide-react'
import { Button, Select, ErrorAlert } from '../ui'
import ConfigPanel, { ConfigSection } from './ConfigPanel'
import { EXPLANATION_LEVELS, MODE_OPTIONS } from '../../config/simulationConfig'

const GRID_ALGOS = [
  { value: 'bfs_grid',      label: 'BFS — Breadth-First Search' },
  { value: 'dfs_grid',      label: 'DFS — Depth-First Search' },
  { value: 'dijkstra_grid', label: 'Dijkstra — Shortest Path' },
  { value: 'astar_grid',    label: 'A* — Heuristic Search' },
]

const MAZE_OPTIONS = [
  { value: 'none',        label: 'None' },
  { value: 'backtracker', label: 'Recursive Backtracker' },
  { value: 'scatter',     label: 'Random Scatter' },
]

export default function GridConfig({
  algorithm, onAlgorithmChange,
  gridSize, onGridSizeChange,
  mazeType, onMazeTypeChange,
  density, onDensityChange,
  allowDiagonal, onAllowDiagonalChange,
  explanationLevel, onExplanationLevelChange,
  mode, onModeChange,
  onRun, onReset, onSave,
  isRunning, error,
  canRun,
}) {
  return (
    <ConfigPanel title = "Grid Lab">

      <ConfigSection title = "Mode">
        <Select aria-label = "Mode" options = {MODE_OPTIONS} value = {mode} onChange = {onModeChange} />
      </ConfigSection>

      <ConfigSection title = "Algorithm">
        <Select aria-label = "Algorithm" options = {GRID_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Grid Size">
        <div className = "space-y-1.5">
          <input
            type = "range"
            min = {5}
            max = {50}
            value = {gridSize}
            onChange = {onGridSizeChange}
            aria-label = "Grid size"
            className = "w-full accent-brand-500 h-1.5 rounded-full bg-slate-700 cursor-pointer"
          />
          <p className = "font-mono text-xs text-slate-400 text-center">{gridSize} × {gridSize}</p>
        </div>
      </ConfigSection>

      <ConfigSection title = "Maze Generation">
        <Select aria-label = "Maze" options = {MAZE_OPTIONS} value = {mazeType} onChange = {onMazeTypeChange} />
        {mazeType === 'scatter' && (
          <div className = "space-y-1.5 mt-2">
            <input
              type = "range"
              min = {10}
              max = {40}
              value = {Math.round(density * 100)}
              onChange = {onDensityChange}
              aria-label = "Density"
              className = "w-full accent-brand-500 h-1.5 rounded-full bg-slate-700 cursor-pointer"
            />
            <p className = "font-mono text-xs text-slate-400 text-center">{Math.round(density * 100)}%</p>
          </div>
        )}
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

      <ConfigSection title = "Input Summary">
        <div className = "rounded-lg bg-slate-800/50 border border-white/[0.06] px-3 py-2.5 space-y-1">
          <p className = "text-xs font-medium text-slate-300">
            {gridSize} × {gridSize} grid
          </p>
          <p className = "font-mono text-[10px] text-slate-500">
            {allowDiagonal ? '8-dir' : '4-dir'}
          </p>
        </div>
      </ConfigSection>

      {error && (
        <ConfigSection>
          <ErrorAlert title = "Simulation failed" message = {error} />
        </ConfigSection>
      )}

      <ConfigSection>
        <Button
          variant = "primary"
          size = "md"
          icon = {Play}
          className = "w-full"
          onClick = {onRun}
          disabled = {!canRun || isRunning}
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
