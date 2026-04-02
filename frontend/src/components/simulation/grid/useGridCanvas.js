// frontend/src/components/simulation/grid/useGridCanvas.js

import { useEffect, useRef, useCallback } from 'react'
import { usePlaybackStore } from '../../../stores/usePlaybackStore'
import { calcCellSize, calcGridOffset, computeGridDimensions } from './gridMath'
import { drawBase } from './drawBase'
import { drawHeatMap } from './drawHeatMap'
import { drawFrontier } from './drawFrontier'
import { drawPath } from './drawPath'
import { drawInteraction } from './drawInteraction'

const PATH_DASH_SPEED = 40  // pixels per second

/**
 * Compute BFS distance from each explored cell to the nearest path cell.
 * Returns { distMap: Map<string, number>, maxDist: number }
 */
function computeDistFromPath(exploredKeys, path) {
  const distMap = new Map()
  if (!path || path.length === 0) {
    // No path — all explored cells get distance 0 (uniform color)
    for (const key of exploredKeys) distMap.set(key, 0)
    return { distMap, maxDist: 0 }
  }

  // Seed BFS from path cells
  const queue = []
  const pathSet = new Set()
  for (const [r, c] of path) {
    const key = `${r},${c}`
    pathSet.add(key)
    if (exploredKeys.has(key)) {
      distMap.set(key, 0)
      queue.push(key)
    }
  }

  // BFS outward through explored cells only
  let head = 0
  let maxDist = 0
  while (head < queue.length) {
    const key = queue[head++]
    const d = distMap.get(key)
    const [r, c] = key.split(',').map(Number)

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nk = `${r + dr},${c + dc}`
      if (exploredKeys.has(nk) && !distMap.has(nk)) {
        const nd = d + 1
        distMap.set(nk, nd)
        if (nd > maxDist) maxDist = nd
        queue.push(nk)
      }
    }
  }

  // Mark any unreached explored cells at max+1
  for (const key of exploredKeys) {
    if (!distMap.has(key)) {
      distMap.set(key, maxDist + 1)
    }
  }

  return { distMap, maxDist: maxDist + 1 }
}

/**
 * Core hook for GridCanvas. Manages:
 * - 5 canvas contexts + dirty flags
 * - rAF loop (only runs when animating)
 * - ResizeObserver for responsive sizing
 * - Static heat map computed on step change
 */
export function useGridCanvas({ rows, cols, walls, startCell, endCell, containerRef, onDimensionsChange }) {
  // ── Canvas refs ──
  const canvasRefs = useRef([null, null, null, null, null])
  const ctxRefs = useRef([null, null, null, null, null])

  // ── Layout refs ──
  const cellSizeRef = useRef(1)
  const gridOffsetRef = useRef({ x: 0, y: 0 })

  // ── Dirty flags ──
  const dirtyRef = useRef({ base: true, heatMap: true, frontier: true, path: true, interaction: true })

  // ── Animation state ──
  const animRef = useRef({
    pulseTime: 0,
    dashOffset: 0,
    lastTime: 0,
    rafId: null,
    // Pre-computed heat map data (static per step)
    exploredKeys: new Set(),
    distFromPath: new Map(),
    maxDist: 0,
  })

  // ── Playback tracking ──
  const prevStepIndexRef = useRef(-1)

  // ── Hover state ──
  const hoveredCellRef = useRef(null)

  // ── Zustand selectors ──
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const stepIndex = usePlaybackStore((s) => s.stepIndex)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)

  const isBuildMode = totalSteps === 0

  // Mutable ref so the rAF callback always reads latest props/state
  // (avoids stale closures when React re-renders between animation frames)
  const propsRef = useRef({ rows, cols, walls, startCell, endCell, currentStep, isBuildMode, previewPin: null })
  useEffect(() => {
    propsRef.current = { rows, cols, walls, startCell, endCell, currentStep, isBuildMode, previewPin: propsRef.current.previewPin }
  })

  // ── onDimensionsChange ref (avoids stale closure in ResizeObserver) ──
  const onDimensionsChangeRef = useRef(onDimensionsChange)
  useEffect(() => { onDimensionsChangeRef.current = onDimensionsChange })

  // ── markDirty helper ──
  const markDirty = useCallback((layer) => {
    dirtyRef.current[layer] = true
    ensureRaf()
  }, [])

  const markAllDirty = useCallback(() => {
    const d = dirtyRef.current
    d.base = true; d.heatMap = true; d.frontier = true; d.path = true; d.interaction = true
    ensureRaf()
  }, [])

  const setPreviewPin = useCallback((pin) => {
    propsRef.current.previewPin = pin
    markDirty('interaction')
  }, [markDirty])

  // ── rAF management — only runs when needed ──
  function ensureRaf() {
    if (animRef.current.rafId != null) return
    animRef.current.rafId = requestAnimationFrame(tick)
  }

  function tick(timestamp) {
    animRef.current.rafId = null // allow re-scheduling

    // Read from ref so scheduled rAF always sees latest React state
    const p = propsRef.current

    const anim = animRef.current
    const dt = anim.lastTime ? (timestamp - anim.lastTime) / 1000 : 0
    anim.lastTime = timestamp

    // Advance continuous animations
    anim.pulseTime += dt
    anim.dashOffset -= PATH_DASH_SPEED * dt

    const dirty = dirtyRef.current
    const cellSize = cellSizeRef.current
    const offset = gridOffsetRef.current

    // Layer 1: Base
    if (dirty.base && ctxRefs.current[0]) {
      drawBase(ctxRefs.current[0], cellSize, offset, p.rows, p.cols, p.walls)
      dirty.base = false
    }

    // Layer 2: Heat Map (static — no animation, just redraws when data changes)
    if (dirty.heatMap && ctxRefs.current[1]) {
      drawHeatMap(
        ctxRefs.current[1], cellSize, offset, p.rows, p.cols,
        anim.exploredKeys, anim.distFromPath, anim.maxDist,
      )
      dirty.heatMap = false
    }

    // Layer 3: Frontier
    const sp = p.currentStep?.state_payload
    const frontierCells = sp?.frontier_cells ?? []
    const cellStates = sp?.cell_states ?? {}
    const activeKey = Object.entries(cellStates).find(([, v]) => v === 'active')?.[0] ?? null
    const hasFrontier = frontierCells.length > 0 || activeKey

    if (hasFrontier) dirty.frontier = true

    if (dirty.frontier && ctxRefs.current[2]) {
      drawFrontier(ctxRefs.current[2], cellSize, offset, frontierCells, activeKey, anim.pulseTime)
      dirty.frontier = false
    }

    // Layer 4: Path
    const pathData = sp?.path ?? null
    const hasPath = pathData && pathData.length >= 2

    if (hasPath) dirty.path = true

    if (dirty.path && ctxRefs.current[3]) {
      drawPath(ctxRefs.current[3], cellSize, offset, pathData, anim.dashOffset)
      dirty.path = false
    }

    // Layer 5: Interaction
    if (dirty.interaction && ctxRefs.current[4]) {
      drawInteraction(
        ctxRefs.current[4], cellSize, offset,
        hoveredCellRef.current, p.startCell, p.endCell, p.isBuildMode, p.previewPin,
      )
      dirty.interaction = false
    }

    // Keep animating only if there's active animation (frontier pulse or path dash)
    if (hasFrontier || hasPath) {
      animRef.current.rafId = requestAnimationFrame(tick)
    }
  }

  // ── Resize handling ──
  useEffect(() => {
    const container = containerRef?.current
    if (!container) return

    let resizeRafId = null

    const handleResize = () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
      resizeRafId = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const cw = rect.width
        const ch = rect.height

        // Notify parent of computed grid dimensions (only in build mode —
        // during playback, layout shifts must not recompute row/col count)
        if (onDimensionsChangeRef.current && propsRef.current.isBuildMode) {
          const dims = computeGridDimensions(cw, ch)
          onDimensionsChangeRef.current(dims.rows, dims.cols)
        }

        cellSizeRef.current = calcCellSize(cw, ch, rows, cols)
        gridOffsetRef.current = calcGridOffset(cw, ch, cellSizeRef.current, rows, cols)

        // Resize all 5 canvases
        for (let i = 0; i < 5; i++) {
          const canvas = canvasRefs.current[i]
          if (!canvas) continue

          canvas.width = Math.round(cw * dpr)
          canvas.height = Math.round(ch * dpr)
          canvas.style.width = `${cw}px`
          canvas.style.height = `${ch}px`

          const ctx = canvas.getContext('2d')
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctxRefs.current[i] = ctx
        }

        markAllDirty()
      })
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(container)

    // Initial sizing
    handleResize()

    return () => {
      observer.disconnect()
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
    }
  }, [containerRef, rows, cols, markAllDirty])

  // ── Step change detection — compute heat map data once ──
  useEffect(() => {
    if (stepIndex === prevStepIndexRef.current) return
    prevStepIndexRef.current = stepIndex

    const anim = animRef.current

    if (!currentStep) {
      anim.exploredKeys = new Set()
      anim.distFromPath = new Map()
      anim.maxDist = 0
      anim.dashOffset = 0
      markAllDirty()
      return
    }

    const sp = currentStep.state_payload
    if (!sp) return

    // Build explored keys set from exploration_order
    const explorationOrder = sp.exploration_order ?? {}
    const exploredKeys = new Set(Object.keys(explorationOrder))

    // Compute distance-from-path for wifi-signal coloring
    const path = sp.path ?? null
    const { distMap, maxDist } = computeDistFromPath(exploredKeys, path)

    anim.exploredKeys = exploredKeys
    anim.distFromPath = distMap
    anim.maxDist = maxDist

    dirtyRef.current.heatMap = true
    dirtyRef.current.frontier = true
    dirtyRef.current.path = true
    ensureRaf()
  }, [stepIndex, currentStep, markAllDirty])

  // ── Mark dirty on prop changes ──
  useEffect(() => { dirtyRef.current.base = true; ensureRaf() }, [rows, cols, walls])
  useEffect(() => { dirtyRef.current.interaction = true; ensureRaf() }, [startCell, endCell])

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (animRef.current.rafId != null) {
        cancelAnimationFrame(animRef.current.rafId)
        animRef.current.rafId = null
      }
    }
  }, [])

  return {
    canvasRefs,
    hoveredCellRef,
    markDirty,
    cellSizeRef,
    gridOffsetRef,
    isBuildMode,
    setPreviewPin,
  }
}
