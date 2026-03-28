import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DpRenderer from '../../../src/components/comparison/renderers/DpRenderer'

const STRING_STEP = {
  state_payload: {
    table: [[0, 0, 0], [0, 1, 1], [0, 1, 2]],
    cell_states: [['visited', 'visited', 'visited'], ['visited', 'active', 'default'], ['visited', 'default', 'default']],
    current_cell: [1, 1],
    traceback_path: [],
  },
}

const KNAPSACK_STEP = {
  state_payload: {
    table: [[0, 0, 0, 0], [0, 0, 3, 3], [0, 0, 3, 4]],
    cell_states: [['visited', 'visited', 'visited', 'visited'], ['visited', 'visited', 'active', 'default'], ['visited', 'default', 'default', 'default']],
    current_cell: [1, 2],
    traceback_path: [],
  },
}

const STRIP_STEP = {
  state_payload: {
    array: [0, null, null, null, null],
    cell_states: ['visited', 'active', 'default', 'default', 'default'],
    current_index: 1,
    coins_used: [null, null, null, null, null],
  },
}

const STRIP_STEP_WITH_COINS = {
  state_payload: {
    array: [0, 1, 1, 2, 1],
    cell_states: ['visited', 'visited', 'visited', 'visited', 'visited'],
    current_index: 4,
    coins_used: [null, 1, 1, 1, 3],
  },
}

const CALL_TREE_ONLY_STEP = {
  state_payload: {
    array: null,
    cell_states: null,
    call_tree: { nodes: [{ id: 1, n: 5, parent_id: null, depth: 0, state: 'active', result: null }] },
  },
}

describe('DpRenderer', () => {
  it('renders 2D string table with string headers', () => {
    render(<DpRenderer currentStep = {STRING_STEP} inputPayload = {{ string1: 'AB', string2: 'AB' }} />)
    expect(screen.getAllByText('A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('B').length).toBeGreaterThan(0)
    expect(screen.getAllByText('\u03b5').length).toBeGreaterThan(0)
  })

  it('renders 2D knapsack table with item/capacity headers', () => {
    render(<DpRenderer currentStep = {KNAPSACK_STEP} inputPayload = {{ capacity: 3, items: [{ weight: 2, value: 3 }, { weight: 3, value: 4 }] }} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getAllByText('3').length).toBeGreaterThan(0)
  })

  it('renders 1D strip for array data', () => {
    render(<DpRenderer currentStep = {STRIP_STEP} inputPayload = {{ coins: [1, 3], target: 4 }} />)
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThan(0)
  })

  it('renders coin-used labels when coins_used data is present', () => {
    render(<DpRenderer currentStep = {STRIP_STEP_WITH_COINS} inputPayload = {{ coins: [1, 3], target: 4 }} />)
    expect(screen.getByText('+3')).toBeInTheDocument()
    expect(screen.getAllByText('+1').length).toBeGreaterThan(0)
  })

  it('returns null for call-tree-only data (fibonacci naive fallback)', () => {
    const { container } = render(<DpRenderer currentStep = {CALL_TREE_ONLY_STEP} inputPayload = {{ n: 5 }} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when currentStep is null', () => {
    const { container } = render(<DpRenderer currentStep = {null} inputPayload = {{}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders empty state for table with no data', () => {
    const emptyStep = { state_payload: { table: [], cell_states: [] } }
    render(<DpRenderer currentStep = {emptyStep} inputPayload = {{ string1: '', string2: '' }} />)
    expect(screen.getByText(/no table data/i)).toBeInTheDocument()
  })

  it('renders empty state for strip with no data', () => {
    const emptyStep = { state_payload: { array: [], cell_states: [] } }
    render(<DpRenderer currentStep = {emptyStep} inputPayload = {{ coins: [1], target: 0 }} />)
    expect(screen.getByText(/no array data/i)).toBeInTheDocument()
  })

  it('handles null values in 1D strip gracefully', () => {
    const step = {
      state_payload: {
        array: [0, null, 1, null],
        cell_states: ['visited', 'default', 'visited', 'default'],
        current_index: null,
      },
    }
    const { container } = render(<DpRenderer currentStep = {step} inputPayload = {{ n: 3 }} />)
    expect(container.querySelector('.inline-flex')).toBeInTheDocument()
  })
})
