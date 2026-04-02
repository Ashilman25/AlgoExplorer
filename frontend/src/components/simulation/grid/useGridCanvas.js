// frontend/src/components/simulation/grid/useGridCanvas.js

import { useEffect, useRef, useCallback } from 'react'
import { usePlaybackStore } from '../../../stores/usePlaybackStore'
import { calcCellSize, calcGridOffset, recencyColor, lerpColor } from './gridMath'
import { drawBase } from './drawBase'
import { drawHeatMap } from './drawHeatMap'
import { drawFrontier } from './drawFrontier'
import { drawPath } from './drawPath'
import { drawInteraction } from './drawInteraction'

const LERP_DURATION_MS = 150
const PATH_DASH_SPEED = 40  // pixels per second

/**
 * Core hook for GridCanvas. Manages:
 * - 5 canvas contexts + dirty flags
 * - Always-on rAF loop
 * - ResizeObserver for responsive sizing
 * - Heat map color interpolation
 * - Frontier pulse + path dash animation
 * - Step-change detection from playback store
 */
export function useGridCanvas({ rows, cols, walls, startCell, endCell, containerRef }) {
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
    // Heat map: Map<coordKey, { current: {r,g,b}, start: {r,g,b}, target: {r,g,b}, startTime: number }>
    heatMapColors: new Map(),
    pulseTime: 0,
    dashOffset: 0,
    lastTime: 0,
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

  // ── markDirty helper ──
  const markDirty = useCallback((layer) => {
    dirtyRef.current[layer] = true
  }, [])

  const markAllDirty = useCallback(() => {
    const d = dirtyRef.current
    d.base = true; d.heatMap = true; d.frontier = true; d.path = true; d.interaction = true
  }, [])

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

  // ── Step change detection ──
  useEffect(() => {
    if (stepIndex === prevStepIndexRef.current) return
    prevStepIndexRef.current = stepIndex

    if (!currentStep) {
      animRef.current.heatMapColors.clear()
      animRef.current.dashOffset = 0
      markAllDirty()
      return
    }

    const sp = currentStep.state_payload
    if (!sp) return

    const now = performance.now()
    const explorationOrder = sp.exploration_order ?? {}
    const heatColors = animRef.current.heatMapColors

    // Update heat map color targets
    for (const [key, exploredAt] of Object.entries(explorationOrder)) {
      const stepsSince = stepIndex - exploredAt
      const targetColor = recencyColor(Math.max(0, stepsSince))

      const existing = heatColors.get(key)
      if (existing) {
        existing.start = { ...existing.current }
        existing.target = targetColor
        existing.startTime = now
      } else {
        heatColors.set(key, {
          current: { ...targetColor },
          start: { ...targetColor },
          target: targetColor,
          startTime: now,
        })
      }
    }

    dirtyRef.current.heatMap = true
    dirtyRef.current.frontier = true
    dirtyRef.current.path = true
  }, [stepIndex, currentStep, markAllDirty])

  // ── Mark dirty on prop changes ──
  useEffect(() => { dirtyRef.current.base = true }, [rows, cols, walls])
  useEffect(() => { dirtyRef.current.interaction = true }, [startCell, endCell])

  // ── rAF loop ──
  useEffect(() => {
    let rafId = null

    function tick(timestamp) {
      rafId = requestAnimationFrame(tick)

      const anim = animRef.current
      const dt = anim.lastTime ? (timestamp - anim.lastTime) / 1000 : 0
      anim.lastTime = timestamp

      // Advance continuous animations
      anim.pulseTime += dt
      anim.dashOffset -= PATH_DASH_SPEED * dt

      const dirty = dirtyRef.current
      const cellSize = cellSizeRef.current
      const offset = gridOffsetRef.current

      // Check if heat map is still interpolating
      let heatMapAnimating = false
      const now = performance.now()
      for (const entry of anim.heatMapColors.values()) {
        const elapsed = now - entry.startTime
        if (elapsed < LERP_DURATION_MS) {
          const t = elapsed / LERP_DURATION_MS
          entry.current = lerpColor(entry.start, entry.target, t)
          heatMapAnimating = true
        } else {
          entry.current = { ...entry.target }
        }
      }
      if (heatMapAnimating) dirty.heatMap = true

      // Layer 1: Base
      if (dirty.base && ctxRefs.current[0]) {
        drawBase(ctxRefs.current[0], cellSize, offset, rows, cols, walls)
        dirty.base = false
      }

      // Layer 2: Heat Map
      if (dirty.heatMap && ctxRefs.current[1]) {
        const currentColors = new Map()
        for (const [key, entry] of anim.heatMapColors) {
          currentColors.set(key, entry.current)
        }
        drawHeatMap(ctxRefs.current[1], cellSize, offset, rows, cols, currentColors)
        dirty.heatMap = false
      }

      // Layer 3: Frontier (always dirty when frontier exists — pulse animation)
      const sp = currentStep?.state_payload
      const frontierCells = sp?.frontier_cells ?? []
      const cellStates = sp?.cell_states ?? {}
      const activeKey = Object.entries(cellStates).find(([, v]) => v === 'active')?.[0] ?? null

      if (frontierCells.length > 0 || activeKey) {
        dirty.frontier = true
      }

      if (dirty.frontier && ctxRefs.current[2]) {
        drawFrontier(ctxRefs.current[2], cellSize, offset, frontierCells, activeKey, anim.pulseTime)
        dirty.frontier = false
      }

      // Layer 4: Path (always dirty when path exists — dash animation)
      const pathData = sp?.path ?? null
      if (pathData && pathData.length >= 2) {
        dirty.path = true
      }

      if (dirty.path && ctxRefs.current[3]) {
        drawPath(ctxRefs.current[3], cellSize, offset, pathData, anim.dashOffset)
        dirty.path = false
      }

      // Layer 5: Interaction
      if (dirty.interaction && ctxRefs.current[4]) {
        drawInteraction(
          ctxRefs.current[4], cellSize, offset,
          hoveredCellRef.current, startCell, endCell, isBuildMode,
        )
        dirty.interaction = false
      }
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [rows, cols, walls, startCell, endCell, currentStep, isBuildMode])

  return {
    canvasRefs,
    hoveredCellRef,
    markDirty,
    cellSizeRef,
    gridOffsetRef,
    isBuildMode,
  }
}
