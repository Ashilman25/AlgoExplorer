// frontend/src/components/simulation/GridCanvas.jsx

import { useCallback, useRef } from 'react'
import { useGridCanvas } from './grid/useGridCanvas'
import { hitTestCell } from './grid/gridMath'

export default function GridCanvas({
  rows, cols, walls, startCell, endCell,
  onWallBatch, onStartPlace, onEndPlace,
  containerRef,
}) {
  const {
    canvasRefs,
    hoveredCellRef,
    markDirty,
    cellSizeRef,
    gridOffsetRef,
    isBuildMode,
  } = useGridCanvas({ rows, cols, walls, startCell, endCell, containerRef })

  const dragRef = useRef({ active: false, mode: null, cells: [], lastCell: null })

  // Read offset coordinates from a pointer event, supporting both
  // real browsers (nativeEvent.offsetX) and jsdom test environments
  // where fireEvent sets offsetX directly on the synthetic event.
  const getOffset = useCallback((e) => {
    const nx = e.nativeEvent?.offsetX
    const ny = e.nativeEvent?.offsetY
    if (nx != null && ny != null) return { x: nx, y: ny }
    return { x: e.offsetX ?? 0, y: e.offsetY ?? 0 }
  }, [])

  const getCell = useCallback((e) => {
    const { x, y } = getOffset(e)
    return hitTestCell(
      x, y,
      cellSizeRef.current, gridOffsetRef.current, rows, cols,
    )
  }, [rows, cols, cellSizeRef, gridOffsetRef, getOffset])

  const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])

  const handlePointerDown = useCallback((e) => {
    if (!isBuildMode) return
    const cell = getCell(e)
    if (!cell) return

    const [r, c] = cell
    const key = `${r},${c}`
    const isWall = walls.has(key)

    dragRef.current = {
      active: true,
      mode: isWall ? 'erase' : 'paint',
      cells: [key],
      lastCell: key,
      startCell: cell,
      didMove: false,
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }, [isBuildMode, getCell, walls])

  const handlePointerMove = useCallback((e) => {
    const cell = getCell(e)

    if (isBuildMode) {
      const prev = hoveredCellRef.current
      const changed = !cell && prev || cell && (!prev || prev[0] !== cell[0] || prev[1] !== cell[1])
      if (changed) {
        hoveredCellRef.current = cell
        markDirty('interaction')
      }
    }

    const drag = dragRef.current
    if (!drag.active || !cell) return

    const key = `${cell[0]},${cell[1]}`
    if (key === drag.lastCell) return

    drag.didMove = true
    drag.lastCell = key

    const isWall = walls.has(key)
    if ((drag.mode === 'paint' && !isWall) || (drag.mode === 'erase' && isWall)) {
      if (!drag.cells.includes(key)) {
        drag.cells.push(key)
      }
    }
  }, [isBuildMode, getCell, walls, hoveredCellRef, markDirty])

  const handlePointerUp = useCallback((e) => {
    const drag = dragRef.current
    if (!drag.active) return

    drag.active = false

    if (!isBuildMode) return

    const cell = getCell(e)

    if (!drag.didMove) {
      if (!cell) return
      const [r, c] = cell
      const key = `${r},${c}`

      if (walls.has(key)) return

      if (!startCell) {
        onStartPlace(r, c)
      } else if (!endCell) {
        onEndPlace(r, c)
      } else {
        const distToStart = manhattan(cell, startCell)
        const distToEnd = manhattan(cell, endCell)
        if (distToStart <= distToEnd) {
          onStartPlace(r, c)
        } else {
          onEndPlace(r, c)
        }
      }
      return
    }

    if (drag.cells.length > 0) {
      onWallBatch(drag.cells, drag.mode === 'paint')
    }
  }, [isBuildMode, getCell, walls, startCell, endCell, onStartPlace, onEndPlace, onWallBatch])

  const handlePointerLeave = useCallback(() => {
    if (hoveredCellRef.current) {
      hoveredCellRef.current = null
      markDirty('interaction')
    }
  }, [hoveredCellRef, markDirty])

  const setCanvasRef = useCallback((index) => (el) => {
    canvasRefs.current[index] = el
  }, [canvasRefs])

  const showEmptyHint = isBuildMode && !startCell

  return (
    <div
      data-testid = "grid-canvas-container"
      style = {{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: isBuildMode ? 'crosshair' : 'default',
      }}
    >
      {[1, 2, 3, 4, 5].map((z, i) => (
        <canvas
          key = {z}
          ref = {setCanvasRef(i)}
          style = {{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: String(z),
            pointerEvents: i === 4 ? 'auto' : 'none',
          }}
          onPointerDown = {i === 4 ? handlePointerDown : undefined}
          onPointerMove = {i === 4 ? handlePointerMove : undefined}
          onPointerUp = {i === 4 ? handlePointerUp : undefined}
          onPointerLeave = {i === 4 ? handlePointerLeave : undefined}
        />
      ))}

      {showEmptyHint && (
        <div
          style = {{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <p style = {{
            fontSize: '13px',
            color: '#64748b',
            fontFamily: 'var(--font-mono)',
            textAlign: 'center',
            lineHeight: 1.6,
          }}>
            Click to place start &amp; end pins, then drag to paint walls
          </p>
        </div>
      )}
    </div>
  )
}
