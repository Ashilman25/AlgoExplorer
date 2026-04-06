import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PlaybackBar from '../../../src/components/simulation/PlaybackBar'
import { usePlaybackStore } from '../../../src/stores/usePlaybackStore'

const DEFAULT_PLAYBACK_STATE = {
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
}

const TIMELINE_STEPS = [
  { step_index: 0, event_type: 'INITIALIZE' },
  { step_index: 1, event_type: 'VISIT' },
  { step_index: 2, event_type: 'COMPLETE' },
]

function resetPlaybackStore() {
  usePlaybackStore.setState(DEFAULT_PLAYBACK_STATE)
}

function seedPlaybackStore(steps = TIMELINE_STEPS) {
  resetPlaybackStore()
  usePlaybackStore.getState().setTimeline(steps)
}

describe('PlaybackBar', () => {
  beforeEach(() => {
    resetPlaybackStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a disabled empty state when no timeline is available', () => {
    render(<PlaybackBar />)

    expect(screen.getByText('STEP — / —')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Timeline scrubber' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Jump to start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Step back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Step forward' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Jump to end' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Playback speed' })).toHaveValue('2')
    expect(screen.getByText('1x')).toBeInTheDocument()
  })

  it('supports manual navigation and speed changes across the loaded timeline', () => {
    seedPlaybackStore()

    render(<PlaybackBar />)

    expect(screen.getByText('STEP 1 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Step forward' }))
    expect(usePlaybackStore.getState().stepIndex).toBe(1)
    expect(screen.getByText('STEP 2 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Jump to end' }))
    expect(usePlaybackStore.getState().stepIndex).toBe(2)
    expect(screen.getByText('STEP 3 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Step back' }))
    expect(usePlaybackStore.getState().stepIndex).toBe(1)

    fireEvent.change(screen.getByRole('slider', { name: 'Timeline scrubber' }), {
      target: { value: '0' },
    })
    expect(usePlaybackStore.getState().stepIndex).toBe(0)
    expect(screen.getByText('STEP 1 / 3')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('slider', { name: 'Playback speed' }), {
      target: { value: '4' },
    })
    expect(usePlaybackStore.getState().speed).toBe(4)
    expect(screen.getByText('4x')).toBeInTheDocument()
  })

  it('autoplays through the timeline and pauses after reaching the final step', () => {
    vi.useFakeTimers()
    seedPlaybackStore()

    render(<PlaybackBar />)

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(usePlaybackStore.getState().isPlaying).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(usePlaybackStore.getState().stepIndex).toBe(2)
    expect(usePlaybackStore.getState().isPlaying).toBe(false)
    expect(screen.getByText('STEP 3 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('stops autoplay while scrubbing and allows jumping to a chosen step', () => {
    vi.useFakeTimers()
    seedPlaybackStore()

    render(<PlaybackBar />)

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(usePlaybackStore.getState().isPlaying).toBe(true)

    const scrubber = screen.getByRole('slider', { name: 'Timeline scrubber' })
    fireEvent.pointerDown(scrubber)

    expect(usePlaybackStore.getState().isScrubbing).toBe(true)
    expect(usePlaybackStore.getState().isPlaying).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1400)
    })

    expect(usePlaybackStore.getState().stepIndex).toBe(0)

    fireEvent.change(scrubber, { target: { value: '2' } })
    fireEvent.pointerUp(scrubber)

    expect(usePlaybackStore.getState().stepIndex).toBe(2)
    expect(usePlaybackStore.getState().isScrubbing).toBe(false)
    expect(screen.getByText('STEP 3 / 3')).toBeInTheDocument()
  })

  it('uses adaptive timing when timingConfig is set (grid mode)', () => {
    vi.useFakeTimers()

    const gridSteps = [
      { step_index: 0, event_type: 'INITIALIZE' },
      { step_index: 1, event_type: 'DEQUEUE' },
      { step_index: 2, event_type: 'ENQUEUE' },
      { step_index: 3, event_type: 'ENQUEUE' },
      { step_index: 4, event_type: 'PATH_FOUND' },
    ]

    const timingConfig = {
      baseDelay: 150,
      eventWeights: {
        INITIALIZE: 2.5,
        DEQUEUE: 1.0,
        ENQUEUE: 0.4,
        PATH_FOUND: 2.5,
      },
    }

    resetPlaybackStore()
    usePlaybackStore.getState().setTimeline(gridSteps, timingConfig)

    render(<PlaybackBar />)

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(usePlaybackStore.getState().isPlaying).toBe(true)

    // Step 0 (INITIALIZE): delay = 150 * 2.5 = 375ms
    act(() => { vi.advanceTimersByTime(374) })
    expect(usePlaybackStore.getState().stepIndex).toBe(0)
    act(() => { vi.advanceTimersByTime(1) })
    expect(usePlaybackStore.getState().stepIndex).toBe(1)

    // Step 1 (DEQUEUE): delay = 150 * 1.0 = 150ms
    act(() => { vi.advanceTimersByTime(149) })
    expect(usePlaybackStore.getState().stepIndex).toBe(1)
    act(() => { vi.advanceTimersByTime(1) })
    expect(usePlaybackStore.getState().stepIndex).toBe(2)

    // Step 2 (ENQUEUE): delay = 150 * 0.4 = 60ms
    act(() => { vi.advanceTimersByTime(59) })
    expect(usePlaybackStore.getState().stepIndex).toBe(2)
    act(() => { vi.advanceTimersByTime(1) })
    expect(usePlaybackStore.getState().stepIndex).toBe(3)

    // Step 3 (ENQUEUE): delay = 150 * 0.4 = 60ms
    act(() => { vi.advanceTimersByTime(59) })
    expect(usePlaybackStore.getState().stepIndex).toBe(3)
    act(() => { vi.advanceTimersByTime(1) })
    expect(usePlaybackStore.getState().stepIndex).toBe(4)

    // At last step — should pause
    expect(usePlaybackStore.getState().isPlaying).toBe(false)
    expect(screen.getByText('STEP 5 / 5')).toBeInTheDocument()
  })

  describe('run-on-play (pre-run state)', () => {
    it('enables Play and Step Forward when runHandler is registered and no timeline', () => {
      usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, runHandler: vi.fn() })
      render(<PlaybackBar />)

      expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Step forward' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Step back' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Jump to start' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Jump to end' })).toBeDisabled()
      expect(screen.getByRole('slider', { name: 'Timeline scrubber' })).toBeDisabled()
    })

    it('calls runHandler with autoPlay true when Play is clicked pre-run', () => {
      const handler = vi.fn()
      usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, runHandler: handler })
      render(<PlaybackBar />)

      fireEvent.click(screen.getByRole('button', { name: 'Play' }))
      expect(handler).toHaveBeenCalledWith({ autoPlay: true })
    })

    it('calls runHandler with autoPlay false when Step Forward is clicked pre-run', () => {
      const handler = vi.fn()
      usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, runHandler: handler })
      render(<PlaybackBar />)

      fireEvent.click(screen.getByRole('button', { name: 'Step forward' }))
      expect(handler).toHaveBeenCalledWith({ autoPlay: false })
    })

    it('shows spinner and disables Play when isLoading is true', () => {
      usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, isLoading: true, runHandler: vi.fn() })
      render(<PlaybackBar />)

      const playBtn = screen.getByRole('button', { name: 'Loading' })
      expect(playBtn).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Step forward' })).toBeDisabled()
    })

    it('all controls disabled when no handler and no timeline', () => {
      usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, runHandler: null })
      render(<PlaybackBar />)

      expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Step forward' })).toBeDisabled()
    })

    it('reverts to normal play/pause behavior once timeline is loaded', () => {
      const handler = vi.fn()
      seedPlaybackStore()
      usePlaybackStore.setState({ runHandler: handler })
      render(<PlaybackBar />)

      fireEvent.click(screen.getByRole('button', { name: 'Play' }))
      expect(handler).not.toHaveBeenCalled()
      expect(usePlaybackStore.getState().isPlaying).toBe(true)
    })
  })
})
