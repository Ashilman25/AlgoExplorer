import { hexFromRgb } from './gridMath'

/**
 * Draw Layer 2: continuous thermal field from exploration history.
 *
 * Each explored cell emits a radial gradient. The canvas-level blur filter
 * dissolves individual gradients into a smooth continuous field.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number} rows
 * @param {number} cols
 * @param {Map<string, { r: number, g: number, b: number }>} currentColors — coord_key → current interpolated RGB
 */
export function drawHeatMap(ctx, cellSize, offset, rows, cols, currentColors) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (currentColors.size === 0) return

  ctx.save()
  ctx.translate(offset.x, offset.y)
  ctx.filter = 'blur(4px)'

  const halfCell = cellSize / 2
  const gradientRadius = cellSize * 0.65  // ~1.3x cell radius (radius = half cell)

  for (const [key, color] of currentColors) {
    const [r, c] = key.split(',').map(Number)
    const cx = c * cellSize + halfCell
    const cy = r * cellSize + halfCell

    const hex = hexFromRgb(color.r, color.g, color.b)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, gradientRadius)
    grad.addColorStop(0, `${hex}cc`)    // ~80% opacity at center
    grad.addColorStop(0.6, `${hex}55`)  // ~33% at midpoint
    grad.addColorStop(1, `${hex}00`)    // transparent at edge

    ctx.fillStyle = grad
    ctx.fillRect(
      cx - gradientRadius,
      cy - gradientRadius,
      gradientRadius * 2,
      gradientRadius * 2,
    )
  }

  ctx.restore()
}
