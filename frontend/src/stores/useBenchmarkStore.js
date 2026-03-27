import { create } from 'zustand'
import { benchmarksService } from '../services/benchmarksService'

const POLL_INTERVAL_MS = 1500

export const useBenchmarkStore = create((set, get) => ({
  jobs: {},
  activeJobId: null,
  _pollIntervalId: null,
  _pollJobId: null,

  setJob: (id, data) =>
    set((s) => ({ jobs: { ...s.jobs, [id]: data } })),

  updateJob: (id, patch) =>
    set((s) => ({
      jobs: { ...s.jobs, [id]: { ...s.jobs[id], ...patch } },
    })),

  setActiveJob: (id) => set({ activeJobId: id }),

  clearJob: (id) =>
    set((s) => {
      const jobs = { ...s.jobs }
      delete jobs[id]
      return {
        jobs,
        activeJobId: s.activeJobId === id ? null : s.activeJobId,
      }
    }),

  clearAll: () => {
    get().stopPolling()
    set({ jobs: {}, activeJobId: null })
  },

  pollJob: (jobId) => {
    const { stopPolling, _poll } = get()
    stopPolling()

    set({ _pollJobId: jobId })

    const intervalId = setInterval(() => _poll(jobId), POLL_INTERVAL_MS)
    set({ _pollIntervalId: intervalId })
  },

  stopPolling: () => {
    const { _pollIntervalId } = get()
    if (_pollIntervalId !== null) {
      clearInterval(_pollIntervalId)
      set({ _pollIntervalId: null, _pollJobId: null })
    }
  },

  _poll: async (jobId) => {
    try {
      const status = await benchmarksService.getJob(jobId)
      get().setJob(jobId, status)

      if (status.status === 'completed') {
        get().stopPolling()
        const results = await benchmarksService.getResults(jobId)
        get().updateJob(jobId, { results })
      } else if (status.status === 'failed') {
        get().stopPolling()
      }
    } catch {
      // Polling error — keep trying, don't crash
    }
  },
}))
