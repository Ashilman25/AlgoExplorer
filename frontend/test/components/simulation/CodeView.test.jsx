import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CodeView from '../../../src/components/simulation/CodeView'

const MOCK_CODE = {
  python: 'def bfs(graph, source):\n    queue = [source]',
  javascript: 'function bfs(graph, source) {\n    const queue = [source];\n}',
  java: 'public void bfs(Graph g, int s) {\n    Queue<Integer> q = new LinkedList<>();\n}',
  cpp: 'void bfs(vector<vector<int>>& g, int s) {\n    queue<int> q;\n}',
}

describe('CodeView', () => {
  it('renders the default language (python) code', () => {
    const { container } = render(<CodeView code={MOCK_CODE} />)

    const pre = container.querySelector('pre')
    expect(pre).toBeInTheDocument()
    expect(pre.textContent).toMatch(/def/)
    expect(pre.textContent).toMatch(/bfs/)
  })

  it('renders language selector buttons', () => {
    render(<CodeView code={MOCK_CODE} />)

    expect(screen.getByRole('button', { name: 'PY' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'JS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Java' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'C++' })).toBeInTheDocument()
  })

  it('switches language when a language button is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<CodeView code={MOCK_CODE} />)

    await user.click(screen.getByRole('button', { name: 'JS' }))

    const pre = container.querySelector('pre')
    expect(pre.textContent).toMatch(/function/)
    expect(pre.textContent).toMatch(/bfs/)
  })

  it('renders a copy button', () => {
    render(<CodeView code={MOCK_CODE} />)

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('renders empty state when code is null', () => {
    render(<CodeView code={null} />)

    expect(screen.getByText(/no code/i)).toBeInTheDocument()
  })
})
