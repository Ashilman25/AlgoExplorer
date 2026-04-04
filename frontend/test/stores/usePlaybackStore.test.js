import { beforeEach, describe, expect, it } from 'vitest'
import { usePlaybackStore } from '../../src/stores/usePlaybackStore'

const STEPS = [
  { step_index: 0, event_type: 'INITIALIZE' },
  { step_index: 1, event_type: 'DEQUEUE' },
  { step_index: 2, event_type: 'ENQUEUE' },
]

const TIMING_CONFIG = {
  baseDelay: 150,
  eventWeights: { INITIALIZE: 2.5, DEQUEUE: 1.0, ENQUEUE: 0.4 },
}

function resetStore() {
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
  })
}

describe('usePlaybackStore — timingConfig', () => {
  beforeEach(resetStore)

  it('defaults timingConfig to null', () => {
    expect(usePlaybackStore.getState().timingConfig).toBe(null)
  })

  it('setTimeline stores timingConfig when provided', () => {
    usePlaybackStore.getState().setTimeline(STEPS, TIMING_CONFIG)
    const state = usePlaybackStore.getState()
    expect(state.totalSteps).toBe(3)
    expect(state.timingConfig).toEqual(TIMING_CONFIG)
  })

  it('setTimeline sets timingConfig to null when omitted', () => {
    usePlaybackStore.getState().setTimeline(STEPS, TIMING_CONFIG)
    expect(usePlaybackStore.getState().timingConfig).toEqual(TIMING_CONFIG)
    usePlaybackStore.getState().setTimeline(STEPS)
    expect(usePlaybackStore.getState().timingConfig).toBe(null)
  })

  it('clearTimeline resets timingConfig to null', () => {
    usePlaybackStore.getState().setTimeline(STEPS, TIMING_CONFIG)
    usePlaybackStore.getState().clearTimeline()
    expect(usePlaybackStore.getState().timingConfig).toBe(null)
  })

  it('reset preserves timingConfig (only resets playback state)', () => {
    usePlaybackStore.getState().setTimeline(STEPS, TIMING_CONFIG)
    usePlaybackStore.getState().next()
    usePlaybackStore.getState().reset()
    const state = usePlaybackStore.getState()
    expect(state.stepIndex).toBe(0)
    expect(state.timingConfig).toEqual(TIMING_CONFIG)
  })
})
