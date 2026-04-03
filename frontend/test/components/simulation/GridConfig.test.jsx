// frontend/test/components/simulation/GridConfig.test.jsx

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GridConfig from '../../../src/components/simulation/GridConfig'

const defaultProps = {
  algorithm: 'bfs_grid',
  onAlgorithmChange: vi.fn(),
  rows: 20,
  cols: 30,
  allowDiagonal: false,
  onAllowDiagonalChange: vi.fn(),
  explanationLevel: 'standard',
  onExplanationLevelChange: vi.fn(),
  mode: 'grid',
  onModeChange: vi.fn(),
  error: null,
}

function renderConfig(overrides = {}) {
  return render(<GridConfig {...defaultProps} {...overrides} />)
}

describe('GridConfig', () => {
  it('renders the mode toggle', () => {
    renderConfig()
    expect(screen.getByRole('button', { name: 'Graph' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grid' })).toBeInTheDocument()
  })

  it('renders mode toggle with grid active', () => {
    renderConfig()
    const gridBtn = screen.getByRole('button', { name: 'Grid' })
    const graphBtn = screen.getByRole('button', { name: 'Graph' })
    expect(gridBtn).toBeInTheDocument()
    expect(graphBtn).toBeInTheDocument()
  })

  it('renders algorithm selector with grid algorithms', () => {
    renderConfig()
    const algoSelect = screen.getByLabelText('Algorithm')
    expect(algoSelect.value).toBe('bfs_grid')
    expect(screen.getByText('BFS — Breadth-First Search')).toBeInTheDocument()
    expect(screen.getByText('DFS — Depth-First Search')).toBeInTheDocument()
    expect(screen.getByText('Dijkstra — Shortest Path')).toBeInTheDocument()
    expect(screen.getByText('A* — Heuristic Search')).toBeInTheDocument()
  })

  it('does not render grid size slider', () => {
    renderConfig()
    expect(screen.queryByLabelText('Grid size')).not.toBeInTheDocument()
    expect(screen.queryByText('Grid Size')).not.toBeInTheDocument()
  })

  it('renders diagonal checkbox', () => {
    renderConfig()
    expect(screen.getByLabelText(/diagonal/i)).toBeInTheDocument()
  })

  it('shows error alert when error is set', () => {
    renderConfig({ error: 'Something went wrong' })
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

})
