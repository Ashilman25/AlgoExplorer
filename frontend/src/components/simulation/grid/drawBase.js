const DARK = {
  gridLine: 'rgba(148,163,184,0.07)',
  wallFill: '#334155',
  wallEdge: '#475569',
}

const LIGHT = {
  gridLine: 'rgba(15,23,42,0.10)',
  wallFill: '#94a3b8',
  wallEdge: '#64748b',
}

/**
 * Draw Layer 1: grid lines + wall fills.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize — logical pixels per cell
 * @param {{ x: number, y: number }} offset — grid centering offset
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} walls — Set of "row,col" strings
 * @param {boolean} isLight — true when light mode is active
 */
export function drawBase(ctx, cellSize, offset, rows, cols, walls, isLight = false) {
  const w = cols * cellSize
  const h = rows * cellSize

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.save()
  ctx.translate(offset.x, offset.y)

  const colors = isLight ? LIGHT : DARK

  // Wall fills
  ctx.fillStyle = colors.wallFill
  for (const key of walls) {
    const [r, c] = key.split(',').map(Number)
    ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
    // 3D raised edge: 1px highlight on top and left
    ctx.fillStyle = colors.wallEdge
    ctx.fillRect(c * cellSize, r * cellSize, cellSize, 1)
    ctx.fillRect(c * cellSize, r * cellSize, 1, cellSize)
    ctx.fillStyle = colors.wallFill
  }

  // Grid lines
  ctx.strokeStyle = colors.gridLine
  ctx.lineWidth = 1

  ctx.beginPath()
  for (let c = 0; c <= cols; c++) {
    const x = c * cellSize
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * cellSize
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
  }
  ctx.stroke()

  ctx.restore()
}
