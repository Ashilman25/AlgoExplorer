// frontend/test/pages/PresetMigration.test.jsx
//
// Tests for Phase 16.8: Preset Migration
// - Preset dropdowns render correctly from API data
// - Selecting a preset populates the form with correct input_payload data
// - Fallback behavior if preset fetch fails (graceful degradation)
// - Initial preset auto-application on load

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import GraphLabPage from '../../src/pages/GraphLabPage'
import DpLabPage from '../../src/pages/DpLabPage'
import { ToastProvider } from '../../src/components/ui/Toast'
import { usePlaybackStore } from '../../src/stores/usePlaybackStore'
import { useRunStore } from '../../src/stores/useRunStore'
import { useGuestStore } from '../../src/stores/useGuestStore'
import { useScenarioStore } from '../../src/stores/useScenarioStore'
import { useMetadataStore } from '../../src/stores/useMetadataStore'

// ── Mock preset data (mirrors backend/app/data/presets.py) ──────────────────

const MOCK_GRAPH_PRESETS = {
  module_type: 'graph',
  groups: [
    {
      group_key: 'general',
      presets: [
        {
          key: 'simple-traversal',
          label: 'Simple Traversal — 6 nodes',
          description: 'Simple unweighted graph for breadth-first traversal',
          tags: ['pathfinding'],
          input_payload: {
            nodes: [
              { id: 'A' }, { id: 'B' }, { id: 'C' },
              { id: 'D' }, { id: 'E' }, { id: 'F' },
            ],
            edges: [
              { source: 'A', target: 'B' }, { source: 'A', target: 'C' },
              { source: 'B', target: 'D' }, { source: 'C', target: 'E' },
              { source: 'D', target: 'F' }, { source: 'E', target: 'F' },
            ],
            source: 'A',
            target: 'F',
            weighted: false,
          },
        },
        {
          key: 'weighted-diamond',
          label: 'Weighted Diamond — 5 nodes',
          description: 'Classic diamond graph with weighted edges',
          tags: ['pathfinding'],
          input_payload: {
            nodes: [
              { id: 'S' }, { id: 'A' }, { id: 'B' },
              { id: 'C' }, { id: 'T' },
            ],
            edges: [
              { source: 'S', target: 'A', weight: 1 },
              { source: 'S', target: 'B', weight: 4 },
              { source: 'A', target: 'C', weight: 2 },
              { source: 'B', target: 'C', weight: 1 },
              { source: 'C', target: 'T', weight: 3 },
              { source: 'A', target: 'B', weight: 2 },
            ],
            source: 'S',
            target: 'T',
            weighted: true,
          },
        },
      ],
    },
  ],
}

const MOCK_DP_LCS_PRESETS = {
  module_type: 'dp',
  groups: [
    {
      group_key: 'lcs',
      presets: [
        {
          key: 'short_match',
          label: 'Short — obvious match',
          tags: [],
          input_payload: { string1: 'ABCDEF', string2: 'ACBDFE' },
        },
        {
          key: 'no_match',
          label: 'No common characters',
          tags: [],
          input_payload: { string1: 'ABC', string2: 'XYZ' },
        },
        {
          key: 'medium',
          label: 'Medium strings',
          tags: [],
          input_payload: { string1: 'ALGORITHM', string2: 'ALTRUISTIC' },
        },
      ],
    },
  ],
}

const MOCK_DP_KNAPSACK_PRESETS = {
  module_type: 'dp',
  groups: [
    {
      group_key: 'knapsack_01',
      presets: [
        {
          key: 'textbook',
          label: 'Textbook classic',
          tags: [],
          input_payload: {
            capacity: 10,
            items: [
              { weight: 2, value: 3 },
              { weight: 3, value: 4 },
              { weight: 4, value: 5 },
              { weight: 5, value: 6 },
            ],
          },
        },
      ],
    },
  ],
}

const MOCK_DP_COIN_PRESETS = {
  module_type: 'dp',
  groups: [
    {
      group_key: 'coin_change',
      presets: [
        {
          key: 'us_coins',
          label: 'US coins',
          tags: [],
          input_payload: { coins: [1, 5, 10, 25], target: 41 },
        },
      ],
    },
  ],
}

const MOCK_DP_FIB_PRESETS = {
  module_type: 'dp',
  groups: [
    {
      group_key: 'fibonacci',
      presets: [
        {
          key: 'small',
          label: 'Small (n=8)',
          tags: [],
          input_payload: { n: 8 },
        },
        {
          key: 'medium',
          label: 'Medium (n=15)',
          tags: [],
          input_payload: { n: 15 },
        },
      ],
    },
  ],
}

// ── Mock services ────────────────────────────────────────────────────────────

let mockGetPresets

vi.mock('../../src/services/runsService', () => ({
  runsService: {
    createRun: vi.fn(),
    getTimeline: vi.fn(),
  },
}))

vi.mock('../../src/services/metadataService', () => ({
  metadataService: {
    getModules: vi.fn(() => Promise.resolve({ modules: [] })),
    getPresets: vi.fn((...args) => mockGetPresets(...args)),
  },
}))

vi.mock('../../src/services/guestService', () => ({
  guestService: {
    createRunItem: vi.fn(() => ({})),
  },
  generateId: vi.fn(() => 'test-id'),
}))

// ── Canvas + SVG mocks ───────────────────────────────────────────────────────

const mockCtx = {
  clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(),
  fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  setLineDash: vi.fn(), quadraticCurveTo: vi.fn(), setTransform: vi.fn(),
  set filter(v) { this._filter = v }, get filter() { return this._filter },
  set fillStyle(v) { this._fillStyle = v }, get fillStyle() { return this._fillStyle },
  set strokeStyle(v) { this._strokeStyle = v }, get strokeStyle() { return this._strokeStyle },
  set lineWidth(v) { this._lineWidth = v }, get lineWidth() { return this._lineWidth },
  set lineCap(v) {}, set lineJoin(v) {}, set globalAlpha(v) {},
  get globalAlpha() { return 1 },
  set shadowBlur(v) {}, set shadowColor(v) {}, set lineDashOffset(v) {},
  set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
  fillText: vi.fn(),
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetPresets = vi.fn(() => Promise.resolve({ module_type: 'graph', groups: [] }))

  HTMLCanvasElement.prototype.getContext = vi.fn(function () {
    return { ...mockCtx, canvas: this }
  })
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()

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

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(performance.now())
    return 1
  })
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

  usePlaybackStore.getState().clearTimeline()
  useRunStore.getState().clearRun()
  useScenarioStore.setState({ scenario: null })
  useMetadataStore.setState({ modules: [], algorithms: {}, presets: {}, presetCache: {} })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Render helpers ───────────────────────────────────────────────────────────

function renderGraphLab() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <GraphLabPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function renderDpLab() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DpLabPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

// ── Graph Lab preset tests ───────────────────────────────────────────────────

describe('GraphLabPage — preset dropdown from API', () => {
  it('populates the Preset dropdown with fetched graph presets', async () => {
    mockGetPresets.mockResolvedValue(MOCK_GRAPH_PRESETS)

    renderGraphLab()

    await waitFor(() => {
      expect(screen.getByLabelText('Preset')).toBeInTheDocument()
      const presetSelect = screen.getByLabelText('Preset')
      const options = Array.from(presetSelect.querySelectorAll('option'))
      const labels = options.map((o) => o.textContent)
      expect(labels).toContain('Custom (loaded scenario)')
      expect(labels).toContain('Simple Traversal — 6 nodes')
      expect(labels).toContain('Weighted Diamond — 5 nodes')
    })
  })

  it('auto-applies the first preset on initial load', async () => {
    mockGetPresets.mockResolvedValue(MOCK_GRAPH_PRESETS)

    renderGraphLab()

    await waitFor(() => {
      // First preset is simple-traversal with source=A, target=F
      const sourceSelect = screen.getByLabelText('Source')
      expect(sourceSelect.value).toBe('A')
    })

    const targetSelect = screen.getByLabelText('Target')
    expect(targetSelect.value).toBe('F')

    // 6 nodes from the simple-traversal preset
    const nodeOptions = Array.from(screen.getByLabelText('Source').querySelectorAll('option'))
    expect(nodeOptions).toHaveLength(6)
  })

  it('populates form fields when selecting a different preset', async () => {
    mockGetPresets.mockResolvedValue(MOCK_GRAPH_PRESETS)

    renderGraphLab()

    // Wait for initial presets to load
    await waitFor(() => {
      const options = Array.from(screen.getByLabelText('Preset').querySelectorAll('option'))
      expect(options.length).toBeGreaterThan(1)
    })

    // Switch to weighted-diamond preset
    fireEvent.change(screen.getByLabelText('Preset'), {
      target: { value: 'weighted-diamond' },
    })

    // Should update to weighted-diamond's data
    await waitFor(() => {
      expect(screen.getByLabelText('Source').value).toBe('S')
      expect(screen.getByLabelText('Target').value).toBe('T')
    })

    // weighted-diamond has 5 nodes
    const nodeOptions = Array.from(screen.getByLabelText('Source').querySelectorAll('option'))
    expect(nodeOptions).toHaveLength(5)

    // weighted-diamond has weighted=true
    expect(screen.getByLabelText('Weighted edges').checked).toBe(true)
  })

  it('shows only Custom option when preset fetch fails', async () => {
    mockGetPresets.mockRejectedValue(new Error('Network error'))

    renderGraphLab()

    // Give time for the fetch to fail
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const presetSelect = screen.getByLabelText('Preset')
    const options = Array.from(presetSelect.querySelectorAll('option'))
    expect(options).toHaveLength(1)
    expect(options[0].textContent).toBe('Custom (loaded scenario)')
  })

  it('caches presets in useMetadataStore after first fetch', async () => {
    mockGetPresets.mockResolvedValue(MOCK_GRAPH_PRESETS)

    renderGraphLab()

    await waitFor(() => {
      const options = Array.from(screen.getByLabelText('Preset').querySelectorAll('option'))
      expect(options.length).toBeGreaterThan(1)
    })

    // Store should now have the cached presets
    const cached = useMetadataStore.getState().getPresets('graph', 'bfs')
    expect(cached).not.toBeNull()
    expect(cached).toHaveLength(2)
    expect(cached[0].key).toBe('simple-traversal')
  })
})

// ── DP Lab preset tests ──────────────────────────────────────────────────────

describe('DpLabPage — LCS preset dropdown from API', () => {
  it('populates the Preset dropdown with fetched LCS presets', async () => {
    mockGetPresets.mockResolvedValue(MOCK_DP_LCS_PRESETS)

    renderDpLab()

    await waitFor(() => {
      const presetSelect = screen.getByLabelText('Preset')
      const options = Array.from(presetSelect.querySelectorAll('option'))
      const labels = options.map((o) => o.textContent)
      expect(labels).toContain('Custom')
      expect(labels).toContain('Short — obvious match')
      expect(labels).toContain('No common characters')
      expect(labels).toContain('Medium strings')
    })
  })

  it('auto-applies the first LCS preset (short_match) on initial load', async () => {
    mockGetPresets.mockResolvedValue(MOCK_DP_LCS_PRESETS)

    renderDpLab()

    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
      expect(screen.getByLabelText('String B').value).toBe('ACBDFE')
    })
  })

  it('populates string fields when selecting a different LCS preset', async () => {
    mockGetPresets.mockResolvedValue(MOCK_DP_LCS_PRESETS)

    renderDpLab()

    await waitFor(() => {
      const options = Array.from(screen.getByLabelText('Preset').querySelectorAll('option'))
      expect(options.length).toBeGreaterThan(1)
    })

    fireEvent.change(screen.getByLabelText('Preset'), {
      target: { value: 'medium' },
    })

    expect(screen.getByLabelText('String A').value).toBe('ALGORITHM')
    expect(screen.getByLabelText('String B').value).toBe('ALTRUISTIC')
  })

  it('shows only Custom option when DP preset fetch fails', async () => {
    mockGetPresets.mockRejectedValue(new Error('Server error'))

    renderDpLab()

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const presetSelect = screen.getByLabelText('Preset')
    const options = Array.from(presetSelect.querySelectorAll('option'))
    expect(options).toHaveLength(1)
    expect(options[0].textContent).toBe('Custom')
  })
})

describe('DpLabPage — knapsack preset integration', () => {
  it('fetches knapsack presets when algorithm switches from lcs to knapsack_01', async () => {
    // Both algorithms return real presets — verifies dpPresets is cleared on switch
    mockGetPresets.mockImplementation((moduleType, algorithmKey) => {
      if (algorithmKey === 'lcs') return Promise.resolve(MOCK_DP_LCS_PRESETS)
      if (algorithmKey === 'knapsack_01') return Promise.resolve(MOCK_DP_KNAPSACK_PRESETS)
      return Promise.resolve({ module_type: 'dp', groups: [] })
    })

    renderDpLab()

    // Wait for LCS presets to fully load
    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    // Switch to knapsack — dpPresets should be cleared before new presets arrive
    fireEvent.change(screen.getByLabelText('Algorithm'), {
      target: { value: 'knapsack_01' },
    })

    await waitFor(() => {
      // Knapsack preset auto-applied: capacity=10
      expect(screen.getByLabelText('Capacity').value).toBe('10')
    })

    // Preset dropdown should contain the knapsack presets
    const presetSelect = screen.getByLabelText('Preset')
    const options = Array.from(presetSelect.querySelectorAll('option'))
    const labels = options.map((o) => o.textContent)
    expect(labels).toContain('Textbook classic')
  })
})

describe('DpLabPage — coin change preset integration', () => {
  it('fetches coin change presets when algorithm switches from lcs to coin_change', async () => {
    // Both algorithms return real presets — verifies dpPresets is cleared on switch
    mockGetPresets.mockImplementation((moduleType, algorithmKey) => {
      if (algorithmKey === 'lcs') return Promise.resolve(MOCK_DP_LCS_PRESETS)
      if (algorithmKey === 'coin_change') return Promise.resolve(MOCK_DP_COIN_PRESETS)
      return Promise.resolve({ module_type: 'dp', groups: [] })
    })

    renderDpLab()

    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    fireEvent.change(screen.getByLabelText('Algorithm'), {
      target: { value: 'coin_change' },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Coins').value).toBe('1, 5, 10, 25')
      expect(screen.getByLabelText('Target').value).toBe('41')
    })
  })
})

describe('DpLabPage — fibonacci preset integration', () => {
  it('fetches fibonacci presets when algorithm switches to fibonacci', async () => {
    mockGetPresets.mockImplementation((moduleType, algorithmKey) => {
      if (algorithmKey === 'lcs') return Promise.resolve(MOCK_DP_LCS_PRESETS)
      if (algorithmKey === 'fibonacci') return Promise.resolve(MOCK_DP_FIB_PRESETS)
      return Promise.resolve({ module_type: 'dp', groups: [] })
    })

    renderDpLab()

    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    fireEvent.change(screen.getByLabelText('Algorithm'), {
      target: { value: 'fibonacci' },
    })

    await waitFor(() => {
      // First fib preset is small (n=8)
      expect(screen.getByLabelText('n').value).toBe('8')
    })

    const presetSelect = screen.getByLabelText('Preset')
    const options = Array.from(presetSelect.querySelectorAll('option'))
    const labels = options.map((o) => o.textContent)
    expect(labels).toContain('Small (n=8)')
    expect(labels).toContain('Medium (n=15)')
  })

  it('selects a different fibonacci preset and updates n', async () => {
    mockGetPresets.mockImplementation((moduleType, algorithmKey) => {
      if (algorithmKey === 'lcs') return Promise.resolve(MOCK_DP_LCS_PRESETS)
      if (algorithmKey === 'fibonacci') return Promise.resolve(MOCK_DP_FIB_PRESETS)
      return Promise.resolve({ module_type: 'dp', groups: [] })
    })

    renderDpLab()

    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    // Switch to fibonacci and let all async effects settle
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Algorithm'), {
        target: { value: 'fibonacci' },
      })
      await new Promise((r) => setTimeout(r, 0))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('n').value).toBe('8')
    })

    // Verify presets are loaded in the dropdown before selecting
    const options = Array.from(screen.getByLabelText('Preset').querySelectorAll('option'))
    expect(options.map((o) => o.textContent)).toContain('Medium (n=15)')

    fireEvent.change(screen.getByLabelText('Preset'), {
      target: { value: 'medium' },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('n').value).toBe('15')
    })
  })
})

describe('DpLabPage — preset caching', () => {
  it('caches presets in useMetadataStore after fetch and reuses on switch-back', async () => {
    // Track which algorithm keys were fetched via the API
    const fetchedKeys = []
    mockGetPresets.mockImplementation((moduleType, algorithmKey) => {
      fetchedKeys.push(algorithmKey)
      if (algorithmKey === 'lcs') return Promise.resolve(MOCK_DP_LCS_PRESETS)
      // edit_distance uses same string1/string2 shape, safe for switch-back
      if (algorithmKey === 'edit_distance') return Promise.resolve(MOCK_DP_LCS_PRESETS)
      return Promise.resolve({ module_type: 'dp', groups: [] })
    })

    renderDpLab()

    // Wait for LCS presets to load and cache
    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    // Verify the store has cached the presets
    const cached = useMetadataStore.getState().getPresets('dp', 'lcs')
    expect(cached).not.toBeNull()
    expect(cached).toHaveLength(3)
    expect(cached[0].key).toBe('short_match')

    expect(fetchedKeys.filter((k) => k === 'lcs').length).toBe(1)

    // Switch away to edit_distance
    fireEvent.change(screen.getByLabelText('Algorithm'), {
      target: { value: 'edit_distance' },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    // Switch back to lcs — should use cache, not re-fetch
    fireEvent.change(screen.getByLabelText('Algorithm'), {
      target: { value: 'lcs' },
    })

    await waitFor(() => {
      expect(screen.getByLabelText('String A').value).toBe('ABCDEF')
    })

    // lcs should only have been fetched once (cached on return)
    expect(fetchedKeys.filter((k) => k === 'lcs').length).toBe(1)
  })
})
