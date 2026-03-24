import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DpDataPanel } from '../../src/pages/DpLabPage'
import { DataStructurePanel } from '../../src/pages/GraphLabPage'
import { SortingDataPanel } from '../../src/pages/SortingLabPage'

describe('module metrics panels', () => {
  it('renders an empty graph data panel when there is no queue, distance map, or path', () => {
    const { container } = render(
      <DataStructurePanel algorithm="bfs" frontier={[]} distances={null} path={null} />,
    )

    expect(screen.queryByText('Queue')).not.toBeInTheDocument()
    expect(screen.queryByText('Dist')).not.toBeInTheDocument()
    expect(screen.queryByText('Path')).not.toBeInTheDocument()
    expect(container.firstChild).toHaveClass('min-h-[40px]')
  })

  it('renders queue and final path details for BFS', () => {
    render(
      <DataStructurePanel
        algorithm="bfs"
        frontier={['A', 'B']}
        distances={null}
        path={['A', 'C', 'F']}
      />,
    )

    expect(screen.getByText('Queue')).toBeInTheDocument()
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('Path')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('F')).toBeInTheDocument()
  })

  it('renders the Dijkstra distance map including infinite distances', () => {
    render(
      <DataStructurePanel
        algorithm="dijkstra"
        frontier={[]}
        distances={{ S: 0, A: 2, T: 'inf' }}
        path={null}
      />,
    )

    expect(screen.getByText('Dist')).toBeInTheDocument()
    expect(screen.getByText(/S:/)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('inf')).toBeInTheDocument()
  })

  it('renders an empty sorting data panel when there are no active metrics', () => {
    const { container } = render(
      <SortingDataPanel comparing={[]} swapping={[]} pivotIndex={null} displayArray={[3, 1, 2]} />,
    )

    expect(screen.queryByText('Pivot')).not.toBeInTheDocument()
    expect(screen.queryByText('Compare')).not.toBeInTheDocument()
    expect(screen.queryByText('Swap')).not.toBeInTheDocument()
    expect(container.firstChild).toHaveClass('min-h-[40px]')
  })

  it('renders sorting pivot, comparison, and swap details when present', () => {
    render(
      <SortingDataPanel
        comparing={[0, 2]}
        swapping={[1, 2]}
        pivotIndex={1}
        displayArray={[5, 3, 8]}
      />,
    )

    expect(screen.getByText('Pivot')).toBeInTheDocument()
    expect(screen.getAllByText('[1] = 3')).toHaveLength(2)
    expect(screen.getByText('Compare')).toBeInTheDocument()
    expect(screen.getByText('[0] = 5')).toBeInTheDocument()
    expect(screen.getAllByText('[2] = 8')).toHaveLength(2)
    expect(screen.getByText('Swap')).toBeInTheDocument()
  })

  it('renders an empty DP data panel when there is no active cell or explanation', () => {
    const { container } = render(
      <DpDataPanel explanation={null} currentCell={null} eventType={null} />,
    )

    expect(screen.queryByText('Cell')).not.toBeInTheDocument()
    expect(container.firstChild).toHaveClass('min-h-[40px]')
  })

  it('renders DP cell context, event type, and explanation text', () => {
    render(
      <DpDataPanel
        explanation="Computed the diagonal recurrence."
        currentCell={[3, 4]}
        eventType="FILL_CELL"
      />,
    )

    expect(screen.getByText('Cell')).toBeInTheDocument()
    expect(screen.getByText('(3, 4)')).toBeInTheDocument()
    expect(screen.getByText('FILL_CELL')).toBeInTheDocument()
    expect(screen.getByText('Computed the diagonal recurrence.')).toBeInTheDocument()
  })
})
