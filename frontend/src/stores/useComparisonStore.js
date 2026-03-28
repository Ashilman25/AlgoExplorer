import { create } from 'zustand'
import { computeDeltaMetrics, findDivergences, generateCommentary } from '../utils/comparisonUtils'
import { runsService } from '../services/runsService'

const DEFAULT_SPEED = 1

let slotCounter = 0

function nextSlotId() {
  return `slot-${slotCounter++}`
}

function clampStep(index, maxSteps) {
  return Math.max(0, Math.min(index, Math.max(0, maxSteps - 1)))
}

function recomputeMaxSteps(slots) {
  const readySlots = slots.filter((s) => s.status === 'ready')
  return readySlots.length > 0 ? Math.max(...readySlots.map((s) => s.timeline.length)) : 0
}

export const useComparisonStore = create((set, get) => ({

  // ── Slots ──────────────────────────────────────────────────────────
  slots: [],
  maxSlots: 4,

  // ── Shared input ───────────────────────────────────────────────────
  moduleType: null,
  inputPayload: null,
  algorithmConfig: {},
  explanationLevel: 'standard',
  graphSubCategory: null,
  sortingSubCategory: null,
  dpSubCategory: null,

  // ── Synchronized playback ──────────────────────────────────────────
  stepIndex: 0,
  maxSteps: 0,
  isPlaying: false,
  speed: DEFAULT_SPEED,
  isScrubbing: false,

  // ── Comparison data ────────────────────────────────────────────────
  deltaMetrics: null,
  commentary: { summary: '', divergences: [] },

  // ── Slot management ────────────────────────────────────────────────

  addSlot: (algorithmKey) =>
    set((s) => {
      if (s.slots.length >= s.maxSlots) return s
      return {
        slots: [
          ...s.slots,
          {
            id: nextSlotId(),
            algorithmKey,
            runId: null,
            summary: null,
            timeline: [],
            status: 'idle',
            error: null,
          },
        ],
      }
    }),

  removeSlot: (slotId) =>
    set((s) => {
      const slots = s.slots.filter((sl) => sl.id !== slotId)
      const maxSteps = recomputeMaxSteps(slots)
      return {
        slots,
        maxSteps,
        stepIndex: clampStep(s.stepIndex, maxSteps),
      }
    }),

  // ── Config ─────────────────────────────────────────────────────────

  setModuleType: (moduleType) =>
    set({
      moduleType,
      graphSubCategory: moduleType === 'graph' ? 'pathfinding' : null,
      sortingSubCategory: moduleType === 'sorting' ? 'sorting' : null,
      dpSubCategory: moduleType === 'dp' ? 'string_dp' : null,
      slots: [],
      stepIndex: 0,
      maxSteps: 0,
      isPlaying: false,
      deltaMetrics: null,
      commentary: { summary: '', divergences: [] },
    }),

  setGraphSubCategory: (graphSubCategory) =>
    set({
      graphSubCategory,
      slots: [],
      stepIndex: 0,
      maxSteps: 0,
      isPlaying: false,
      deltaMetrics: null,
      commentary: { summary: '', divergences: [] },
    }),

  setSortingSubCategory: (sortingSubCategory) =>
    set({
      sortingSubCategory,
      slots: [],
      stepIndex: 0,
      maxSteps: 0,
      isPlaying: false,
      deltaMetrics: null,
      commentary: { summary: '', divergences: [] },
    }),

  setDpSubCategory: (dpSubCategory) =>
    set({
      dpSubCategory,
      slots: [],
      stepIndex: 0,
      maxSteps: 0,
      isPlaying: false,
      deltaMetrics: null,
      commentary: { summary: '', divergences: [] },
    }),

  setInputPayload: (inputPayload) => set({ inputPayload }),
  setAlgorithmConfig: (algorithmConfig) => set({ algorithmConfig }),
  setExplanationLevel: (explanationLevel) => set({ explanationLevel }),

  // ── Playback ───────────────────────────────────────────────────────

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  next: () =>
    set((s) => ({
      stepIndex: clampStep(s.stepIndex + 1, s.maxSteps),
    })),

  prev: () =>
    set((s) => ({
      stepIndex: Math.max(0, s.stepIndex - 1),
    })),

  jumpTo: (index) =>
    set((s) => ({
      stepIndex: clampStep(index, s.maxSteps),
    })),

  jumpToStart: () =>
    set({ stepIndex: 0, isPlaying: false }),

  jumpToEnd: () =>
    set((s) => ({
      stepIndex: clampStep(s.maxSteps - 1, s.maxSteps),
      isPlaying: false,
    })),

  setSpeed: (speed) => set({ speed }),
  beginScrub: () => set({ isScrubbing: true, isPlaying: false }),
  endScrub: () => set({ isScrubbing: false }),

  reset: () =>
    set({
      stepIndex: 0,
      isPlaying: false,
      speed: DEFAULT_SPEED,
      isScrubbing: false,
    }),

  // ── Run orchestration ──────────────────────────────────────────────

  runAll: async () => {
    const { slots, moduleType, inputPayload, algorithmConfig, explanationLevel } = get()

    // Mark all slots as running
    set({
      slots: slots.map((s) => ({ ...s, status: 'running', error: null, runId: null, summary: null, timeline: [] })),
      stepIndex: 0,
      maxSteps: 0,
      isPlaying: false,
      deltaMetrics: null,
      commentary: { summary: '', divergences: [] },
    })

    const results = await Promise.allSettled(
      get().slots.map(async (slot) => {
        const response = await runsService.createRun({
          module_type: moduleType,
          algorithm_key: slot.algorithmKey,
          input_payload: inputPayload,
          algorithm_config: algorithmConfig,
          execution_mode: 'simulate',
          explanation_level: explanationLevel,
        })

        set((s) => ({
          slots: s.slots.map((sl) =>
            sl.id === slot.id
              ? { ...sl, runId: response.id, summary: response, status: 'loading_timeline' }
              : sl
          ),
        }))

        const timeline = await runsService.getTimeline(response.id)

        set((s) => ({
          slots: s.slots.map((sl) =>
            sl.id === slot.id ? { ...sl, timeline: timeline.steps, status: 'ready' } : sl
          ),
        }))

        return { slotId: slot.id }
      })
    )

    // Handle failures
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const slotId = get().slots[i]?.id
        if (slotId) {
          set((s) => ({
            slots: s.slots.map((sl) =>
              sl.id === slotId
                ? { ...sl, status: 'error', error: result.reason?.message ?? 'Run failed' }
                : sl
            ),
          }))
        }
      }
    })

    get()._finalizeTimelines()
  },

  rerunSlot: async (slotId) => {
    const { slots, moduleType, inputPayload, algorithmConfig, explanationLevel } = get()
    const slot = slots.find((s) => s.id === slotId)
    if (!slot) return

    set((s) => ({
      slots: s.slots.map((sl) =>
        sl.id === slotId ? { ...sl, status: 'running', error: null } : sl
      ),
    }))

    try {
      const response = await runsService.createRun({
        module_type: moduleType,
        algorithm_key: slot.algorithmKey,
        input_payload: inputPayload,
        algorithm_config: algorithmConfig,
        execution_mode: 'simulate',
        explanation_level: explanationLevel,
      })

      set((s) => ({
        slots: s.slots.map((sl) =>
          sl.id === slotId
            ? { ...sl, runId: response.id, summary: response, status: 'loading_timeline' }
            : sl
        ),
      }))

      const timeline = await runsService.getTimeline(response.id)

      set((s) => ({
        slots: s.slots.map((sl) =>
          sl.id === slotId ? { ...sl, timeline: timeline.steps, status: 'ready' } : sl
        ),
      }))

      get()._finalizeTimelines()
    } catch (err) {
      set((s) => ({
        slots: s.slots.map((sl) =>
          sl.id === slotId
            ? { ...sl, status: 'error', error: err?.message ?? 'Run failed' }
            : sl
        ),
      }))
    }
  },

  // ── Internal helpers ───────────────────────────────────────────────

  _finalizeTimelines: () => {
    const { slots, moduleType, graphSubCategory, sortingSubCategory, dpSubCategory } = get()
    const maxSteps = recomputeMaxSteps(slots)
    const readySlots = slots.filter((s) => s.status === 'ready')
    const deltaMetrics = computeDeltaMetrics(readySlots, 0, moduleType, graphSubCategory, sortingSubCategory, dpSubCategory)
    const divergences = findDivergences(readySlots)
    const summary = generateCommentary(readySlots, deltaMetrics)

    set({
      maxSteps,
      stepIndex: 0,
      deltaMetrics,
      commentary: { summary, divergences },
    })
  },
}))

export function _resetSlotCounter() {
  slotCounter = 0
}
