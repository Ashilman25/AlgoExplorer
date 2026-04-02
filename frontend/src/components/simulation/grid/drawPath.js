const PATH_COLOR = '#34d399'       // emerald-400
const PATH_GLOW_COLOR = '#34d399'
const PATH_LINE_WIDTH = 3
const PATH_SHADOW_BLUR = 12
const PATH_DASH = [12, 8]

/**
 * Draw Layer 4: animated bezier path trace.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number[][]} path — [[row, col], ...] cell coordinates along the path
 * @param {number} dashOffset — current animated dash offset
 */
export function drawPath(ctx, cellSize, offset, path, dashOffset) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (!path || path.length < 2) return

  ctx.save()
  ctx.translate(offset.x, offset.y)

  const halfCell = cellSize / 2

  // Convert path cells to pixel centers
  const points = path.map(([r, c]) => ({
    x: c * cellSize + halfCell,
    y: r * cellSize + halfCell,
  }))

  // Build the bezier path
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  if (points.length === 2) {
    // Straight line for 2-cell path
    ctx.lineTo(points[1].x, points[1].y)
  } else {
    // Quadratic bezier: for each consecutive triple, use midpoints as
    // on-curve points and actual cell centers as control points
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]

      const midX = (curr.x + next.x) / 2
      const midY = (curr.y + next.y) / 2

      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY)
    }

    // Final segment to last point
    const last = points[points.length - 1]
    const secondLast = points[points.length - 2]
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
  }

  // Glow underlay (thicker, no dash)
  ctx.strokeStyle = PATH_COLOR
  ctx.lineWidth = PATH_LINE_WIDTH + 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.15
  ctx.shadowBlur = PATH_SHADOW_BLUR * 2
  ctx.shadowColor = PATH_GLOW_COLOR
  ctx.setLineDash([])
  ctx.stroke()

  // Main path (dashed, animated)
  ctx.globalAlpha = 1
  ctx.lineWidth = PATH_LINE_WIDTH
  ctx.shadowBlur = PATH_SHADOW_BLUR
  ctx.shadowColor = PATH_GLOW_COLOR
  ctx.setLineDash(PATH_DASH)
  ctx.lineDashOffset = dashOffset
  ctx.stroke()

  ctx.restore()
}
