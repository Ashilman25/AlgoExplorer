const FRONTIER_COLOR = { r: 251, g: 191, b: 36 }   // amber-400 #fbbf24
const ACTIVE_COLOR = { r: 34, g: 211, b: 238 }      // cyan-400 #22d3ee

// Light mode: use darker amber for contrast on white, boost opacity
const FRONTIER_COLOR_LIGHT = { r: 217, g: 119, b: 6 }   // amber-600 #d97706
const ACTIVE_COLOR_LIGHT = { r: 8, g: 145, b: 178 }      // cyan-600 #0891b2

/**
 * Draw Layer 3: frontier glow + active cell indicator.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number[][]} frontierCells — [[row, col], ...]
 * @param {string|null} activeKey — "row,col" of the currently active cell, or null
 * @param {number} pulsePhase — current time in seconds (for sin wave)
 * @param {boolean} isLight — true when light mode is active
 */
export function drawFrontier(ctx, cellSize, offset, frontierCells, activeKey, pulsePhase, isLight = false) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (frontierCells.length === 0 && !activeKey) return

  ctx.save()
  ctx.translate(offset.x, offset.y)

  const halfCell = cellSize / 2
  const pulseOpacity = 0.6 + 0.4 * Math.sin(pulsePhase * 2.5)

  const fColor = isLight ? FRONTIER_COLOR_LIGHT : FRONTIER_COLOR
  const aColor = isLight ? ACTIVE_COLOR_LIGHT : ACTIVE_COLOR
  // Light mode: boost opacity so glows are visible on white
  const opacityMult = isLight ? 1.3 : 1.0

  // Frontier cells (amber glow)
  const frontierRadius = cellSize * 0.6  // ~1.2x cell radius
  for (const [r, c] of frontierCells) {
    const key = `${r},${c}`
    if (key === activeKey) continue  // active cell drawn separately

    const cx = c * cellSize + halfCell
    const cy = r * cellSize + halfCell

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, frontierRadius)
    const { r: fr, g: fg, b: fb } = fColor
    const innerAlpha = Math.min(1, pulseOpacity * 0.8 * opacityMult)
    const midAlpha = Math.min(1, pulseOpacity * 0.3 * opacityMult)
    grad.addColorStop(0, `rgba(${fr},${fg},${fb},${innerAlpha})`)
    grad.addColorStop(0.5, `rgba(${fr},${fg},${fb},${midAlpha})`)
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
    const { r: cr, g: cg, b: cb } = aColor
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${Math.min(1, 0.9 * opacityMult)})`)
    grad.addColorStop(0.4, `rgba(${cr},${cg},${cb},${Math.min(1, 0.4 * opacityMult)})`)
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
