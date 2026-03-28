import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FloatingCodePanel from '../../../src/components/simulation/FloatingCodePanel'

const MOCK_CONTENT = {
  pseudocode: [
    'BFS(graph, source, target):',
    '  queue <- [source]',
    '  visited <- {source}',
  ],
  code: {
    python: 'def bfs(): pass',
    javascript: 'function bfs() {}',
    java: 'void bfs() {}',
    cpp: 'void bfs() {}',
  },
}

describe('FloatingCodePanel', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <FloatingCodePanel
        open = {false}
        onClose = {() => {}}
        content = {MOCK_CONTENT}
        activeLines = {[]}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders when open is true', () => {
    render(
      <FloatingCodePanel
        open = {true}
        onClose = {() => {}}
        content = {MOCK_CONTENT}
        activeLines = {[]}
      />
    )

    expect(screen.getByText('Pseudocode')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <FloatingCodePanel
        open = {true}
        onClose = {onClose}
        content = {MOCK_CONTENT}
        activeLines = {[]}
      />
    )

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('defaults to pseudocode tab and shows pseudocode lines', () => {
    render(
      <FloatingCodePanel
        open = {true}
        onClose = {() => {}}
        content = {MOCK_CONTENT}
        activeLines = {[0]}
      />
    )

    expect(screen.getByText('BFS(graph, source, target):')).toBeInTheDocument()
  })

  it('switches to code tab when clicked', async () => {
    const user = userEvent.setup()

    render(
      <FloatingCodePanel
        open = {true}
        onClose = {() => {}}
        content = {MOCK_CONTENT}
        activeLines = {[]}
      />
    )

    await user.click(screen.getByText('Code'))

    expect(screen.getByRole('button', { name: 'PY' })).toBeInTheDocument()
  })

  it('renders empty state when content is null', () => {
    render(
      <FloatingCodePanel
        open = {true}
        onClose = {() => {}}
        content = {null}
        activeLines = {[]}
      />
    )

    expect(screen.getByText(/no pseudocode/i)).toBeInTheDocument()
  })
})
