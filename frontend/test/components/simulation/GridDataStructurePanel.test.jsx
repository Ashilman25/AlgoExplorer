// frontend/test/components/simulation/GridDataStructurePanel.test.jsx

import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import GridDataStructurePanel from '../../../src/components/simulation/GridDataStructurePanel'
import { usePlaybackStore } from '../../../src/stores/usePlaybackStore'

beforeEach(() => {
  usePlaybackStore.getState().clearTimeline()
})

function setStep(step) {
  usePlaybackStore.setState({
    steps: [step],
    totalSteps: 1,
    stepIndex: 0,
    currentStep: step,
  })
}

describe('GridDataStructurePanel', () => {
  it('renders empty bar when no simulation is running', () => {
    const { container } = render(<GridDataStructurePanel algorithm = "bfs_grid" />)
    expect(container.firstChild).toBeInTheDocument()
    // No data sections visible
    expect(screen.queryByText('Frontier')).not.toBeInTheDocument()
  })

  it('renders frontier cells', () => {
    setStep({
      step_index: 1,
      event_type: 'ENQUEUE',
      state_payload: {
        frontier_cells: [[1, 2], [3, 4], [5, 6]],
        cell_states: {},
      },
    })
    render(<GridDataStructurePanel algorithm = "bfs_grid" />)
    expect(screen.getByText('Frontier')).toBeInTheDocument()
    expect(screen.getByText('(1,2)')).toBeInTheDocument()
    expect(screen.getByText('(3,4)')).toBeInTheDocument()
  })

  it('truncates frontier when more than 15 cells', () => {
    const frontier = Array.from({ length: 25 }, (_, i) => [i, 0])
    setStep({
      step_index: 1,
      event_type: 'ENQUEUE',
      state_payload: { frontier_cells: frontier, cell_states: {} },
    })
    render(<GridDataStructurePanel algorithm = "bfs_grid" />)
    expect(screen.getByText('+13 more')).toBeInTheDocument()
  })

  it('renders distances for dijkstra_grid', () => {
    setStep({
      step_index: 1,
      event_type: 'POP_MIN',
      state_payload: {
        frontier_cells: [],
        cell_states: {},
        distances: { '0,0': 0, '1,0': 1, '2,0': 'inf' },
      },
    })
    render(<GridDataStructurePanel algorithm = "dijkstra_grid" />)
    expect(screen.getByText('Dist')).toBeInTheDocument()
  })

  it('renders heuristic values for astar_grid', () => {
    setStep({
      step_index: 1,
      event_type: 'POP_MIN',
      state_payload: {
        frontier_cells: [],
        cell_states: {},
        distances: { '0,0': 0 },
        heuristic_values: { '0,0': { g: 0, h: 5, f: 5 } },
      },
    })
    render(<GridDataStructurePanel algorithm = "astar_grid" />)
    expect(screen.getByText('f(n)')).toBeInTheDocument()
  })

  it('renders path when found', () => {
    setStep({
      step_index: 2,
      event_type: 'PATH_FOUND',
      state_payload: {
        frontier_cells: [],
        cell_states: {},
        path: [[0, 0], [1, 0], [2, 0]],
      },
    })
    render(<GridDataStructurePanel algorithm = "bfs_grid" />)
    expect(screen.getByText('Path')).toBeInTheDocument()
    expect(screen.getByText('(0,0)')).toBeInTheDocument()
  })

  it('does not render distances for bfs_grid', () => {
    setStep({
      step_index: 1,
      event_type: 'ENQUEUE',
      state_payload: {
        frontier_cells: [[1, 2]],
        cell_states: {},
      },
    })
    render(<GridDataStructurePanel algorithm = "bfs_grid" />)
    expect(screen.queryByText('Dist')).not.toBeInTheDocument()
  })
})
