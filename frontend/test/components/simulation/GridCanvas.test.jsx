// frontend/test/components/simulation/GridCanvas.test.jsx
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GridCanvas from '../../../src/components/simulation/GridCanvas'
import { usePlaybackStore } from '../../../src/stores/usePlaybackStore'

// ── Canvas mock ─────────────────────────────────────────────────────────────

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
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
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
}

// ── rAF mock — fires callbacks synchronously but breaks recursion ────────────

function makeSyncRaf() {
  let nextId = 1
  let executing = false
  const mock = vi.fn((cb) => {
    const id = nextId++
    if (!executing) {
      executing = true
      try { cb(performance.now()) } finally { executing = false }
    }
    return id
  })
  return mock
}

// ── Pointer event helper — bypasses jsdom's read-only offsetX ────────────────

function pointerEvent(type, el, { offsetX = 0, offsetY = 0, pointerId = 1 } = {}) {
  const event = createEvent[type](el, { bubbles: true, cancelable: true, pointerId })
  Object.defineProperty(event, 'offsetX', { configurable: true, get: () => offsetX })
  Object.defineProperty(event, 'offsetY', { configurable: true, get: () => offsetY })
  return event
}

function pd(el, opts) { return fireEvent(el, pointerEvent('pointerDown', el, opts)) }
function pm(el, opts) { return fireEvent(el, pointerEvent('pointerMove', el, opts)) }
function pu(el, opts) { return fireEvent(el, pointerEvent('pointerUp', el, opts)) }

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Return a ctx with canvas back-reference so ctx.canvas.width works
  HTMLCanvasElement.prototype.getContext = vi.fn(function () {
    return { ...mockCtx, canvas: this }
  })
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn()
  HTMLCanvasElement.prototype.releasePointerCapture = vi.fn()

  // Sync rAF so the resize effect fires during render and cellSize gets set
  const syncRaf = makeSyncRaf()
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(syncRaf)
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

  usePlaybackStore.setState({
    steps: [],
    totalSteps: 0,
    stepIndex: 0,
    currentStep: null,
    isPlaying: false,
    speed: 1,
    isScrubbing: false,
    isLoading: false,
    error: null,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Render helper ─────────────────────────────────────────────────────────────
// Container is 800×800 → cellSize = floor(min(800/cols, 800/rows)) = 40 for 20×20
// gridOffset = { x: 0, y: 0 } (800 = 20*40 exactly fills the container)

function renderCanvas(props = {}) {
  const containerDiv = document.createElement('div')
  Object.defineProperty(containerDiv, 'getBoundingClientRect', {
    value: () => ({ width: 800, height: 800, top: 0, left: 0, right: 800, bottom: 800 }),
    configurable: true,
  })
  const containerRef = { current: containerDiv }

  const defaultProps = {
    rows: 20,
    cols: 20,
    walls: new Set(),
    startCell: null,
    endCell: null,
    allowDiagonal: false,
    onWallBatch: vi.fn(),
    onStartPlace: vi.fn(),
    onEndPlace: vi.fn(),
    containerRef,
    ...props,
  }

  return render(<GridCanvas {...defaultProps} />)
}

// ── Structure tests ───────────────────────────────────────────────────────────

describe('GridCanvas', () => {
  it('renders 5 canvas elements', () => {
    const { container } = renderCanvas()
    const canvases = container.querySelectorAll('canvas')
    expect(canvases).toHaveLength(5)
  })

  it('applies z-index stacking to canvases', () => {
    const { container } = renderCanvas()
    const canvases = container.querySelectorAll('canvas')
    const zIndices = Array.from(canvases).map((c) => c.style.zIndex)
    expect(zIndices).toEqual(['1', '2', '3', '4', '5'])
  })

  it('sets crosshair cursor in build mode', () => {
    const { container } = renderCanvas()
    const wrapper = container.querySelector('[data-testid="grid-canvas-container"]')
    expect(wrapper.style.cursor).toBe('crosshair')
  })

  it('sets default cursor in playback mode', () => {
    usePlaybackStore.setState({ totalSteps: 5 })
    const { container } = renderCanvas()
    const wrapper = container.querySelector('[data-testid="grid-canvas-container"]')
    expect(wrapper.style.cursor).toBe('default')
  })

  it('shows empty state message when no timeline and no pins', () => {
    renderCanvas()
    expect(screen.getByText(/click to place start/i)).toBeInTheDocument()
  })

  it('hides empty state message when start cell is set', () => {
    renderCanvas({ startCell: [2, 3] })
    expect(screen.queryByText(/click to place start/i)).not.toBeInTheDocument()
  })
})

// ── Build mode interaction tests ──────────────────────────────────────────────
// With 20×20 grid on 800×800 container:
//   cellSize = 40, gridOffset = { x: 0, y: 0 }
//   col = floor(offsetX / 40), row = floor(offsetY / 40)
//
//   offsetX=120, offsetY=80 → col=3, row=2 → [2, 3]
//   offsetX=400, offsetY=400 → col=10, row=10 → [10, 10]
//   offsetX=220, offsetY=220 → col=5, row=5
//   offsetX=260, offsetY=220 → col=6, row=5
//   offsetX=300, offsetY=220 → col=7, row=5

describe('GridCanvas — build mode interactions', () => {
  it('calls onStartPlace on first click', () => {
    const onStartPlace = vi.fn()
    const { container } = renderCanvas({ onStartPlace })
    const topCanvas = container.querySelectorAll('canvas')[4]

    pd(topCanvas, { offsetX: 120, offsetY: 80, pointerId: 1 })
    pu(topCanvas, { offsetX: 120, offsetY: 80, pointerId: 1 })

    expect(onStartPlace).toHaveBeenCalledWith(2, 3)
  })

  it('calls onEndPlace on second click', () => {
    const onEndPlace = vi.fn()
    const { container } = renderCanvas({ startCell: [2, 3], onEndPlace })
    const topCanvas = container.querySelectorAll('canvas')[4]

    pd(topCanvas, { offsetX: 400, offsetY: 400, pointerId: 1 })
    pu(topCanvas, { offsetX: 400, offsetY: 400, pointerId: 1 })

    expect(onEndPlace).toHaveBeenCalledWith(10, 10)
  })

  it('calls onWallBatch for drag painting', () => {
    const onWallBatch = vi.fn()
    const { container } = renderCanvas({ startCell: [0, 0], endCell: [19, 19], onWallBatch })
    const topCanvas = container.querySelectorAll('canvas')[4]

    pd(topCanvas, { offsetX: 220, offsetY: 220, pointerId: 1 })
    pm(topCanvas, { offsetX: 260, offsetY: 220, pointerId: 1 })
    pm(topCanvas, { offsetX: 300, offsetY: 220, pointerId: 1 })
    pu(topCanvas, { offsetX: 300, offsetY: 220, pointerId: 1 })

    expect(onWallBatch).toHaveBeenCalled()
    const [cells, isWall] = onWallBatch.mock.calls[0]
    expect(isWall).toBe(true)
    expect(cells.length).toBeGreaterThanOrEqual(1)
  })

  it('suppresses interactions in playback mode', () => {
    const onStartPlace = vi.fn()
    usePlaybackStore.setState({ totalSteps: 5 })
    const { container } = renderCanvas({ onStartPlace })
    const topCanvas = container.querySelectorAll('canvas')[4]

    pd(topCanvas, { offsetX: 120, offsetY: 80, pointerId: 1 })
    pu(topCanvas, { offsetX: 120, offsetY: 80, pointerId: 1 })

    expect(onStartPlace).not.toHaveBeenCalled()
  })
})
