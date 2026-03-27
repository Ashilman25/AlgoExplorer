// frontend/test/components/comparison/ComparisonPlaybackBar.test.jsx
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ComparisonPlaybackBar from '../../../src/components/comparison/ComparisonPlaybackBar'
import { useComparisonStore, _resetSlotCounter } from '../../../src/stores/useComparisonStore'

const EMPTY_STATE = {
  slots: [],
  maxSlots: 4,
  moduleType: null,
  inputPayload: null,
  algorithmConfig: {},
  explanationLevel: 'standard',
  stepIndex: 0,
  maxSteps: 0,
  isPlaying: false,
  speed: 1,
  isScrubbing: false,
  deltaMetrics: null,
  commentary: { summary: '', divergences: [] },
}

function resetStore() {
  _resetSlotCounter()
  useComparisonStore.setState(EMPTY_STATE)
}

describe('ComparisonPlaybackBar', () => {
  beforeEach(resetStore)
  afterEach(() => vi.useRealTimers())

  it('renders disabled controls when no steps are loaded', () => {
    render(<ComparisonPlaybackBar />)
    expect(screen.getByText('STEP — / —')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Timeline scrubber' })).toBeDisabled()
  })

  it('enables controls and shows step counter with loaded data', () => {
    useComparisonStore.setState({ maxSteps: 10, stepIndex: 3 })
    render(<ComparisonPlaybackBar />)
    expect(screen.getByText('STEP 4 / 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).not.toBeDisabled()
  })

  it('step forward/back updates comparison store', () => {
    useComparisonStore.setState({ maxSteps: 5, stepIndex: 2 })
    render(<ComparisonPlaybackBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Step forward' }))
    expect(useComparisonStore.getState().stepIndex).toBe(3)
    fireEvent.click(screen.getByRole('button', { name: 'Step back' }))
    expect(useComparisonStore.getState().stepIndex).toBe(2)
  })

  it('scrubber jumps to step', () => {
    useComparisonStore.setState({ maxSteps: 10 })
    render(<ComparisonPlaybackBar />)
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline scrubber' }), {
      target: { value: '7' },
    })
    expect(useComparisonStore.getState().stepIndex).toBe(7)
  })
})
