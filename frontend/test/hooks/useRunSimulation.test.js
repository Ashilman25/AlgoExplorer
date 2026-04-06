import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlaybackStore } from '../../src/stores/usePlaybackStore'

// Mock the services
vi.mock('../../src/services/runsService', () => ({
  runsService: {
    createRun: vi.fn().mockResolvedValue({ id: 'run-1', summary: {} }),
    getTimeline: vi.fn().mockResolvedValue({
      steps: [
        { step_index: 0, event_type: 'INITIALIZE' },
        { step_index: 1, event_type: 'VISIT' },
      ],
    }),
  },
}))

vi.mock('../../src/services/client', () => ({
  parseApiError: vi.fn((err) => ({ message: err.message })),
}))

vi.mock('../../src/stores/useRunStore', () => ({
  useRunStore: Object.assign(
    (selector) => {
      const state = { setRun: vi.fn(), clearRun: vi.fn(), setLoading: vi.fn(), setError: vi.fn() }
      return selector ? selector(state) : state
    },
    { getState: () => ({ setRun: vi.fn(), clearRun: vi.fn(), setLoading: vi.fn(), setError: vi.fn() }) },
  ),
}))

vi.mock('../../src/stores/useGuestStore', () => ({
  useGuestStore: Object.assign(
    (selector) => selector({ saveRun: vi.fn() }),
    { getState: () => ({ saveRun: vi.fn() }) },
  ),
}))

vi.mock('../../src/services/guestService', () => ({
  guestService: { createRunItem: vi.fn((x) => x) },
}))

import { useRunSimulation } from '../../src/hooks/useRunSimulation'

function resetPlaybackStore() {
  usePlaybackStore.setState({
    steps: [],
    isLoading: false,
    error: null,
    stepIndex: 0,
    totalSteps: 0,
    isPlaying: false,
    speed: 1,
    isScrubbing: false,
    currentStep: null,
    timingConfig: null,
    runHandler: null,
  })
}

const REQUEST = {
  module_type: 'sorting',
  algorithm_key: 'quick_sort',
  input_payload: { array: [3, 1, 2] },
  execution_mode: 'simulate',
  explanation_level: 'detailed',
}

describe('useRunSimulation — autoPlay option', () => {
  beforeEach(resetPlaybackStore)

  it('auto-plays after run by default', async () => {
    const { result } = renderHook(() => useRunSimulation())

    await act(async () => {
      await result.current.run(REQUEST)
    })

    const state = usePlaybackStore.getState()
    expect(state.totalSteps).toBe(2)
    expect(state.isPlaying).toBe(true)
  })

  it('does not auto-play when autoPlay is false', async () => {
    const { result } = renderHook(() => useRunSimulation())

    await act(async () => {
      await result.current.run(REQUEST, null, { autoPlay: false })
    })

    const state = usePlaybackStore.getState()
    expect(state.totalSteps).toBe(2)
    expect(state.stepIndex).toBe(0)
    expect(state.isPlaying).toBe(false)
  })
})
