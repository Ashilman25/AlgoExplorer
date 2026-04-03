import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Constants ──────────────────────────────────────────

export const DEFAULTS = { left: 260, right: 300 }

export const CONSTRAINTS = {
  left:   { min: 180, max: 400 },
  right:  { min: 200, max: 500 },
  center: { min: 300 },
}

// ─── Pure helpers ───────────────────────────────────────

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function clampWidth(side, newWidth, otherWidth, containerWidth) {
  const { min, max } = CONSTRAINTS[side]
  const maxAllowed = containerWidth - otherWidth - CONSTRAINTS.center.min
  return clamp(newWidth, min, Math.min(max, maxAllowed))
}

// ─── Session state ──────────────────────────────────────

export const _sessionWidths = new Map()

// ─── Hook ───────────────────────────────────────────────

export function useResizablePanel(layoutKey) {
  const containerRef = useRef(null)
  const containerWidthRef = useRef(0)
  const dragRef = useRef(null)

  const [leftWidth, setLeftWidth] = useState(
    () => _sessionWidths.get(layoutKey)?.left ?? DEFAULTS.left
  )
  const [rightWidth, setRightWidth] = useState(
    () => _sessionWidths.get(layoutKey)?.right ?? DEFAULTS.right
  )
  const [leftDragging, setLeftDragging] = useState(false)
  const [rightDragging, setRightDragging] = useState(false)

  const leftWidthRef = useRef(leftWidth)
  const rightWidthRef = useRef(rightWidth)
  useEffect(() => { leftWidthRef.current = leftWidth }, [leftWidth])
  useEffect(() => { rightWidthRef.current = rightWidth }, [rightWidth])

  // Track container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    containerWidthRef.current = el.getBoundingClientRect().width
    const ro = new ResizeObserver(([entry]) => {
      containerWidthRef.current = entry.contentRect.width
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Persist to session map
  useEffect(() => {
    _sessionWidths.set(layoutKey, { left: leftWidth, right: rightWidth })
  }, [layoutKey, leftWidth, rightWidth])

  const handlePointerDown = useCallback((side, e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === 'left' ? leftWidthRef.current : rightWidthRef.current,
    }
    if (side === 'left') setLeftDragging(true)
    else setRightDragging(true)
    document.body.style.userSelect = 'none'
  }, [])

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return
    const { side, startX, startWidth } = drag
    const deltaX = e.clientX - startX
    const cw = containerWidthRef.current

    if (side === 'left') {
      const raw = startWidth + deltaX
      setLeftWidth(clampWidth('left', raw, rightWidthRef.current, cw))
    } else {
      const raw = startWidth - deltaX
      setRightWidth(clampWidth('right', raw, leftWidthRef.current, cw))
    }
  }, [])

  const handlePointerUp = useCallback((e) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setLeftDragging(false)
    setRightDragging(false)
    document.body.style.userSelect = ''
  }, [])

  const handleDoubleClick = useCallback((side) => {
    if (side === 'left') setLeftWidth(DEFAULTS.left)
    else setRightWidth(DEFAULTS.right)
  }, [])

  return {
    leftWidth,
    rightWidth,
    containerRef,
    leftHandleProps: {
      onPointerDown: (e) => handlePointerDown('left', e),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onDoubleClick: () => handleDoubleClick('left'),
      isDragging: leftDragging,
    },
    rightHandleProps: {
      onPointerDown: (e) => handlePointerDown('right', e),
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onDoubleClick: () => handleDoubleClick('right'),
      isDragging: rightDragging,
    },
  }
}
