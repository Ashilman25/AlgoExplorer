import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBenchmarkStore } from '../../src/stores/useBenchmarkStore'
import { benchmarksService } from '../../src/services/benchmarksService'

vi.mock('../../src/services/benchmarksService', () => ({
  benchmarksService: {
    getJob: vi.fn(),
    getResults: vi.fn(),
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  useBenchmarkStore.getState().clearAll()
})

afterEach(() => {
  useBenchmarkStore.getState().stopPolling()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('pollJob', () => {
  it('polls on interval and updates store with status and progress', async () => {
    benchmarksService.getJob.mockResolvedValue({
      id: 1, status: 'running', progress: 0.5,
    })

    useBenchmarkStore.getState().pollJob(1)

    await vi.advanceTimersByTimeAsync(1500)

    const state = useBenchmarkStore.getState()
    expect(state.jobs[1]).toEqual(
      expect.objectContaining({ status: 'running', progress: 0.5 })
    )
    expect(benchmarksService.getJob).toHaveBeenCalledWith(1)
  })

  it('stops polling and fetches results on completed', async () => {
    benchmarksService.getJob.mockResolvedValue({
      id: 1, status: 'completed', progress: 1.0,
    })
    benchmarksService.getResults.mockResolvedValue({
      id: 1, status: 'completed', summary: {}, series: {}, table: [],
    })

    useBenchmarkStore.getState().pollJob(1)

    await vi.advanceTimersByTimeAsync(1500)

    expect(benchmarksService.getResults).toHaveBeenCalledWith(1)

    // Should have stopped polling — no more calls after another interval
    benchmarksService.getJob.mockClear()
    await vi.advanceTimersByTimeAsync(1500)
    expect(benchmarksService.getJob).not.toHaveBeenCalled()
  })

  it('stops polling on failed status', async () => {
    benchmarksService.getJob.mockResolvedValue({
      id: 1, status: 'failed', progress: 0.3,
    })

    useBenchmarkStore.getState().pollJob(1)

    await vi.advanceTimersByTimeAsync(1500)

    const state = useBenchmarkStore.getState()
    expect(state.jobs[1]).toEqual(
      expect.objectContaining({ status: 'failed', progress: 0.3 })
    )

    // Polling stopped
    benchmarksService.getJob.mockClear()
    await vi.advanceTimersByTimeAsync(1500)
    expect(benchmarksService.getJob).not.toHaveBeenCalled()
  })

  it('stopPolling clears the interval', async () => {
    benchmarksService.getJob.mockResolvedValue({
      id: 1, status: 'running', progress: 0.1,
    })

    useBenchmarkStore.getState().pollJob(1)
    useBenchmarkStore.getState().stopPolling()

    await vi.advanceTimersByTimeAsync(1500)
    expect(benchmarksService.getJob).not.toHaveBeenCalled()
  })
})
