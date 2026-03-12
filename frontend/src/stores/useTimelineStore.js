import { create } from 'zustand'

export const useTimelineStore = create((set) => ({
  steps: [],       
  isLoading: false,
  error: null,

  setTimeline: (steps) => set({ steps, error: null }),
  clearTimeline: () => set({ steps: [], error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
