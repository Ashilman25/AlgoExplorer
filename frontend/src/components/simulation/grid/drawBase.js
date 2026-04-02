const GRID_LINE_COLOR = 'rgba(148,163,184,0.07)'
const WALL_FILL_COLOR = '#1e293b'

/**
 * Draw Layer 1: grid lines + wall fills.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize — logical pixels per cell
 * @param {{ x: number, y: number }} offset — grid centering offset
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} walls — Set of "row,col" strings
 */
export function drawBase(ctx, cellSize, offset, rows, cols, walls) {
  const w = cols * cellSize
  const h = rows * cellSize

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.save()
  ctx.translate(offset.x, offset.y)

  // Wall fills
  ctx.fillStyle = WALL_FILL_COLOR
  for (const key of walls) {
    const [r, c] = key.split(',').map(Number)
    ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
  }

  // Grid lines
  ctx.strokeStyle = GRID_LINE_COLOR
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
