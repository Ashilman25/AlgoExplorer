import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDrag } from '../../src/hooks/useDrag'

describe('useDrag', () => {
  it('returns initial position from defaultPosition', () => {
    const { result } = renderHook(() =>
      useDrag({ defaultPosition: { x: 100, y: 50 } })
    )

    expect(result.current.position).toEqual({ x: 100, y: 50 })
    expect(result.current.isDragging).toBe(false)
  })

  it('defaults to {x: 0, y: 0} when no defaultPosition given', () => {
    const { result } = renderHook(() => useDrag())

    expect(result.current.position).toEqual({ x: 0, y: 0 })
  })

  it('exposes handlePointerDown as a function', () => {
    const { result } = renderHook(() => useDrag())

    expect(typeof result.current.handlePointerDown).toBe('function')
  })
})
