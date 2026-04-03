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
  set font(v) {},
  set textAlign(v) {},
  set textBaseline(v) {},
  fillText: vi.fn(),
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
    mazeType: 'backtracker',
    onGenerate: vi.fn(),
    onMazeTypeChange: vi.fn(),
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

  it('sets crosshair cursor on canvas area in build mode', () => {
    const { container } = renderCanvas()
    // Canvas area is the child div that holds the 5 canvases
    const canvases = container.querySelectorAll('canvas')
    expect(canvases[0].parentElement.style.cursor).toBe('crosshair')
  })

  it('sets default cursor on canvas area in playback mode', () => {
    usePlaybackStore.setState({ totalSteps: 5 })
    const { container } = renderCanvas()
    const canvases = container.querySelectorAll('canvas')
    expect(canvases[0].parentElement.style.cursor).toBe('default')
  })

  it('shows empty state message when no timeline and no pins', () => {
    renderCanvas()
    expect(screen.getByText(/drag to paint walls/i)).toBeInTheDocument()
  })

  it('hides empty state message when start cell is set', () => {
    renderCanvas({ startCell: [2, 3] })
    expect(screen.queryByText(/drag to paint walls/i)).not.toBeInTheDocument()
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
  it('calls onWallBatch incrementally during drag', () => {
    const onWallBatch = vi.fn()
    const { container } = renderCanvas({ startCell: [0, 0], endCell: [19, 19], onWallBatch })
    const topCanvas = container.querySelectorAll('canvas')[4]

    pd(topCanvas, { offsetX: 220, offsetY: 220, pointerId: 1 })
    pm(topCanvas, { offsetX: 260, offsetY: 220, pointerId: 1 })
    pm(topCanvas, { offsetX: 300, offsetY: 220, pointerId: 1 })
    pu(topCanvas, { offsetX: 300, offsetY: 220, pointerId: 1 })

    // First move applies origin cell + new cell, second move applies another
    expect(onWallBatch).toHaveBeenCalledTimes(3)
    expect(onWallBatch.mock.calls[0][1]).toBe(true) // paint mode
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

describe('GridCanvas — pin drag-and-drop', () => {
  it('shows grab cursor on unplaced start tray badge', () => {
    renderCanvas()
    const badge = screen.getByLabelText('Start pin — not placed')
    expect(badge.style.cursor).toBe('grab')
  })

  it('shows default cursor on placed start tray badge', () => {
    renderCanvas({ startCell: [2, 3] })
    const badge = screen.getByLabelText('Start pin placed')
    expect(badge.style.cursor).toBe('default')
  })

  it('shows grab cursor on unplaced end tray badge', () => {
    renderCanvas({ startCell: [0, 0] })
    const badge = screen.getByLabelText('End pin — not placed')
    expect(badge.style.cursor).toBe('grab')
  })

  it('shows ghost pin during tray drag', () => {
    renderCanvas()
    const badge = screen.getByLabelText('Start pin — not placed')

    // Start drag from tray
    fireEvent.pointerDown(badge, { clientX: 100, clientY: 50 })

    // Move to trigger ghost
    fireEvent.pointerMove(document, { clientX: 200, clientY: 200 })

    const ghost = screen.getByTestId('ghost-pin')
    expect(ghost).toBeInTheDocument()
    expect(ghost.style.pointerEvents).toBe('none')

    // Release
    fireEvent.pointerUp(document)
    expect(screen.queryByTestId('ghost-pin')).not.toBeInTheDocument()
  })

  it('places start pin via tray drag onto grid', () => {
    const onStartPlace = vi.fn()
    const { container } = renderCanvas({ onStartPlace })
    const badge = screen.getByLabelText('Start pin — not placed')

    // Start drag from tray
    fireEvent.pointerDown(badge, { clientX: 50, clientY: 20 })

    // Mock getBoundingClientRect for the top canvas (layer 5)
    const topCanvas = container.querySelectorAll('canvas')[4]
    Object.defineProperty(topCanvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 800 }),
      configurable: true,
    })

    // clientX=120, clientY=80 → ox=120, oy=80 → col=3, row=2
    fireEvent.pointerMove(document, { clientX: 120, clientY: 80 })
    fireEvent.pointerUp(document)

    expect(onStartPlace).toHaveBeenCalledWith(2, 3)
  })

  it('does not place pin when dropped on a wall', () => {
    const onStartPlace = vi.fn()
    const walls = new Set(['2,3'])
    const { container } = renderCanvas({ onStartPlace, walls })
    const badge = screen.getByLabelText('Start pin — not placed')

    fireEvent.pointerDown(badge, { clientX: 50, clientY: 20 })

    const topCanvas = container.querySelectorAll('canvas')[4]
    Object.defineProperty(topCanvas, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 800 }),
      configurable: true,
    })

    // Cell [2,3] is a wall
    fireEvent.pointerMove(document, { clientX: 120, clientY: 80 })
    fireEvent.pointerUp(document)

    expect(onStartPlace).not.toHaveBeenCalled()
  })

  it('removes start pin on click (no drag)', () => {
    const onStartPlace = vi.fn()
    const { container } = renderCanvas({ startCell: [5, 5], onStartPlace })
    const topCanvas = container.querySelectorAll('canvas')[4]

    // Click on the start pin center: cell [5,5] → center at (5*40+20, 5*40+20) = (220, 220)
    pd(topCanvas, { offsetX: 220, offsetY: 220, pointerId: 1 })
    pu(topCanvas, { offsetX: 220, offsetY: 220, pointerId: 1 })

    expect(onStartPlace).toHaveBeenCalledWith(null, null)
  })

  it('removes end pin on click (no drag)', () => {
    const onEndPlace = vi.fn()
    const { container } = renderCanvas({ startCell: [0, 0], endCell: [10, 10], onEndPlace })
    const topCanvas = container.querySelectorAll('canvas')[4]

    // Click on end pin center: cell [10,10] → center at (420, 420)
    pd(topCanvas, { offsetX: 420, offsetY: 420, pointerId: 1 })
    pu(topCanvas, { offsetX: 420, offsetY: 420, pointerId: 1 })

    expect(onEndPlace).toHaveBeenCalledWith(null, null)
  })
})

// ── Split button (maze generation) tests ─────────────────────────────────────

describe('GridCanvas — maze generate split button', () => {
  it('renders Generate button in build mode', () => {
    renderCanvas({ mazeType: 'backtracker', onGenerate: vi.fn(), onMazeTypeChange: vi.fn() })
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })

  it('hides Generate button in playback mode', () => {
    usePlaybackStore.setState({ totalSteps: 5 })
    renderCanvas({ mazeType: 'backtracker', onGenerate: vi.fn(), onMazeTypeChange: vi.fn() })
    expect(screen.queryByText('Generate')).not.toBeInTheDocument()
  })

  it('calls onGenerate when Generate button is clicked', () => {
    const onGenerate = vi.fn()
    renderCanvas({ mazeType: 'backtracker', onGenerate, onMazeTypeChange: vi.fn() })
    fireEvent.click(screen.getByText('Generate'))
    expect(onGenerate).toHaveBeenCalledOnce()
  })

  it('opens dropdown when chevron is clicked', () => {
    renderCanvas({ mazeType: 'backtracker', onGenerate: vi.fn(), onMazeTypeChange: vi.fn() })
    fireEvent.click(screen.getByLabelText('Maze type menu'))
    expect(screen.getByText('Recursive Backtracker')).toBeInTheDocument()
    expect(screen.getByText('Random Scatter')).toBeInTheDocument()
  })

  it('closes dropdown when chevron is clicked again', () => {
    renderCanvas({ mazeType: 'backtracker', onGenerate: vi.fn(), onMazeTypeChange: vi.fn() })
    fireEvent.click(screen.getByLabelText('Maze type menu'))
    expect(screen.getByText('Recursive Backtracker')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Maze type menu'))
    expect(screen.queryByText('Recursive Backtracker')).not.toBeInTheDocument()
  })

  it('calls onMazeTypeChange and closes dropdown when option is clicked', () => {
    const onMazeTypeChange = vi.fn()
    renderCanvas({ mazeType: 'backtracker', onGenerate: vi.fn(), onMazeTypeChange })
    fireEvent.click(screen.getByLabelText('Maze type menu'))
    fireEvent.click(screen.getByText('Random Scatter'))
    expect(onMazeTypeChange).toHaveBeenCalledWith('scatter')
    // Dropdown should close
    expect(screen.queryByText('Carved maze with corridors')).not.toBeInTheDocument()
  })

  it('shows checkmark on the active maze type', () => {
    renderCanvas({ mazeType: 'scatter', onGenerate: vi.fn(), onMazeTypeChange: vi.fn() })
    fireEvent.click(screen.getByLabelText('Maze type menu'))
    // The active option (scatter) should have the checkmark
    const scatterRow = screen.getByText('Random Scatter').closest('[data-maze-option]')
    expect(scatterRow.querySelector('[data-checkmark]')).toBeInTheDocument()
    // The inactive option (backtracker) should not
    const backtrackerRow = screen.getByText('Recursive Backtracker').closest('[data-maze-option]')
    expect(backtrackerRow.querySelector('[data-checkmark]')).not.toBeInTheDocument()
  })
})
