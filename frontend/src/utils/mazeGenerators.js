// frontend/src/utils/mazeGenerators.js

/**
 * Recursive backtracker (DFS carve) maze generation.
 * Starts with all cells walled, carves passages by visiting neighbors 2 cells away.
 * Returns Set<string> of wall keys ("row,col").
 */
export function recursiveBacktracker(rows, cols, startCell, endCell) {
  // Start with every cell walled
  const walls = new Set()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      walls.add(`${r},${c}`)
    }
  }

  // visited tracker for the carver (in cell-grid coordinates)
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false))

  // Carver start: use startCell if set, otherwise [1, 1] (or [0,0] for tiny grids)
  const sr = startCell ? startCell[0] : Math.min(1, rows - 1)
  const sc = startCell ? startCell[1] : Math.min(1, cols - 1)

  // Carve the starting cell
  walls.delete(`${sr},${sc}`)
  visited[sr][sc] = true

  const stack = [[sr, sc]]
  const directions = [[0, 2], [0, -2], [2, 0], [-2, 0]]

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1]

    // Collect unvisited neighbors 2 cells away
    const neighbors = []
    for (const [dr, dc] of directions) {
      const nr = cr + dr
      const nc = cc + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        neighbors.push([nr, nc, cr + dr / 2, cc + dc / 2])
      }
    }

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    // Pick a random unvisited neighbor
    const [nr, nc, wr, wc] = neighbors[Math.floor(Math.random() * neighbors.length)]

    // Carve the wall between and the new cell
    walls.delete(`${wr},${wc}`)
    walls.delete(`${nr},${nc}`)
    visited[nr][nc] = true
    stack.push([nr, nc])
  }

  // Ensure start and end pins are passages
  if (startCell) walls.delete(`${startCell[0]},${startCell[1]}`)
  if (endCell) walls.delete(`${endCell[0]},${endCell[1]}`)

  return walls
}


/**
 * Random scatter maze generation.
 * Places walls with given probability, protects start/end pins.
 * Returns Set<string> of wall keys ("row,col").
 */
export function randomScatter(rows, cols, density, startCell, endCell) {
  const walls = new Set()

  const startKey = startCell ? `${startCell[0]},${startCell[1]}` : null
  const endKey = endCell ? `${endCell[0]},${endCell[1]}` : null

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`
      if (key === startKey || key === endKey) continue
      if (Math.random() < density) {
        walls.add(key)
      }
    }
  }

  return walls
}
