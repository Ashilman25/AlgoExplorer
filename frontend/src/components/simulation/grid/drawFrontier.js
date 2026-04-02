const FRONTIER_COLOR = { r: 251, g: 191, b: 36 }   // amber-400 #fbbf24
const ACTIVE_COLOR = { r: 34, g: 211, b: 238 }      // cyan-400 #22d3ee

/**
 * Draw Layer 3: frontier glow + active cell indicator.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number[][]} frontierCells — [[row, col], ...]
 * @param {string|null} activeKey — "row,col" of the currently active cell, or null
 * @param {number} pulsePhase — current time in seconds (for sin wave)
 */
export function drawFrontier(ctx, cellSize, offset, frontierCells, activeKey, pulsePhase) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (frontierCells.length === 0 && !activeKey) return

  ctx.save()
  ctx.translate(offset.x, offset.y)

  const halfCell = cellSize / 2
  const pulseOpacity = 0.6 + 0.4 * Math.sin(pulsePhase * 2.5)

  // Frontier cells (amber glow)
  const frontierRadius = cellSize * 0.6  // ~1.2x cell radius
  for (const [r, c] of frontierCells) {
    const key = `${r},${c}`
    if (key === activeKey) continue  // active cell drawn separately

    const cx = c * cellSize + halfCell
    const cy = r * cellSize + halfCell

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, frontierRadius)
    const { r: fr, g: fg, b: fb } = FRONTIER_COLOR
    grad.addColorStop(0, `rgba(${fr},${fg},${fb},${pulseOpacity * 0.8})`)
    grad.addColorStop(0.5, `rgba(${fr},${fg},${fb},${pulseOpacity * 0.3})`)
    grad.addColorStop(1, `rgba(${fr},${fg},${fb},0)`)

    ctx.fillStyle = grad
    ctx.fillRect(
      cx - frontierRadius,
      cy - frontierRadius,
      frontierRadius * 2,
      frontierRadius * 2,
    )
  }

  // Active cell (cyan glow, larger radius)
  if (activeKey) {
    const [ar, ac] = activeKey.split(',').map(Number)
    const cx = ac * cellSize + halfCell
    const cy = ar * cellSize + halfCell
    const activeRadius = cellSize * 0.7  // ~1.4x cell radius

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, activeRadius)
    const { r: cr, g: cg, b: cb } = ACTIVE_COLOR
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},0.9)`)
    grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},0.4)`)
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)

    ctx.fillStyle = grad
    ctx.fillRect(
      cx - activeRadius,
      cy - activeRadius,
      activeRadius * 2,
      activeRadius * 2,
    )
  }

  ctx.restore()
}
