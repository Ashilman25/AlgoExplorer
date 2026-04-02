// frontend/src/components/simulation/GridCanvas.jsx

import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
    setPreviewPin,
  } = useGridCanvas({ rows, cols, walls, startCell, endCell, containerRef })

  const dragRef = useRef({ active: false, mode: null, cells: [], lastCell: null })

  // Pin drag state
  const pinDragRef = useRef({ active: false, type: null, source: null })
  const snapCellRef = useRef(null)
  const pinHitRef = useRef(null) // tracks pin hit on pointerdown for click-vs-drag
  const [ghostPin, setGhostPin] = useState(null)

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

  const startPinDrag = useCallback((type, source) => {
    pinDragRef.current = { active: true, type, source }
    snapCellRef.current = null

    const onMove = (ev) => {
      // Update ghost pin position (DOM element follows cursor)
      setGhostPin({ type, x: ev.clientX, y: ev.clientY })

      // Hit-test against canvas to find snap cell
      const canvas = canvasRefs.current[4]
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const ox = ev.clientX - rect.left
      const oy = ev.clientY - rect.top
      const cell = hitTestCell(ox, oy, cellSizeRef.current, gridOffsetRef.current, rows, cols)

      // Only snap to non-wall cells
      if (cell && !walls.has(`${cell[0]},${cell[1]}`)) {
        snapCellRef.current = cell
        hoveredCellRef.current = cell
        setPreviewPin({ type, cell })
      } else {
        snapCellRef.current = null
        hoveredCellRef.current = null
        setPreviewPin(null)
      }
      markDirty('interaction')
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)

      const snap = snapCellRef.current
      pinDragRef.current = { active: false, type: null, source: null }
      snapCellRef.current = null
      setGhostPin(null)
      hoveredCellRef.current = null
      setPreviewPin(null)
      markDirty('interaction')

      // Place pin if dropped on a valid non-wall cell
      if (snap) {
        const [r, c] = snap
        if (type === 'start') onStartPlace(r, c)
        else onEndPlace(r, c)
      }
      // If no snap (off-grid or on wall), pin stays cleared (returns to tray)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [rows, cols, walls, canvasRefs, cellSizeRef, gridOffsetRef, hoveredCellRef, markDirty, setPreviewPin, onStartPlace, onEndPlace])

  const handleTrayPinDown = useCallback((type) => (e) => {
    e.preventDefault()
    startPinDrag(type, 'tray')
  }, [startPinDrag])

  const handlePointerDown = useCallback((e) => {
    if (!isBuildMode) return
    const cell = getCell(e)
    if (!cell) return

    const [r, c] = cell
    const key = `${r},${c}`

    // Check if clicking on a placed pin (for click-to-remove or drag-to-reposition)
    const cellSize = cellSizeRef.current
    const off = gridOffsetRef.current
    const { x, y } = getOffset(e)

    const hitPin = (pinCell) => {
      if (!pinCell) return false
      const px = pinCell[1] * cellSize + cellSize / 2 + off.x
      const py = pinCell[0] * cellSize + cellSize / 2 + off.y
      return Math.sqrt((x - px) ** 2 + (y - py) ** 2) < cellSize * 0.4
    }

    if (hitPin(startCell)) {
      pinHitRef.current = { type: 'start', startX: e.clientX, startY: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
    if (hitPin(endCell)) {
      pinHitRef.current = { type: 'end', startX: e.clientX, startY: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    // No pin hit — start wall painting
    const isWall = walls.has(key)
    dragRef.current = {
      active: true,
      mode: isWall ? 'erase' : 'paint',
      lastCell: key,
      startCell: cell,
      didMove: false,
    }

    e.currentTarget.setPointerCapture(e.pointerId)
  }, [isBuildMode, getCell, getOffset, walls, startCell, endCell, cellSizeRef, gridOffsetRef])

  const handlePointerMove = useCallback((e) => {
    const cell = getCell(e)

    // Hover tracking (build mode only, not during pin drag)
    if (isBuildMode && !pinDragRef.current.active) {
      const prev = hoveredCellRef.current
      const changed = !cell && prev || cell && (!prev || prev[0] !== cell[0] || prev[1] !== cell[1])
      if (changed) {
        hoveredCellRef.current = cell
        markDirty('interaction')
      }
    }

    // Check pin hit threshold — start drag if moved > 5px
    const hit = pinHitRef.current
    if (hit) {
      const dx = e.clientX - hit.startX
      const dy = e.clientY - hit.startY
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        const type = hit.type
        pinHitRef.current = null
        // Clear the pin from grid and start drag
        if (type === 'start') onStartPlace(null, null)
        else onEndPlace(null, null)
        startPinDrag(type, 'grid')
        return
      }
    }

    // Wall painting
    const drag = dragRef.current
    if (!drag.active || !cell) return

    const key = `${cell[0]},${cell[1]}`
    if (key === drag.lastCell) return

    if (!drag.didMove) {
      drag.didMove = true
      onWallBatch([`${drag.startCell[0]},${drag.startCell[1]}`], drag.mode === 'paint')
    }

    drag.lastCell = key
    onWallBatch([key], drag.mode === 'paint')
  }, [isBuildMode, getCell, hoveredCellRef, markDirty, onWallBatch, onStartPlace, onEndPlace, startPinDrag])

  const handlePointerUp = useCallback((e) => {
    // Pin hit without drag → click-to-remove (return to tray)
    const hit = pinHitRef.current
    if (hit) {
      pinHitRef.current = null
      if (hit.type === 'start') onStartPlace(null, null)
      else onEndPlace(null, null)
      return
    }

    const drag = dragRef.current
    if (!drag.active) return
    drag.active = false

    if (!isBuildMode) return

    // Drag moved — walls already applied incrementally, nothing to do
    if (drag.didMove) return

    // Click on empty cell in wall mode — paint/erase single cell
    const cell = getCell(e)
    if (!cell) return
    const [r, c] = cell
    const key = `${r},${c}`
    onWallBatch([key], drag.mode === 'paint')
  }, [isBuildMode, getCell, onStartPlace, onEndPlace, onWallBatch])

  const handlePointerLeave = useCallback(() => {
    if (hoveredCellRef.current) {
      hoveredCellRef.current = null
      markDirty('interaction')
    }
  }, [hoveredCellRef, markDirty])

  const setCanvasRef = useCallback((index) => (el) => {
    canvasRefs.current[index] = el
  }, [canvasRefs])

  const showEmptyHint = isBuildMode && !startCell && !endCell

  // Next action hint text
  let actionHint = null
  if (isBuildMode) {
    if (!startCell) actionHint = 'Drag S pin onto the grid'
    else if (!endCell) actionHint = 'Drag E pin onto the grid'
    else actionHint = 'Drag to draw walls'
  }

  return (
    <div
      data-testid = "grid-canvas-container"
      style = {{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Pin tray — shows pin placement status */}
      {isBuildMode && (
        <div
          data-testid = "pin-tray"
          style = {{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 10px',
            background: 'rgba(15,23,42,0.6)',
            borderBottom: '1px solid rgba(148,163,184,0.08)',
            flexShrink: 0,
          }}
        >
          {/* Start pin badge */}
          <div
            aria-label = {startCell ? 'Start pin placed' : 'Start pin — not placed'}
            onPointerDown = {!startCell ? handleTrayPinDown('start') : undefined}
            style = {{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 5,
              border: startCell
                ? '1px solid rgba(167,139,250,0.2)'
                : '1px dashed rgba(167,139,250,0.5)',
              background: startCell
                ? 'rgba(167,139,250,0.08)'
                : 'rgba(167,139,250,0.15)',
              opacity: startCell ? 0.6 : 1,
              cursor: startCell ? 'default' : 'grab',
              transition: 'opacity 150ms',
              userSelect: 'none',
            }}
          >
            <span style = {{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#a78bfa',
              border: '1.5px solid #c4b5fd',
              flexShrink: 0,
            }} />
            <span style = {{
              fontSize: 11,
              color: '#c4b5fd',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              {startCell ? `S (${startCell[0]},${startCell[1]})` : 'S — not placed'}
            </span>
          </div>

          {/* End pin badge */}
          <div
            aria-label = {endCell ? 'End pin placed' : 'End pin — not placed'}
            onPointerDown = {!endCell ? handleTrayPinDown('end') : undefined}
            style = {{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 5,
              border: endCell
                ? '1px solid rgba(251,113,133,0.2)'
                : '1px dashed rgba(251,113,133,0.5)',
              background: endCell
                ? 'rgba(251,113,133,0.08)'
                : 'rgba(251,113,133,0.15)',
              opacity: endCell ? 0.6 : 1,
              cursor: endCell ? 'default' : 'grab',
              transition: 'opacity 150ms',
              userSelect: 'none',
            }}
          >
            <span style = {{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#fb7185',
              border: '1.5px solid #fda4af',
              flexShrink: 0,
            }} />
            <span style = {{
              fontSize: 11,
              color: '#fda4af',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              {endCell ? `E (${endCell[0]},${endCell[1]})` : 'E — not placed'}
            </span>
          </div>

          {/* Action hint */}
          {actionHint && (
            <span style = {{
              marginLeft: 'auto',
              fontSize: 11,
              color: '#64748b',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              {actionHint}
            </span>
          )}
        </div>
      )}

      {/* Canvas area */}
      <div style = {{ position: 'relative', flex: 1, minHeight: 0, cursor: isBuildMode ? 'crosshair' : 'default' }}>
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
              Drag pins from the tray onto the grid, then drag to paint walls
            </p>
          </div>
        )}
      </div>

      {/* Ghost pin — portal to body so ancestor transforms don't offset it */}
      {ghostPin && createPortal(
        <div
          data-testid = "ghost-pin"
          style = {{
            position: 'fixed',
            left: ghostPin.x - 12,
            top: ghostPin.y - 12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: ghostPin.type === 'start' ? '#a78bfa' : '#fb7185',
            border: `2px solid ${ghostPin.type === 'start' ? '#c4b5fd' : '#fda4af'}`,
            opacity: 0.8,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />,
        document.body,
      )}
    </div>
  )
}
