// frontend/test/components/simulation/GridConfig.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GridConfig from '../../../src/components/simulation/GridConfig'

const defaultProps = {
  algorithm: 'bfs_grid',
  onAlgorithmChange: vi.fn(),
  gridSize: 20,
  onGridSizeChange: vi.fn(),
  mazeType: 'none',
  onMazeTypeChange: vi.fn(),
  density: 0.25,
  onDensityChange: vi.fn(),
  allowDiagonal: false,
  onAllowDiagonalChange: vi.fn(),
  explanationLevel: 'standard',
  onExplanationLevelChange: vi.fn(),
  mode: 'grid',
  onModeChange: vi.fn(),
  onRun: vi.fn(),
  onReset: vi.fn(),
  onSave: vi.fn(),
  isRunning: false,
  error: null,
  canRun: true,
}

function renderConfig(overrides = {}) {
  return render(<GridConfig {...defaultProps} {...overrides} />)
}

describe('GridConfig', () => {
  it('renders the panel title', () => {
    renderConfig()
    expect(screen.getByText('Grid Lab')).toBeInTheDocument()
  })

  it('renders mode selector with grid selected', () => {
    renderConfig()
    const modeSelect = screen.getByLabelText('Mode')
    expect(modeSelect.value).toBe('grid')
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

  it('renders grid size slider showing current value', () => {
    renderConfig({ gridSize: 30 })
    expect(screen.getByText('30 × 30')).toBeInTheDocument()
  })

  it('renders maze generation dropdown', () => {
    renderConfig()
    const mazeSelect = screen.getByLabelText('Maze')
    expect(mazeSelect.value).toBe('none')
  })

  it('shows density slider only when maze type is scatter', () => {
    const { rerender } = render(<GridConfig {...defaultProps} mazeType="none" />)
    expect(screen.queryByLabelText('Density')).not.toBeInTheDocument()

    rerender(<GridConfig {...defaultProps} mazeType="scatter" />)
    expect(screen.getByLabelText('Density')).toBeInTheDocument()
  })

  it('renders diagonal checkbox', () => {
    renderConfig()
    expect(screen.getByLabelText(/diagonal/i)).toBeInTheDocument()
  })

  it('disables run button when canRun is false', () => {
    renderConfig({ canRun: false })
    expect(screen.getByRole('button', { name: /run/i })).toBeDisabled()
  })

  it('disables run button when isRunning is true', () => {
    renderConfig({ isRunning: true })
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled()
  })

  it('shows error alert when error is set', () => {
    renderConfig({ error: 'Something went wrong' })
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders input summary with grid info', () => {
    renderConfig({ gridSize: 15, allowDiagonal: true })
    expect(screen.getByText('15 × 15 grid')).toBeInTheDocument()
    expect(screen.getByText('8-dir')).toBeInTheDocument()
  })

  it('calls onRun when run button clicked', () => {
    const onRun = vi.fn()
    renderConfig({ onRun })
    fireEvent.click(screen.getByRole('button', { name: /run/i }))
    expect(onRun).toHaveBeenCalledOnce()
  })
})
