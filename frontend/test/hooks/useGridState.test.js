// frontend/test/hooks/useGridState.test.js

import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useGridState } from '../../src/hooks/useGridState'
import { usePlaybackStore } from '../../src/stores/usePlaybackStore'
import { useRunStore } from '../../src/stores/useRunStore'

// Reset stores before each test
beforeEach(() => {
  usePlaybackStore.getState().clearTimeline()
  useRunStore.getState().clearRun()
})

describe('useGridState', () => {
  describe('initial state', () => {
    it('returns default state with no initialState', () => {
      const { result } = renderHook(() => useGridState())
      expect(result.current.rows).toBe(20)
      expect(result.current.cols).toBe(20)
      expect(result.current.walls).toBeInstanceOf(Set)
      expect(result.current.walls.size).toBe(0)
      expect(result.current.startCell).toBeNull()
      expect(result.current.endCell).toBeNull()
      expect(result.current.allowDiagonal).toBe(false)
      expect(result.current.mazeType).toBe('none')
    })

    it('hydrates from initialState', () => {
      const initial = {
        rows: 10,
        cols: 15,
        walls: new Set(['1,1', '2,2']),
        startCell: [0, 0],
        endCell: [9, 14],
        allowDiagonal: true,
      }
      const { result } = renderHook(() => useGridState(initial))
      expect(result.current.rows).toBe(10)
      expect(result.current.cols).toBe(15)
      expect(result.current.walls.size).toBe(2)
      expect(result.current.startCell).toEqual([0, 0])
      expect(result.current.endCell).toEqual([9, 14])
      expect(result.current.allowDiagonal).toBe(true)
      // mazeType always defaults to 'none' on hydration
      expect(result.current.mazeType).toBe('none')
    })
  })

  describe('handleWallBatch', () => {
    it('adds walls when paint is true', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.handleWallBatch(['1,2', '3,4'], true))
      expect(result.current.walls.has('1,2')).toBe(true)
      expect(result.current.walls.has('3,4')).toBe(true)
    })

    it('removes walls when paint is false', () => {
      const initial = { walls: new Set(['1,2', '3,4', '5,6']) }
      const { result } = renderHook(() => useGridState(initial))
      act(() => result.current.handleWallBatch(['1,2', '3,4'], false))
      expect(result.current.walls.has('1,2')).toBe(false)
      expect(result.current.walls.has('3,4')).toBe(false)
      expect(result.current.walls.has('5,6')).toBe(true)
    })
  })

  describe('handleStartPlace / handleEndPlace', () => {
    it('sets startCell', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.handleStartPlace(3, 5))
      expect(result.current.startCell).toEqual([3, 5])
    })

    it('sets endCell', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.handleEndPlace(7, 8))
      expect(result.current.endCell).toEqual([7, 8])
    })

    it('clears startCell when called with null', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.handleStartPlace(3, 5))
      expect(result.current.startCell).toEqual([3, 5])
      act(() => result.current.handleStartPlace(null, null))
      expect(result.current.startCell).toBeNull()
    })

    it('clears endCell when called with null', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.handleEndPlace(7, 8))
      expect(result.current.endCell).toEqual([7, 8])
      act(() => result.current.handleEndPlace(null, null))
      expect(result.current.endCell).toBeNull()
    })
  })

  describe('setDimensions', () => {
    it('updates rows and cols', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.setDimensions(30, 40))
      expect(result.current.rows).toBe(30)
      expect(result.current.cols).toBe(40)
    })

    it('clears walls and pins when dimensions change', () => {
      const initial = {
        rows: 20,
        cols: 20,
        walls: new Set(['1,1']),
        startCell: [0, 0],
        endCell: [5, 5],
      }
      const { result } = renderHook(() => useGridState(initial))
      act(() => result.current.setDimensions(30, 40))
      expect(result.current.rows).toBe(30)
      expect(result.current.cols).toBe(40)
      expect(result.current.walls.size).toBe(0)
      expect(result.current.startCell).toBeNull()
      expect(result.current.endCell).toBeNull()
      expect(result.current.mazeType).toBe('none')
    })

    it('no-ops when dimensions have not changed', () => {
      const initial = {
        rows: 20,
        cols: 20,
        walls: new Set(['1,1']),
        startCell: [0, 0],
        endCell: [5, 5],
      }
      const { result } = renderHook(() => useGridState(initial))
      act(() => result.current.setDimensions(20, 20))
      // Walls and pins should NOT be cleared
      expect(result.current.walls.size).toBe(1)
      expect(result.current.startCell).toEqual([0, 0])
      expect(result.current.endCell).toEqual([5, 5])
    })
  })

  describe('setAllowDiagonal', () => {
    it('updates the flag', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.setAllowDiagonal(true))
      expect(result.current.allowDiagonal).toBe(true)
    })
  })

  describe('setMazeType', () => {
    it('generates walls when set to backtracker', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.setMazeType('backtracker'))
      expect(result.current.mazeType).toBe('backtracker')
      expect(result.current.walls.size).toBeGreaterThan(0)
    })

    it('generates walls when set to scatter', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.setMazeType('scatter'))
      expect(result.current.mazeType).toBe('scatter')
      // With hardcoded density 0.30 on 20x20, expect some walls
      expect(result.current.walls.size).toBeGreaterThan(0)
    })

    it('clears walls when set to none', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.setMazeType('backtracker'))
      expect(result.current.walls.size).toBeGreaterThan(0)
      act(() => result.current.setMazeType('none'))
      expect(result.current.walls.size).toBe(0)
    })

    it('preserves pins that are not walled over', () => {
      const { result } = renderHook(() => useGridState())
      act(() => {
        result.current.handleStartPlace(0, 0)
        result.current.handleEndPlace(9, 9)
      })
      act(() => result.current.setMazeType('backtracker'))
      // Pins should still exist (generators protect them)
      expect(result.current.startCell).toEqual([0, 0])
      expect(result.current.endCell).toEqual([9, 9])
    })
  })

  describe('generateMaze', () => {
    it('regenerates walls with current mazeType', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.setMazeType('backtracker'))
      const firstWalls = new Set(result.current.walls)
      expect(firstWalls.size).toBeGreaterThan(0)

      let changed = false
      for (let i = 0; i < 5; i++) {
        act(() => result.current.generateMaze())
        if (result.current.walls.size !== firstWalls.size ||
            ![...result.current.walls].every(w => firstWalls.has(w))) {
          changed = true
          break
        }
      }
      expect(changed).toBe(true)
    })

    it('clears walls when mazeType is none', () => {
      const { result } = renderHook(() => useGridState())
      act(() => result.current.handleWallBatch(['1,1', '2,2'], true))
      expect(result.current.walls.size).toBe(2)
      act(() => result.current.generateMaze())
      expect(result.current.walls.size).toBe(0)
    })
  })

  describe('clearWalls', () => {
    it('clears all walls', () => {
      const initial = { walls: new Set(['1,1', '2,2']) }
      const { result } = renderHook(() => useGridState(initial))
      act(() => result.current.clearWalls())
      expect(result.current.walls.size).toBe(0)
    })
  })

  describe('resetGrid', () => {
    it('clears walls, pins, and timeline but preserves rows/cols and allowDiagonal', () => {
      const initial = {
        rows: 30,
        cols: 40,
        walls: new Set(['1,1']),
        startCell: [0, 0],
        endCell: [5, 5],
        allowDiagonal: true,
      }
      const { result } = renderHook(() => useGridState(initial))
      act(() => result.current.resetGrid())
      expect(result.current.walls.size).toBe(0)
      expect(result.current.startCell).toBeNull()
      expect(result.current.endCell).toBeNull()
      expect(result.current.rows).toBe(30)
      expect(result.current.cols).toBe(40)
      expect(result.current.allowDiagonal).toBe(true)
      expect(result.current.mazeType).toBe('none')
    })
  })

  describe('buildGridPayload', () => {
    it('converts state to backend GridInputPayload format', () => {
      const { result } = renderHook(() => useGridState({ rows: 5, cols: 5 }))
      act(() => {
        result.current.handleStartPlace(0, 0)
        result.current.handleEndPlace(4, 4)
        result.current.handleWallBatch(['1,1', '2,2'], true)
        result.current.setAllowDiagonal(true)
      })

      const payload = result.current.buildGridPayload()

      expect(payload.mode).toBe('grid')
      expect(payload.weighted).toBe(false)
      expect(payload.allow_diagonal).toBe(true)
      expect(payload.source).toEqual({ row: 0, col: 0 })
      expect(payload.target).toEqual({ row: 4, col: 4 })
      expect(payload.grid).toHaveLength(5)
      expect(payload.grid[0]).toHaveLength(5)
      expect(payload.grid[1][1]).toBe(1) // wall
      expect(payload.grid[2][2]).toBe(1) // wall
      expect(payload.grid[0][0]).toBe(0) // passable
    })

    it('produces rectangular grid when rows !== cols', () => {
      const { result } = renderHook(() => useGridState({ rows: 10, cols: 15 }))
      act(() => {
        result.current.handleStartPlace(0, 0)
        result.current.handleEndPlace(9, 14)
      })

      const payload = result.current.buildGridPayload()

      expect(payload.grid).toHaveLength(10)
      expect(payload.grid[0]).toHaveLength(15)
    })

    it('returns null when startCell is missing', () => {
      const { result } = renderHook(() => useGridState({ rows: 5, cols: 5 }))
      act(() => result.current.handleEndPlace(4, 4))
      expect(result.current.buildGridPayload()).toBeNull()
    })

    it('returns null when endCell is missing', () => {
      const { result } = renderHook(() => useGridState({ rows: 5, cols: 5 }))
      act(() => result.current.handleStartPlace(0, 0))
      expect(result.current.buildGridPayload()).toBeNull()
    })
  })
})
