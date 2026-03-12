import { create } from 'zustand'

export const useBenchmarkStore = create((set) => ({
  jobs: {},         // { [jobId]: BenchmarkJobState }
  activeJobId: null,

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

  clearAll: () => set({ jobs: {}, activeJobId: null }),
}))
