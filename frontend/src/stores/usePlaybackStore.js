import { create } from 'zustand'

const DEFAULT_SPEED = 1

export const usePlaybackStore = create((set) => ({
  stepIndex: 0,
  totalSteps: 0,   // kept in sync when a timeline is loaded
  isPlaying: false,
  speed: DEFAULT_SPEED,

  // Call this when a new timeline is loaded to sync total length
  setTotalSteps: (totalSteps) => set({ totalSteps, stepIndex: 0, isPlaying: false }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  next: () =>
    set((s) => ({
      stepIndex: Math.min(s.stepIndex + 1, Math.max(0, s.totalSteps - 1)),
    })),

  prev: () =>
    set((s) => ({ stepIndex: Math.max(s.stepIndex - 1, 0) })),

  jumpTo: (index) =>
    set((s) => ({
      stepIndex: Math.max(0, Math.min(index, Math.max(0, s.totalSteps - 1))),
    })),

  jumpToStart: () => set({ stepIndex: 0 }),

  jumpToEnd: () =>
    set((s) => ({ stepIndex: Math.max(0, s.totalSteps - 1) })),

  setSpeed: (speed) => set({ speed }),

  reset: () => set({ stepIndex: 0, isPlaying: false, speed: DEFAULT_SPEED }),
}))
