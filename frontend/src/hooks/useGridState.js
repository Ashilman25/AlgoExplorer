// frontend/src/hooks/useGridState.js

import { useState, useCallback, useRef, useEffect } from 'react'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { recursiveBacktracker, randomScatter } from '../utils/mazeGenerators'

function clearStores() {
  usePlaybackStore.getState().clearTimeline()
  useRunStore.getState().clearRun()
}

function generateWalls(type, rows, cols, density, start, end) {
  if (type === 'backtracker') return recursiveBacktracker(rows, cols, start, end)
  if (type === 'scatter') return randomScatter(rows, cols, density, start, end)
  return new Set()
}

export function useGridState(initialState) {
  const [rows, setRowsRaw] = useState(initialState?.rows ?? 20)
  const [cols, setColsRaw] = useState(initialState?.cols ?? 20)
  const [walls, setWalls] = useState(() => initialState?.walls ?? new Set())
  const [startCell, setStartCell] = useState(initialState?.startCell ?? null)
  const [endCell, setEndCell] = useState(initialState?.endCell ?? null)
  const [allowDiagonal, setAllowDiagonalRaw] = useState(initialState?.allowDiagonal ?? false)
  const [mazeType, setMazeTypeRaw] = useState('none')
  const [density, setDensityRaw] = useState(initialState?.density ?? 0.25)

  // Ref tracks latest values so memoized callbacks never go stale
  const ref = useRef({ rows, cols, walls, startCell, endCell, allowDiagonal, density, mazeType })
  useEffect(() => {
    ref.current = { rows, cols, walls, startCell, endCell, allowDiagonal, density, mazeType }
  })

  const applyMaze = useCallback((type, d) => {
    const { rows: r, cols: c, startCell: sc, endCell: ec } = ref.current
    const newWalls = generateWalls(type, r, c, d, sc, ec)
    setWalls(newWalls)
    if (sc && newWalls.has(`${sc[0]},${sc[1]}`)) setStartCell(null)
    if (ec && newWalls.has(`${ec[0]},${ec[1]}`)) setEndCell(null)
  }, [])

  const handleWallBatch = useCallback((keys, paint) => {
    setWalls((prev) => {
      const next = new Set(prev)
      for (const k of keys) {
        if (paint) next.add(k)
        else next.delete(k)
      }
      return next
    })
    clearStores()
  }, [])

  const handleStartPlace = useCallback((row, col) => {
    setStartCell(row == null ? null : [row, col])
    clearStores()
  }, [])

  const handleEndPlace = useCallback((row, col) => {
    setEndCell(row == null ? null : [row, col])
    clearStores()
  }, [])

  const setDimensions = useCallback((newRows, newCols) => {
    const { rows: curRows, cols: curCols } = ref.current
    if (newRows === curRows && newCols === curCols) return
    setRowsRaw(newRows)
    setColsRaw(newCols)
    setWalls(new Set())
    setStartCell(null)
    setEndCell(null)
    setMazeTypeRaw('none')
    clearStores()
  }, [])

  const setAllowDiagonal = useCallback((val) => {
    setAllowDiagonalRaw(val)
    clearStores()
  }, [])

  const setMazeType = useCallback((type) => {
    setMazeTypeRaw(type)
    applyMaze(type, ref.current.density)
    clearStores()
  }, [applyMaze])

  const setDensity = useCallback((d) => {
    setDensityRaw(d)
    if (ref.current.mazeType === 'scatter') {
      applyMaze('scatter', d)
    }
    clearStores()
  }, [applyMaze])

  const clearWalls = useCallback(() => {
    setWalls(new Set())
    clearStores()
  }, [])

  const resetGrid = useCallback(() => {
    setWalls(new Set())
    setStartCell(null)
    setEndCell(null)
    setMazeTypeRaw('none')
    clearStores()
  }, [])

  const buildGridPayload = useCallback(() => {
    const { startCell: sc, endCell: ec, rows: r, cols: c, walls: w, allowDiagonal: diag } = ref.current
    if (!sc || !ec) return null

    const grid = Array.from({ length: r }, (_, row) =>
      Array.from({ length: c }, (_, col) => (w.has(`${row},${col}`) ? 1 : 0)),
    )

    return {
      grid,
      source: { row: sc[0], col: sc[1] },
      target: { row: ec[0], col: ec[1] },
      weighted: false,
      allow_diagonal: diag,
      mode: 'grid',
    }
  }, [])

  return {
    rows, cols, walls, startCell, endCell, allowDiagonal, mazeType, density,
    handleWallBatch, handleStartPlace, handleEndPlace,
    setDimensions, setAllowDiagonal, setMazeType, setDensity,
    clearWalls, resetGrid, buildGridPayload,
  }
}
