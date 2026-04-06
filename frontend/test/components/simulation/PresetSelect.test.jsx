import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PresetSelect from '../../../src/components/simulation/PresetSelect'

const CATEGORY_MAP = {
  bfs: 'pathfinding', dfs: 'pathfinding', dijkstra: 'pathfinding',
  astar: 'pathfinding', bellman_ford: 'pathfinding',
  prims: 'mst', kruskals: 'mst',
  topological_sort: 'ordering',
}

const MOCK_PRESETS = [
  { key: 'simple-traversal', label: 'Simple Traversal — 6 nodes', designed_for: ['bfs', 'dfs'], input_payload: {} },
  { key: 'weighted-diamond', label: 'Weighted Diamond — 5 nodes', designed_for: ['dijkstra', 'bellman_ford'], input_payload: {} },
  { key: 'astar-coords', label: 'A* with Coordinates — 6 nodes', designed_for: ['astar'], input_payload: {} },
  { key: 'neg-weight', label: 'Negative Weights — 5 nodes', designed_for: ['bellman_ford'], input_payload: {} },
  { key: 'connected-weighted', label: 'Connected Weighted — 6 nodes', designed_for: ['prims', 'kruskals'], input_payload: {} },
  { key: 'dag-prereqs', label: 'DAG — Course Prerequisites', designed_for: ['topological_sort'], input_payload: {} },
]

function renderPresetSelect(props = {}) {
  const defaults = {
    presets: MOCK_PRESETS,
    value: '',
    onChange: vi.fn(),
    algorithm: 'bfs',
    categoryMap: CATEGORY_MAP,
    onAlgorithmSwitch: vi.fn(),
  }
  return { ...render(<PresetSelect {...defaults} {...props} />), ...defaults, ...props }
}

describe('PresetSelect', () => {
  it('renders trigger button with placeholder when no value', () => {
    renderPresetSelect()
    expect(screen.getByRole('button', { name: /preset/i })).toHaveTextContent(/select a preset/i)
  })

  it('renders trigger button with preset label when value is set', () => {
    renderPresetSelect({ value: 'simple-traversal' })
    expect(screen.getByRole('button', { name: /preset/i })).toHaveTextContent('Simple Traversal — 6 nodes')
  })

  it('opens dropdown on click and shows all presets', () => {
    renderPresetSelect()
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    expect(screen.getByText('Simple Traversal — 6 nodes')).toBeInTheDocument()
    expect(screen.getByText('Weighted Diamond — 5 nodes')).toBeInTheDocument()
    expect(screen.getByText('Connected Weighted — 6 nodes')).toBeInTheDocument()
    expect(screen.getByText('DAG — Course Prerequisites')).toBeInTheDocument()
  })

  it('shows category group headers', () => {
    renderPresetSelect()
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    expect(screen.getByText('Pathfinding')).toBeInTheDocument()
    expect(screen.getByText('Minimum Spanning Tree')).toBeInTheDocument()
    expect(screen.getByText('Ordering')).toBeInTheDocument()
  })

  it('shows algorithm tags on preset items', () => {
    renderPresetSelect()
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    expect(screen.getByText('BFS')).toBeInTheDocument()
    expect(screen.getByText('DFS')).toBeInTheDocument()
  })

  it('calls onChange when clicking a matching preset', () => {
    const onChange = vi.fn()
    renderPresetSelect({ onChange, algorithm: 'bfs' })
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    fireEvent.click(screen.getByText('Simple Traversal — 6 nodes'))
    expect(onChange).toHaveBeenCalledWith('simple-traversal')
  })

  it('calls onAlgorithmSwitch then onChange when clicking a non-matching preset', () => {
    const onChange = vi.fn()
    const onAlgorithmSwitch = vi.fn()
    renderPresetSelect({ onChange, onAlgorithmSwitch, algorithm: 'bfs' })
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    fireEvent.click(screen.getByText('Connected Weighted — 6 nodes'))
    expect(onAlgorithmSwitch).toHaveBeenCalledWith('prims')
    expect(onChange).toHaveBeenCalledWith('connected-weighted')
  })

  it('does not call onAlgorithmSwitch when clicking a matching preset', () => {
    const onAlgorithmSwitch = vi.fn()
    renderPresetSelect({ onAlgorithmSwitch, algorithm: 'bfs' })
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    fireEvent.click(screen.getByText('Simple Traversal — 6 nodes'))
    expect(onAlgorithmSwitch).not.toHaveBeenCalled()
  })

  it('closes dropdown after selection', () => {
    renderPresetSelect()
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    expect(screen.getByText('Pathfinding')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Simple Traversal — 6 nodes'))
    expect(screen.queryByText('Pathfinding')).not.toBeInTheDocument()
  })

  it('closes dropdown on Escape', () => {
    renderPresetSelect()
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    expect(screen.getByText('Pathfinding')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('button', { name: /preset/i }), { key: 'Escape' })
    expect(screen.queryByText('Pathfinding')).not.toBeInTheDocument()
  })

  it('renders with empty presets without crashing', () => {
    renderPresetSelect({ presets: [] })
    fireEvent.click(screen.getByRole('button', { name: /preset/i }))
    expect(screen.queryByText('Pathfinding')).not.toBeInTheDocument()
  })
})
