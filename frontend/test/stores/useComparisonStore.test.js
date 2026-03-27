import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock runsService before importing store
vi.mock('../../src/services/runsService', () => ({
  runsService: {
    createRun: vi.fn(),
    getTimeline: vi.fn(),
  },
}))

import { useComparisonStore, _resetSlotCounter } from '../../src/stores/useComparisonStore'
import { runsService } from '../../src/services/runsService'

const INITIAL_STATE = {
  slots: [],
  maxSlots: 4,
  moduleType: null,
  inputPayload: null,
  algorithmConfig: {},
  explanationLevel: 'standard',
  graphSubCategory: null,
  stepIndex: 0,
  maxSteps: 0,
  isPlaying: false,
  speed: 1,
  isScrubbing: false,
  deltaMetrics: null,
  commentary: { summary: '', divergences: [] },
}

function resetStore() {
  _resetSlotCounter()
  useComparisonStore.setState(INITIAL_STATE)
}

const SAMPLE_TIMELINE_A = [
  { step_index: 0, event_type: 'INITIALIZE', metrics_snapshot: { nodes_visited: 0 } },
  { step_index: 1, event_type: 'VISIT_NODE', metrics_snapshot: { nodes_visited: 3 } },
  { step_index: 2, event_type: 'COMPLETE',   metrics_snapshot: { nodes_visited: 8 } },
]

const SAMPLE_TIMELINE_B = [
  { step_index: 0, event_type: 'INITIALIZE', metrics_snapshot: { nodes_visited: 0 } },
  { step_index: 1, event_type: 'VISIT_NODE', metrics_snapshot: { nodes_visited: 2 } },
]

describe('useComparisonStore', () => {
  beforeEach(resetStore)
  afterEach(() => vi.useRealTimers())

  describe('slot management', () => {
    it('adds a slot', () => {
      useComparisonStore.getState().addSlot('bfs')
      const { slots } = useComparisonStore.getState()
      expect(slots).toHaveLength(1)
      expect(slots[0].algorithmKey).toBe('bfs')
      expect(slots[0].status).toBe('idle')
      expect(slots[0].id).toBe('slot-0')
    })

    it('adds up to maxSlots (4)', () => {
      const { addSlot } = useComparisonStore.getState()
      addSlot('bfs'); addSlot('dijkstra'); addSlot('quicksort'); addSlot('mergesort')
      expect(useComparisonStore.getState().slots).toHaveLength(4)
    })

    it('rejects adding beyond maxSlots', () => {
      const { addSlot } = useComparisonStore.getState()
      addSlot('a'); addSlot('b'); addSlot('c'); addSlot('d'); addSlot('e')
      expect(useComparisonStore.getState().slots).toHaveLength(4)
    })

    it('removes a slot by id', () => {
      const { addSlot } = useComparisonStore.getState()
      addSlot('bfs'); addSlot('dijkstra')
      useComparisonStore.getState().removeSlot('slot-0')
      const { slots } = useComparisonStore.getState()
      expect(slots).toHaveLength(1)
      expect(slots[0].algorithmKey).toBe('dijkstra')
    })

    it('recomputes maxSteps when removing a slot', () => {
      useComparisonStore.setState({
        slots: [
          { id: 'slot-0', algorithmKey: 'bfs', status: 'ready', timeline: SAMPLE_TIMELINE_A, runId: 1, summary: null, error: null },
          { id: 'slot-1', algorithmKey: 'dijkstra', status: 'ready', timeline: SAMPLE_TIMELINE_B, runId: 2, summary: null, error: null },
        ],
        maxSteps: 3,
      })
      useComparisonStore.getState().removeSlot('slot-0')
      expect(useComparisonStore.getState().maxSteps).toBe(2)
    })
  })

  describe('config', () => {
    it('sets module type and clears slots', () => {
      useComparisonStore.getState().addSlot('bfs')
      useComparisonStore.getState().setModuleType('graph')
      const state = useComparisonStore.getState()
      expect(state.moduleType).toBe('graph')
      expect(state.slots).toHaveLength(0)
    })

    it('sets input payload', () => {
      useComparisonStore.getState().setInputPayload({ nodes: [] })
      expect(useComparisonStore.getState().inputPayload).toEqual({ nodes: [] })
    })
  })

  describe('graphSubCategory', () => {
    it('setModuleType("graph") defaults graphSubCategory to pathfinding', () => {
      useComparisonStore.getState().setModuleType('graph')
      expect(useComparisonStore.getState().graphSubCategory).toBe('pathfinding')
    })

    it('setModuleType("sorting") sets graphSubCategory to null', () => {
      useComparisonStore.getState().setModuleType('graph')
      useComparisonStore.getState().setModuleType('sorting')
      expect(useComparisonStore.getState().graphSubCategory).toBeNull()
    })

    it('setGraphSubCategory clears slots and resets playback', () => {
      useComparisonStore.getState().setModuleType('graph')
      useComparisonStore.getState().addSlot('bfs')
      useComparisonStore.getState().addSlot('dfs')
      expect(useComparisonStore.getState().slots).toHaveLength(2)

      useComparisonStore.getState().setGraphSubCategory('mst')
      const state = useComparisonStore.getState()
      expect(state.graphSubCategory).toBe('mst')
      expect(state.slots).toHaveLength(0)
      expect(state.stepIndex).toBe(0)
      expect(state.maxSteps).toBe(0)
      expect(state.isPlaying).toBe(false)
      expect(state.deltaMetrics).toBeNull()
    })

    it('setGraphSubCategory("ordering") sets graphSubCategory', () => {
      useComparisonStore.getState().setModuleType('graph')
      useComparisonStore.getState().setGraphSubCategory('ordering')
      expect(useComparisonStore.getState().graphSubCategory).toBe('ordering')
    })
  })

  describe('playback', () => {
    function seedReadySlots() {
      useComparisonStore.setState({
        slots: [
          { id: 'slot-0', algorithmKey: 'bfs', status: 'ready', timeline: SAMPLE_TIMELINE_A, runId: 1, summary: null, error: null },
          { id: 'slot-1', algorithmKey: 'dijkstra', status: 'ready', timeline: SAMPLE_TIMELINE_B, runId: 2, summary: null, error: null },
        ],
        maxSteps: 3,
        moduleType: 'graph',
      })
    }

    it('next() advances stepIndex and clamps at maxSteps - 1', () => {
      seedReadySlots()
      const { next } = useComparisonStore.getState()
      next(); expect(useComparisonStore.getState().stepIndex).toBe(1)
      next(); expect(useComparisonStore.getState().stepIndex).toBe(2)
      next(); expect(useComparisonStore.getState().stepIndex).toBe(2)
    })

    it('prev() decrements stepIndex and clamps at 0', () => {
      seedReadySlots()
      useComparisonStore.setState({ stepIndex: 2 })
      const { prev } = useComparisonStore.getState()
      prev(); expect(useComparisonStore.getState().stepIndex).toBe(1)
      prev(); expect(useComparisonStore.getState().stepIndex).toBe(0)
      prev(); expect(useComparisonStore.getState().stepIndex).toBe(0)
    })

    it('jumpTo() navigates to a specific step', () => {
      seedReadySlots()
      useComparisonStore.getState().jumpTo(2)
      expect(useComparisonStore.getState().stepIndex).toBe(2)
    })

    it('jumpTo() clamps out-of-range values', () => {
      seedReadySlots()
      useComparisonStore.getState().jumpTo(999)
      expect(useComparisonStore.getState().stepIndex).toBe(2)
      useComparisonStore.getState().jumpTo(-5)
      expect(useComparisonStore.getState().stepIndex).toBe(0)
    })

    it('jumpToStart() resets to 0 and pauses', () => {
      seedReadySlots()
      useComparisonStore.setState({ stepIndex: 2, isPlaying: true })
      useComparisonStore.getState().jumpToStart()
      expect(useComparisonStore.getState().stepIndex).toBe(0)
      expect(useComparisonStore.getState().isPlaying).toBe(false)
    })

    it('jumpToEnd() goes to maxSteps - 1 and pauses', () => {
      seedReadySlots()
      useComparisonStore.getState().jumpToEnd()
      expect(useComparisonStore.getState().stepIndex).toBe(2)
      expect(useComparisonStore.getState().isPlaying).toBe(false)
    })

    it('play() and pause() toggle isPlaying', () => {
      useComparisonStore.getState().play()
      expect(useComparisonStore.getState().isPlaying).toBe(true)
      useComparisonStore.getState().pause()
      expect(useComparisonStore.getState().isPlaying).toBe(false)
    })

    it('setSpeed() changes speed', () => {
      useComparisonStore.getState().setSpeed(4)
      expect(useComparisonStore.getState().speed).toBe(4)
    })

    it('beginScrub() pauses and sets isScrubbing', () => {
      useComparisonStore.setState({ isPlaying: true })
      useComparisonStore.getState().beginScrub()
      expect(useComparisonStore.getState().isScrubbing).toBe(true)
      expect(useComparisonStore.getState().isPlaying).toBe(false)
    })

    it('endScrub() clears isScrubbing', () => {
      useComparisonStore.setState({ isScrubbing: true })
      useComparisonStore.getState().endScrub()
      expect(useComparisonStore.getState().isScrubbing).toBe(false)
    })

    it('reset() returns to step 0 and default speed', () => {
      seedReadySlots()
      useComparisonStore.setState({ stepIndex: 2, speed: 4, isPlaying: true })
      useComparisonStore.getState().reset()
      const s = useComparisonStore.getState()
      expect(s.stepIndex).toBe(0)
      expect(s.speed).toBe(1)
      expect(s.isPlaying).toBe(false)
    })
  })

  describe('run orchestration', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    const RUN_RESPONSE_A = { id: 101, module_type: 'graph', algorithm_key: 'bfs', summary: { nodes_visited: 8 } }
    const RUN_RESPONSE_B = { id: 102, module_type: 'graph', algorithm_key: 'dijkstra', summary: { nodes_visited: 5 } }
    const TIMELINE_A = { steps: SAMPLE_TIMELINE_A }
    const TIMELINE_B = { steps: SAMPLE_TIMELINE_B }

    it('runAll() executes all slots and loads timelines', async () => {
      runsService.createRun
        .mockResolvedValueOnce(RUN_RESPONSE_A)
        .mockResolvedValueOnce(RUN_RESPONSE_B)
      runsService.getTimeline
        .mockResolvedValueOnce(TIMELINE_A)
        .mockResolvedValueOnce(TIMELINE_B)

      const { addSlot, setModuleType, setInputPayload } = useComparisonStore.getState()
      setModuleType('graph')
      addSlot('bfs')
      addSlot('dijkstra')
      setInputPayload({ nodes: [], edges: [] })

      await useComparisonStore.getState().runAll()

      const state = useComparisonStore.getState()
      expect(state.slots[0].status).toBe('ready')
      expect(state.slots[1].status).toBe('ready')
      expect(state.slots[0].runId).toBe(101)
      expect(state.slots[1].runId).toBe(102)
      expect(state.maxSteps).toBe(3)
      expect(state.deltaMetrics).not.toBeNull()
      expect(runsService.createRun).toHaveBeenCalledTimes(2)
      expect(runsService.getTimeline).toHaveBeenCalledTimes(2)
    })

    it('runAll() handles partial failure', async () => {
      runsService.createRun
        .mockResolvedValueOnce(RUN_RESPONSE_A)
        .mockRejectedValueOnce(new Error('Server error'))
      runsService.getTimeline
        .mockResolvedValueOnce(TIMELINE_A)

      const { addSlot, setModuleType, setInputPayload } = useComparisonStore.getState()
      setModuleType('graph')
      addSlot('bfs')
      addSlot('dijkstra')
      setInputPayload({ nodes: [], edges: [] })

      await useComparisonStore.getState().runAll()

      const state = useComparisonStore.getState()
      expect(state.slots[0].status).toBe('ready')
      expect(state.slots[1].status).toBe('error')
      expect(state.slots[1].error).toBe('Server error')
    })

    it('rerunSlot() re-executes a single failed slot', async () => {
      useComparisonStore.setState({
        moduleType: 'graph',
        inputPayload: { nodes: [], edges: [] },
        slots: [
          { id: 'slot-0', algorithmKey: 'bfs', status: 'ready', timeline: SAMPLE_TIMELINE_A, runId: 101, summary: RUN_RESPONSE_A, error: null },
          { id: 'slot-1', algorithmKey: 'dijkstra', status: 'error', timeline: [], runId: null, summary: null, error: 'Server error' },
        ],
      })

      runsService.createRun.mockResolvedValueOnce(RUN_RESPONSE_B)
      runsService.getTimeline.mockResolvedValueOnce(TIMELINE_B)

      await useComparisonStore.getState().rerunSlot('slot-1')

      const state = useComparisonStore.getState()
      expect(state.slots[1].status).toBe('ready')
      expect(state.slots[1].runId).toBe(102)
      expect(runsService.createRun).toHaveBeenCalledTimes(1)
    })
  })
})
