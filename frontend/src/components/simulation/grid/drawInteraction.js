const HOVER_FILL = 'rgba(148,163,184,0.08)'

const START_PIN = {
  fill: '#a78bfa',
  inner: '#c4b5fd',
  shadowColor: 'rgba(167,139,250,0.45)',
  shadowBlur: 8,
}

const END_PIN = {
  fill: '#fb7185',
  inner: '#fda4af',
  shadowColor: 'rgba(251,113,133,0.45)',
  shadowBlur: 8,
}

/**
 * Draw Layer 5: hover highlight + start/end pins.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number[]|null} hoveredCell — [row, col] or null
 * @param {number[]|null} startCell — [row, col] or null
 * @param {number[]|null} endCell — [row, col] or null
 * @param {boolean} isBuildMode — only show hover in build mode
 */
export function drawInteraction(ctx, cellSize, offset, hoveredCell, startCell, endCell, isBuildMode) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.save()
  ctx.translate(offset.x, offset.y)

  const halfCell = cellSize / 2

  // Hover highlight (build mode only)
  if (isBuildMode && hoveredCell) {
    const [hr, hc] = hoveredCell
    ctx.fillStyle = HOVER_FILL
    ctx.fillRect(hc * cellSize, hr * cellSize, cellSize, cellSize)
  }

  // Start pin
  if (startCell) {
    drawPin(ctx, startCell[1] * cellSize + halfCell, startCell[0] * cellSize + halfCell, cellSize, START_PIN)
  }

  // End pin
  if (endCell) {
    drawPin(ctx, endCell[1] * cellSize + halfCell, endCell[0] * cellSize + halfCell, cellSize, END_PIN)
  }

  ctx.restore()
}

function drawPin(ctx, cx, cy, cellSize, style) {
  const outerR = cellSize * 0.4
  const innerR = cellSize * 0.2

  ctx.shadowBlur = style.shadowBlur
  ctx.shadowColor = style.shadowColor

  // Outer circle
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.fillStyle = style.fill
  ctx.fill()

  // Inner highlight
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.fillStyle = style.inner
  ctx.fill()
}
