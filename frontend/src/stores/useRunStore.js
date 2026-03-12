import { create } from 'zustand'

export const useRunStore = create((set) => ({
  runId: null,
  summary: null,   // run summary returned by backend
  isLoading: false,
  error: null,

  setRun: (runId, summary) => set({ runId, summary, error: null }),
  clearRun: () => set({ runId: null, summary: null, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
