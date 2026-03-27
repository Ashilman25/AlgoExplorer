import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CommentaryPanel from '../../../src/components/comparison/CommentaryPanel'

const COMMENTARY = {
  summary: "Dijkstra's had 38% fewer nodes visited than BFS (5 vs 8). Overall, Dijkstra's performed better on 2 of 3 metrics.",
  divergences: [
    {
      stepIndex: 1,
      description: "BFS: VISIT_NODE on D | Dijkstra's: VISIT_NODE on F",
      slotIds: ['slot-0', 'slot-1'],
      eventTypes: { 'slot-0': 'VISIT_NODE', 'slot-1': 'VISIT_NODE' },
    },
    {
      stepIndex: 4,
      description: "BFS: ENQUEUE on G | Dijkstra's: RELAX_EDGE on E-G",
      slotIds: ['slot-0', 'slot-1'],
      eventTypes: { 'slot-0': 'ENQUEUE', 'slot-1': 'RELAX_EDGE' },
    },
  ],
}

describe('CommentaryPanel', () => {
  it('renders the summary narrative', () => {
    render(<CommentaryPanel commentary = {COMMENTARY} onJumpToStep = {vi.fn()} />)
    expect(screen.getByText(/Dijkstra's had 38% fewer/)).toBeInTheDocument()
  })

  it('renders divergence entries', () => {
    render(<CommentaryPanel commentary = {COMMENTARY} onJumpToStep = {vi.fn()} />)
    expect(screen.getByText(/Step 2/)).toBeInTheDocument()
    expect(screen.getByText(/Step 5/)).toBeInTheDocument()
  })

  it('calls onJumpToStep when clicking a divergence', () => {
    const onJump = vi.fn()
    render(<CommentaryPanel commentary = {COMMENTARY} onJumpToStep = {onJump} />)
    const jumpButtons = screen.getAllByRole('button', { name: /jump/i })
    fireEvent.click(jumpButtons[0])
    expect(onJump).toHaveBeenCalledWith(1)
  })

  it('renders empty state when no commentary', () => {
    render(<CommentaryPanel commentary = {{ summary: '', divergences: [] }} onJumpToStep = {vi.fn()} />)
    expect(screen.getByText(/no commentary/i)).toBeInTheDocument()
  })
})
