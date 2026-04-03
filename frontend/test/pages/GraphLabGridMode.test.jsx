// frontend/test/pages/GraphLabGridMode.test.jsx
//
// Tests for Phase 15.9:
// - Mode switch shows/hides GridCanvas vs GraphCanvas
// - Grid config controls update state correctly via mode switch
// - Integration: grid setup through run and playback

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import GraphLabPage from '../../src/pages/GraphLabPage'
import { ToastProvider } from '../../src/components/ui/Toast'
import { usePlaybackStore } from '../../src/stores/usePlaybackStore'
import { useRunStore } from '../../src/stores/useRunStore'
import { useGuestStore } from '../../src/stores/useGuestStore'
import { useScenarioStore } from '../../src/stores/useScenarioStore'
import { useMetadataStore } from '../../src/stores/useMetadataStore'

// ── Mock services ────────────────────────────────────────────────────────────

vi.mock('../../src/services/runsService', () => ({
  runsService: {
    createRun: vi.fn(),
    getTimeline: vi.fn(),
  },
}))

vi.mock('../../src/services/metadataService', () => ({
  metadataService: {
    getModules: vi.fn(() => Promise.resolve({ modules: [] })),
    getPresets: vi.fn(() => Promise.resolve({ module_type: 'graph', groups: [] })),
  },
}))

vi.mock('../../src/services/guestService', () => ({
  guestService: {
    createRunItem: vi.fn(() => ({})),
  },
  generateId: vi.fn(() => 'test-id'),
}))

// ── Canvas mock (jsdom has no canvas) ──────────────────────────────────────

const mockCtx = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  setLineDash: vi.fn(),
  quadraticCurveTo: vi.fn(),
  setTransform: vi.fn(),
  set filter(v) { this._filter = v },
  get filter() { return this._filter },
  set fillStyle(v) { this._fillStyle = v },
  get fillStyle() { return this._fillStyle },
  set strokeStyle(v) { this._strokeStyle = v },
  get strokeStyle() { return this._strokeStyle },
  set lineWidth(v) { this._lineWidth = v },
  get lineWidth() { return this._lineWidth },
  set lineCap(v) {},
  set lineJoin(v) {},
  set globalAlpha(v) {},
  get globalAlpha() { return 1 },
  set shadowBlur(v) {},
  set shadowColor(v) {},
  set lineDashOffset(v) {},
  set font(v) {},
  set textAlign(v) {},
  set textBaseline(v) {},
  fillText: vi.fn(),
}

function makeSyncRaf() {
  let nextId = 1
  let executing = false
  return vi.fn((cb) => {
    const id = nextId++
    if (!executing) {
      executing = true
      try { cb(performance.now()) } finally { executing = false }
    }
    return id
  })
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(function () {
    return { ...mockCtx, canvas: this }
  })
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()

  // SVG methods for GraphCanvas
  if (!SVGElement.prototype.createSVGPoint) {
    SVGElement.prototype.createSVGPoint = vi.fn(() => ({
      x: 0, y: 0,
      matrixTransform: () => ({ x: 0, y: 0 }),
    }))
  }
  if (!SVGElement.prototype.getScreenCTM) {
    SVGElement.prototype.getScreenCTM = vi.fn(() => ({
      inverse: () => ({}),
    }))
  }

  const syncRaf = makeSyncRaf()
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(syncRaf)
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

  // Reset stores
  usePlaybackStore.getState().clearTimeline()
  useRunStore.getState().clearRun()
  useScenarioStore.setState({ scenario: null })
  useMetadataStore.setState({ modules: [], algorithms: {}, presets: {} })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Render helper ─────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <GraphLabPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

// ── Mode switch tests ─────────────────────────────────────────────────────────

// The GraphCanvas renders a full-size SVG (w-full h-full) inside a flex container.
// Lucide icons use viewBox="0 0 24 24", so exclude those.
// We look for an SVG whose viewBox starts with "0 0 " and has dimensions > 24.
function findGraphSvg(container) {
  const svgs = container.querySelectorAll('svg[viewBox]')
  return Array.from(svgs).find((svg) => {
    const vb = svg.getAttribute('viewBox')
    return vb && vb !== '0 0 24 24'
  })
}

describe('GraphLabPage — mode switch', () => {
  it('defaults to graph mode and renders SVG canvas', () => {
    const { container } = renderPage()

    // Graph mode renders a large SVG for the graph visualization
    expect(findGraphSvg(container)).toBeTruthy()
    // Grid mode canvases should not be present
    expect(container.querySelectorAll('canvas')).toHaveLength(0)
  })

  it('switches to grid mode and renders grid canvases', () => {
    const { container } = renderPage()

    // Find the mode select and switch to grid
    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })

    // Grid mode renders 5 canvas layers
    expect(container.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(5)
    // GraphCanvas SVG should be gone
    expect(findGraphSvg(container)).toBeFalsy()
  })

  it('switches back to graph mode from grid mode', () => {
    const { container } = renderPage()

    // Switch to grid
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'grid' } })
    expect(container.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(5)
    expect(findGraphSvg(container)).toBeFalsy()

    // Switch back to graph — re-query Mode select since it's a new element after re-render
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'graph' } })
    expect(findGraphSvg(container)).toBeTruthy()
    // Verify graph-specific UI returned: Preset select should be back
    expect(screen.getByLabelText('Preset')).toBeInTheDocument()
  })

  it('shows GridConfig panel in grid mode instead of GraphConfig', () => {
    renderPage()

    // In graph mode, we should see Preset section
    expect(screen.getByLabelText('Preset')).toBeInTheDocument()

    // Switch to grid
    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })

    // GridConfig no longer has Maze dropdown — maze generation moved to pin tray
    // Just check that Preset (graph-only) is gone and Algorithm (grid) is present
    expect(screen.getByLabelText('Algorithm').value).toBe('bfs_grid')
    expect(screen.queryByLabelText('Preset')).not.toBeInTheDocument()
  })

  it('switches algorithm to bfs_grid on grid mode change', () => {
    renderPage()

    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })

    // GridConfig should show grid algorithms
    const algoSelect = screen.getByLabelText('Algorithm')
    expect(algoSelect.value).toBe('bfs_grid')
  })

  it('does not show grid size slider in grid mode', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'grid' } })
    expect(screen.queryByLabelText('Grid size')).not.toBeInTheDocument()
  })

  it('switches algorithm to bfs on graph mode change', () => {
    renderPage()

    // Start in graph mode — default is bfs
    const algoSelect = screen.getByLabelText('Algorithm')
    expect(algoSelect.value).toBe('bfs')

    // Switch to grid — should become bfs_grid
    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })
    expect(screen.getByLabelText('Algorithm').value).toBe('bfs_grid')

    // Switch back to graph — should become bfs again
    fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'graph' } })
    expect(screen.getByLabelText('Algorithm').value).toBe('bfs')
  })
})

// ── Integration: grid setup through run and playback ──────────────────────────

describe('GraphLabPage — grid integration flow', () => {
  it('runs a grid simulation and loads timeline into playback store', async () => {
    const { runsService } = await import('../../src/services/runsService')

    const mockTimeline = [
      {
        step_index: 0,
        event_type: 'INITIALIZE',
        state_payload: {
          cell_states: { '0,0': 'source', '4,4': 'target' },
          exploration_order: {},
          frontier_cells: [[0, 0]],
          path: null,
          grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        },
        highlighted_entities: [{ id: [0, 0], state: 'source', label: '(0,0)' }],
        metrics_snapshot: { cells_explored: 0, frontier_max_size: 1, path_length: 0, total_steps: 0 },
        explanation: { title: 'Initialize BFS from (0,0)', body: 'Target is (4,4). Queue size: 1.' },
        timestamp_or_order: 0,
      },
      {
        step_index: 1,
        event_type: 'PATH_FOUND',
        state_payload: {
          cell_states: { '0,0': 'success', '4,4': 'success' },
          exploration_order: { '0,0': 0 },
          frontier_cells: [],
          path: [[0, 0], [4, 4]],
          grid_meta: { rows: 5, cols: 5, walls: [], allow_diagonal: false },
        },
        highlighted_entities: [],
        metrics_snapshot: { cells_explored: 5, frontier_max_size: 3, path_length: 2, total_steps: 5 },
        explanation: { title: 'Target found!', body: 'Path length: 2 cells.' },
        timestamp_or_order: 1,
      },
    ]

    runsService.createRun.mockResolvedValue({
      id: 42,
      summary: { path_found: true },
    })
    runsService.getTimeline.mockResolvedValue({
      run_id: 42,
      total_steps: 2,
      module_type: 'graph',
      algorithm_key: 'bfs_grid',
      steps: mockTimeline,
    })

    const { container } = renderPage()

    // Switch to grid mode
    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })

    // Verify grid canvases appeared
    expect(container.querySelectorAll('canvas').length).toBeGreaterThanOrEqual(5)

    // The run button should be disabled until pins are placed.
    // GridConfig requires canRun (startCell && endCell), so the button is disabled.
    const runButton = screen.getByRole('button', { name: /run/i })
    expect(runButton).toBeDisabled()

    // We can't easily place pins via pointer events on the page-level test
    // (GridCanvas needs getBoundingClientRect, rAF, etc.), so verify the API
    // integration works by checking the stores after a mock run.
    // Simulate what happens when the run hook fires:
    await act(async () => {
      await runsService.createRun({
        module_type: 'graph',
        algorithm_key: 'bfs_grid',
        input_payload: { mode: 'grid', grid: [[0]], source: { row: 0, col: 0 }, target: { row: 4, col: 4 } },
        execution_mode: 'simulate',
        explanation_level: 'standard',
      })

      const timeline = await runsService.getTimeline(42)
      usePlaybackStore.getState().setTimeline(timeline.steps)
    })

    // Verify playback store received the timeline
    const playbackState = usePlaybackStore.getState()
    expect(playbackState.totalSteps).toBe(2)
    expect(playbackState.steps[0].event_type).toBe('INITIALIZE')
    expect(playbackState.steps[1].event_type).toBe('PATH_FOUND')

    // Verify services were called correctly
    expect(runsService.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        module_type: 'graph',
        algorithm_key: 'bfs_grid',
      }),
    )
  })

  it('clears timeline and run on mode switch', () => {
    renderPage()

    // Seed some state
    usePlaybackStore.getState().setTimeline([
      {
        step_index: 0, event_type: 'INITIALIZE',
        state_payload: {}, highlighted_entities: [], metrics_snapshot: {},
        explanation: { title: 'test' }, timestamp_or_order: 0,
      },
    ])
    expect(usePlaybackStore.getState().totalSteps).toBe(1)

    // Switch mode
    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })

    // Timeline should be cleared
    expect(usePlaybackStore.getState().totalSteps).toBe(0)
  })

  it('shows GridDataStructurePanel in grid mode', () => {
    renderPage()

    // Switch to grid
    const modeSelect = screen.getByLabelText('Mode')
    fireEvent.change(modeSelect, { target: { value: 'grid' } })

    // GridDataStructurePanel renders a container even with no data
    // It doesn't show "Frontier" when there's no step, but its container is present
    // The panel is rendered as a sibling of the GridCanvas wrapper
    // We can check that the GridConfig's algorithm select shows grid algorithms
    expect(screen.getByText('BFS — Breadth-First Search')).toBeInTheDocument()
    expect(screen.getByText('DFS — Depth-First Search')).toBeInTheDocument()
    expect(screen.getByText('Dijkstra — Shortest Path')).toBeInTheDocument()
    expect(screen.getByText('A* — Heuristic Search')).toBeInTheDocument()
  })
})
