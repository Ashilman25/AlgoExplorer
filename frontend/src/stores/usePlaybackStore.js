import { create } from 'zustand'

const DEFAULT_SPEED = 1

function clampIndex(index, totalSteps) {
  return Math.max(0, Math.min(index, Math.max(0, totalSteps - 1)))
}


export const usePlaybackStore = create((set, get) => ({

  steps: [],
  isLoading: false,
  error: null,

  stepIndex: 0,
  totalSteps: 0,
  isPlaying: false,
  speed: DEFAULT_SPEED,
  isScrubbing: false,

  currentStep: null,
  timingConfig: null,
  runHandler: null,

  setTimeline: (steps, timingConfig) => {
    const s = Array.isArray(steps) ? steps : []
    set({
      steps: s,
      totalSteps: s.length,
      stepIndex: 0,
      currentStep: s[0] ?? null,
      isPlaying: false,
      error: null,
      timingConfig: timingConfig ?? null,
    })
  },

  clearTimeline: () =>
    set({
      steps: [],
      totalSteps: 0,
      stepIndex: 0,
      currentStep: null,
      isPlaying: false,
      isScrubbing: false,
      isLoading: false,
      error: null,
      timingConfig: null,
    }),

  setLoading: (isLoading) => set({isLoading}),
  setError: (error) => set({error, isLoading: false}),

  play: () => set({isPlaying: true}),
  pause: () => set({isPlaying: false}),

  next: () =>
    set((s) => {
      const stepIndex = Math.min(s.stepIndex + 1, Math.max(0, s.totalSteps - 1))
      return { stepIndex, currentStep: s.steps[stepIndex] ?? null }
    }),

  prev: () =>
    set((s) => {
      const stepIndex = Math.max(s.stepIndex - 1, 0)
      return { stepIndex, currentStep: s.steps[stepIndex] ?? null }
    }),

  jumpTo: (index) =>
    set((s) => {
      const stepIndex = clampIndex(index, s.totalSteps)
      return { stepIndex, currentStep: s.steps[stepIndex] ?? null }
    }),

  jumpToStart: () =>
    set((s) => ({
      stepIndex: 0,
      currentStep: s.steps[0] ?? null,
      isPlaying: false,
    })),

  jumpToEnd: () =>
    set((s) => {
      const stepIndex = Math.max(0, s.totalSteps - 1)
      return { stepIndex, currentStep: s.steps[stepIndex] ?? null, isPlaying: false }
    }),

  setSpeed: (speed) => set({ speed }),
  beginScrub: () => set({ isScrubbing: true, isPlaying: false }),
  endScrub: () => set({ isScrubbing: false }),

  registerRunHandler: (fn) => set({ runHandler: fn }),
  unregisterRunHandler: () => set({ runHandler: null }),

  reset: () =>
    set((s) => ({
      stepIndex: 0,
      currentStep: s.steps[0] ?? null,
      isPlaying: false,
      speed: DEFAULT_SPEED,
      isScrubbing: false,
    })),
}))
