import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { clamp, clampWidth, CONSTRAINTS, DEFAULTS, useResizablePanel, _sessionWidths } from '../../src/hooks/useResizablePanel'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(250, 180, 400)).toBe(250)
  })

  it('clamps below minimum', () => {
    expect(clamp(100, 180, 400)).toBe(180)
  })

  it('clamps above maximum', () => {
    expect(clamp(500, 180, 400)).toBe(400)
  })

  it('returns min when value equals min', () => {
    expect(clamp(180, 180, 400)).toBe(180)
  })

  it('returns max when value equals max', () => {
    expect(clamp(400, 180, 400)).toBe(400)
  })
})

describe('clampWidth', () => {
  it('clamps left panel to its minimum', () => {
    expect(clampWidth('left', 100, 300, 1200)).toBe(CONSTRAINTS.left.min)
  })

  it('clamps left panel to its maximum', () => {
    expect(clampWidth('left', 500, 300, 1200)).toBe(CONSTRAINTS.left.max)
  })

  it('passes through left panel value within range', () => {
    expect(clampWidth('left', 300, 300, 1200)).toBe(300)
  })

  it('clamps right panel to its minimum', () => {
    expect(clampWidth('right', 100, 260, 1200)).toBe(CONSTRAINTS.right.min)
  })

  it('clamps right panel to its maximum', () => {
    expect(clampWidth('right', 600, 260, 1200)).toBe(CONSTRAINTS.right.max)
  })

  it('passes through right panel value within range', () => {
    expect(clampWidth('right', 350, 260, 1200)).toBe(350)
  })

  it('enforces center minimum — left panel cannot squeeze center below 300px', () => {
    // container=900, right=300 → max left = 900 - 300 - 300 = 300
    expect(clampWidth('left', 400, 300, 900)).toBe(300)
  })

  it('enforces center minimum — right panel cannot squeeze center below 300px', () => {
    // container=900, left=260 → max right = 900 - 260 - 300 = 340
    expect(clampWidth('right', 500, 260, 900)).toBe(340)
  })

  it('center enforcement takes precedence over panel max when container is small', () => {
    // container=800, right=300 → max left = 800 - 300 - 300 = 200
    expect(clampWidth('left', 350, 300, 800)).toBe(200)
  })
})

describe('useResizablePanel', () => {
  beforeEach(() => {
    _sessionWidths.clear()
  })

  it('returns default widths on first call', () => {
    const { result } = renderHook(() => useResizablePanel('graph'))
    expect(result.current.leftWidth).toBe(260)
    expect(result.current.rightWidth).toBe(300)
  })

  it('returns a containerRef', () => {
    const { result } = renderHook(() => useResizablePanel('graph'))
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.containerRef.current).toBeNull()
  })

  it('returns handle props with required functions', () => {
    const { result } = renderHook(() => useResizablePanel('graph'))
    const { leftHandleProps, rightHandleProps } = result.current

    expect(typeof leftHandleProps.onPointerDown).toBe('function')
    expect(typeof leftHandleProps.onPointerMove).toBe('function')
    expect(typeof leftHandleProps.onPointerUp).toBe('function')
    expect(typeof leftHandleProps.onDoubleClick).toBe('function')
    expect(leftHandleProps.isDragging).toBe(false)

    expect(typeof rightHandleProps.onPointerDown).toBe('function')
    expect(typeof rightHandleProps.onPointerMove).toBe('function')
    expect(typeof rightHandleProps.onPointerUp).toBe('function')
    expect(typeof rightHandleProps.onDoubleClick).toBe('function')
    expect(rightHandleProps.isDragging).toBe(false)
  })

  it('persists widths to session map', () => {
    renderHook(() => useResizablePanel('graph'))
    const stored = _sessionWidths.get('graph')
    expect(stored).toEqual({ left: 260, right: 300 })
  })

  it('restores widths from session map on remount', () => {
    _sessionWidths.set('sorting', { left: 200, right: 350 })
    const { result } = renderHook(() => useResizablePanel('sorting'))
    expect(result.current.leftWidth).toBe(200)
    expect(result.current.rightWidth).toBe(350)
  })

  it('isolates widths by key', () => {
    _sessionWidths.set('graph', { left: 200, right: 350 })
    const { result } = renderHook(() => useResizablePanel('dp'))
    expect(result.current.leftWidth).toBe(260)
    expect(result.current.rightWidth).toBe(300)
  })

  it('resets left panel to default on double-click', () => {
    _sessionWidths.set('graph', { left: 350, right: 300 })
    const { result } = renderHook(() => useResizablePanel('graph'))
    expect(result.current.leftWidth).toBe(350)

    act(() => {
      result.current.leftHandleProps.onDoubleClick()
    })

    expect(result.current.leftWidth).toBe(260)
  })

  it('resets right panel to default on double-click', () => {
    _sessionWidths.set('graph', { left: 260, right: 450 })
    const { result } = renderHook(() => useResizablePanel('graph'))
    expect(result.current.rightWidth).toBe(450)

    act(() => {
      result.current.rightHandleProps.onDoubleClick()
    })

    expect(result.current.rightWidth).toBe(300)
  })
})
