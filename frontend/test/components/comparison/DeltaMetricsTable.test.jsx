import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DeltaMetricsTable from '../../../src/components/comparison/DeltaMetricsTable'

const SLOTS = [
  { id: 'slot-0', algorithmKey: 'bfs' },
  { id: 'slot-1', algorithmKey: 'dijkstra' },
]

const DELTA_METRICS = {
  metrics: [
    {
      key: 'nodes_visited', label: 'Nodes Visited', polarity: 'lower',
      values: { 'slot-0': 12, 'slot-1': 8 },
      best: 'slot-1', deltas: { 'slot-0': 4, 'slot-1': 0 },
    },
    {
      key: 'path_cost', label: 'Path Cost', polarity: 'lower',
      values: { 'slot-0': 5, 'slot-1': 4 },
      best: 'slot-1', deltas: { 'slot-0': 1, 'slot-1': 0 },
    },
  ],
}

describe('DeltaMetricsTable', () => {
  it('renders metric labels as row headers', () => {
    render(<DeltaMetricsTable slots = {SLOTS} deltaMetrics = {DELTA_METRICS} />)
    expect(screen.getByText('Nodes Visited')).toBeInTheDocument()
    expect(screen.getByText('Path Cost')).toBeInTheDocument()
  })

  it('renders algorithm names as column headers', () => {
    render(<DeltaMetricsTable slots = {SLOTS} deltaMetrics = {DELTA_METRICS} />)
    expect(screen.getByText('BFS')).toBeInTheDocument()
    expect(screen.getByText("Dijkstra's")).toBeInTheDocument()
  })

  it('renders values for each slot', () => {
    render(<DeltaMetricsTable slots = {SLOTS} deltaMetrics = {DELTA_METRICS} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows delta indicator for non-best values', () => {
    render(<DeltaMetricsTable slots = {SLOTS} deltaMetrics = {DELTA_METRICS} />)
    expect(screen.getByText('+4')).toBeInTheDocument()
  })

  it('renders empty state when no metrics', () => {
    render(<DeltaMetricsTable slots = {SLOTS} deltaMetrics = {{ metrics: [] }} />)
    expect(screen.getByText(/no metrics/i)).toBeInTheDocument()
  })
})
