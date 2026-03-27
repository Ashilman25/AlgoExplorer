// frontend/test/components/comparison/SlotPanel.test.jsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SlotPanel from '../../../src/components/comparison/SlotPanel'

const READY_SLOT = {
  id: 'slot-0',
  algorithmKey: 'bfs',
  status: 'ready',
  runId: 1,
  summary: { summary: { nodes_visited: 8 } },
  timeline: [
    { step_index: 0, event_type: 'INITIALIZE', metrics_snapshot: { nodes_visited: 0 }, highlighted_entities: [], explanation: 'Starting BFS' },
    { step_index: 1, event_type: 'VISIT_NODE', metrics_snapshot: { nodes_visited: 3 }, highlighted_entities: [{ id: 'A', state: 'active' }], explanation: 'Visiting A' },
    { step_index: 2, event_type: 'COMPLETE',   metrics_snapshot: { nodes_visited: 8 }, highlighted_entities: [], explanation: 'Done' },
  ],
  error: null,
}

describe('SlotPanel', () => {
  it('renders algorithm name and step counter for a ready slot', () => {
    render(<SlotPanel slot = {READY_SLOT} stepIndex = {1} maxSteps = {3} />)
    expect(screen.getByText('BFS')).toBeInTheDocument()
    expect(screen.getByText('Step 2 / 3')).toBeInTheDocument()
  })

  it('shows "Complete" when stepIndex exceeds slot timeline', () => {
    render(<SlotPanel slot = {READY_SLOT} stepIndex = {5} maxSteps = {6} />)
    expect(screen.getByText(/complete/i)).toBeInTheDocument()
  })

  it('renders error state with error message', () => {
    const errorSlot = { ...READY_SLOT, status: 'error', error: 'Server error' }
    render(<SlotPanel slot = {errorSlot} stepIndex = {0} maxSteps = {3} />)
    expect(screen.getByText('Server error')).toBeInTheDocument()
  })

  it('renders loading state for running status', () => {
    const runningSlot = { ...READY_SLOT, status: 'running' }
    render(<SlotPanel slot = {runningSlot} stepIndex = {0} maxSteps = {0} />)
    expect(screen.getByText(/running/i)).toBeInTheDocument()
  })

  it('displays current step event type and explanation', () => {
    render(<SlotPanel slot = {READY_SLOT} stepIndex = {1} maxSteps = {3} />)
    expect(screen.getByText('VISIT_NODE')).toBeInTheDocument()
    expect(screen.getByText('Visiting A')).toBeInTheDocument()
  })

  it('displays metrics from the current step snapshot', () => {
    render(<SlotPanel slot = {READY_SLOT} stepIndex = {1} maxSteps = {3} />)
    expect(screen.getByText('nodes visited')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
