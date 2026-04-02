import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import GridFocusCard from '../../../src/components/simulation/GridFocusCard'
import { usePlaybackStore } from '../../../src/stores/usePlaybackStore'
import { useRunStore } from '../../../src/stores/useRunStore'

beforeEach(() => {
  usePlaybackStore.getState().clearTimeline()
  useRunStore.setState({ runId: null, summary: null, isLoading: false, error: null })
})

function setStep(step, algorithmKey) {
  usePlaybackStore.setState({
    steps: [step],
    totalSteps: 1,
    stepIndex: 0,
    currentStep: step,
  })
  useRunStore.setState({
    runId: 1,
    summary: { algorithm_key: algorithmKey, module_type: 'graph' },
  })
}

describe('GridFocusCard', () => {
  it('returns null when no grid_meta in state_payload', () => {
    setStep({
      step_index: 0,
      event_type: 'RELAX',
      state_payload: { node_states: {} },
      highlighted_entities: [{ id: 'A', state: 'active' }],
      metrics_snapshot: {},
    }, 'dijkstra')
    const { container } = render(<GridFocusCard />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when no timeline is loaded', () => {
    const { container } = render(<GridFocusCard />)
    expect(container.firstChild).toBeNull()
  })

  it('shows active cell badge for BFS grid', () => {
    setStep({
      step_index: 1,
      event_type: 'DEQUEUE',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target', '1,0': 'active' },
        frontier_cells: [[2, 0], [1, 1]],
      },
      highlighted_entities: [
        { id: [1, 0], state: 'active', label: '(1,0)' },
      ],
      metrics_snapshot: { cells_explored: 2, frontier_max_size: 3, path_length: 0, total_steps: 2 },
    }, 'bfs_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('(1,0)')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows frontier count for BFS grid', () => {
    setStep({
      step_index: 1,
      event_type: 'DEQUEUE',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target' },
        frontier_cells: [[2, 0], [1, 1], [0, 1]],
      },
      highlighted_entities: [
        { id: [1, 0], state: 'active', label: '(1,0)' },
      ],
      metrics_snapshot: { cells_explored: 2, frontier_max_size: 3, path_length: 0, total_steps: 2 },
    }, 'bfs_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('Frontier')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows stack depth for DFS grid', () => {
    setStep({
      step_index: 1,
      event_type: 'POP',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target', '1,0': 'active' },
        frontier_cells: [[2, 0]],
      },
      highlighted_entities: [
        { id: [1, 0], state: 'active', label: '(1,0)' },
      ],
      metrics_snapshot: { cells_explored: 2, frontier_max_size: 3, path_length: 0, total_steps: 2, stack_depth: 2 },
    }, 'dfs_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('Stack depth')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows distance to target for Dijkstra grid with known distance', () => {
    setStep({
      step_index: 3,
      event_type: 'POP_MIN',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target', '2,0': 'active' },
        frontier_cells: [[3, 0], [2, 1]],
        distances: { '0,0': 0, '1,0': 1, '2,0': 2, '4,4': 8 },
      },
      highlighted_entities: [
        { id: [2, 0], state: 'active', label: '(2,0)' },
      ],
      metrics_snapshot: { cells_explored: 3, frontier_max_size: 4, path_length: 0, total_steps: 3 },
    }, 'dijkstra_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('Target dist')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows infinity for Dijkstra target distance when target not yet reached', () => {
    setStep({
      step_index: 1,
      event_type: 'POP_MIN',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target', '1,0': 'active' },
        frontier_cells: [[2, 0]],
        distances: { '0,0': 0, '1,0': 1 },
      },
      highlighted_entities: [
        { id: [1, 0], state: 'active', label: '(1,0)' },
      ],
      metrics_snapshot: { cells_explored: 2, frontier_max_size: 3, path_length: 0, total_steps: 2 },
    }, 'dijkstra_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('Target dist')).toBeInTheDocument()
    expect(screen.getByText('\u221e')).toBeInTheDocument()
  })

  it('shows g/h/f breakdown for A* grid', () => {
    setStep({
      step_index: 2,
      event_type: 'POP_MIN',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target', '1,0': 'active' },
        frontier_cells: [[2, 0], [1, 1]],
        distances: { '0,0': 0, '1,0': 1, '4,4': 'inf' },
        heuristic_values: { '0,0': { g: 0, h: 8, f: 8 }, '1,0': { g: 1, h: 7, f: 8 } },
      },
      highlighted_entities: [
        { id: [1, 0], state: 'active', label: '(1,0)' },
      ],
      metrics_snapshot: { cells_explored: 2, frontier_max_size: 3, path_length: 0, total_steps: 2 },
    }, 'astar_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('g')).toBeInTheDocument()
    expect(screen.getByText('h')).toBeInTheDocument()
    expect(screen.getByText('f')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows target distance for A* grid', () => {
    setStep({
      step_index: 2,
      event_type: 'POP_MIN',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'source', '4,4': 'target', '1,0': 'active' },
        frontier_cells: [[2, 0]],
        distances: { '0,0': 0, '1,0': 1, '4,4': 12 },
        heuristic_values: { '0,0': { g: 0, h: 8, f: 8 }, '1,0': { g: 1, h: 7, f: 8 } },
      },
      highlighted_entities: [
        { id: [1, 0], state: 'active', label: '(1,0)' },
      ],
      metrics_snapshot: { cells_explored: 2, frontier_max_size: 3, path_length: 0, total_steps: 2 },
    }, 'astar_grid')
    render(<GridFocusCard />)
    expect(screen.getByText('Target dist')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('omits active cell row when no active entity in step', () => {
    setStep({
      step_index: 10,
      event_type: 'COMPLETE',
      state_payload: {
        grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        cell_states: { '0,0': 'visited', '4,4': 'visited' },
        frontier_cells: [],
      },
      highlighted_entities: [],
      metrics_snapshot: { cells_explored: 25, frontier_max_size: 8, path_length: 0, total_steps: 30 },
    }, 'bfs_grid')
    render(<GridFocusCard />)
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })
})
