import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PseudocodeView from '../../../src/components/simulation/PseudocodeView'

const MOCK_LINES = [
  'BFS(graph, source, target):',
  '  queue <- [source]',
  '  visited <- {source}',
  '  while queue is not empty:',
  '    node <- queue.dequeue()',
]

describe('PseudocodeView', () => {
  it('renders all pseudocode lines with line numbers', () => {
    render(<PseudocodeView lines={MOCK_LINES} activeLines={[]} />)

    expect(screen.getByText('BFS(graph, source, target):')).toBeInTheDocument()
    expect(screen.getByText('queue <- [source]')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('highlights active lines with the active data attribute', () => {
    const { container } = render(
      <PseudocodeView lines={MOCK_LINES} activeLines={[0, 1]} />
    )

    const activeDivs = container.querySelectorAll('[data-active="true"]')
    expect(activeDivs).toHaveLength(2)
  })

  it('renders no active lines when activeLines is empty', () => {
    const { container } = render(
      <PseudocodeView lines={MOCK_LINES} activeLines={[]} />
    )

    const activeDivs = container.querySelectorAll('[data-active="true"]')
    expect(activeDivs).toHaveLength(0)
  })

  it('renders empty state when lines array is empty', () => {
    render(<PseudocodeView lines={[]} activeLines={[]} />)

    expect(screen.getByText(/no pseudocode/i)).toBeInTheDocument()
  })

  it('renders a copy button', () => {
    render(<PseudocodeView lines={MOCK_LINES} activeLines={[]} />)

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })
})
