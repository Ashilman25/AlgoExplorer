// Exploration heat — distance from final path, wifi-signal style
// Cells ON the path are brightest; cells further away fade out

const NEAR_PATH_COLOR = { r: 34, g: 211, b: 238 }   // cyan-400
const FAR_COLOR = { r: 71, g: 85, b: 105 }           // slate-600

/**
 * Draw Layer 2: static exploration field colored by distance from path.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} exploredKeys — all explored cell keys ("row,col")
 * @param {Map<string, number>} distFromPath — coord_key → BFS distance from nearest path cell
 * @param {number} maxDist — max distance in the map (for normalization)
 */
export function drawHeatMap(ctx, cellSize, offset, rows, cols, exploredKeys, distFromPath, maxDist) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (exploredKeys.size === 0) return

  ctx.save()
  ctx.translate(offset.x, offset.y)

  const clampMax = Math.max(1, maxDist)

  for (const key of exploredKeys) {
    const dist = distFromPath.get(key) ?? clampMax
    const t = Math.min(1, dist / clampMax) // 0 = on path, 1 = furthest

    // Lerp color from cyan (near path) to slate (far)
    const r = Math.round(NEAR_PATH_COLOR.r + (FAR_COLOR.r - NEAR_PATH_COLOR.r) * t)
    const g = Math.round(NEAR_PATH_COLOR.g + (FAR_COLOR.g - NEAR_PATH_COLOR.g) * t)
    const b = Math.round(NEAR_PATH_COLOR.b + (FAR_COLOR.b - NEAR_PATH_COLOR.b) * t)

    // Opacity fades with distance — on-path cells are bright, far cells are subtle
    const alpha = 0.45 - t * 0.30 // 0.45 at path → 0.15 at max distance

    const [cr, cc] = key.split(',').map(Number)
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    const radius = cellSize * 0.17
    const cx = cc * cellSize + cellSize / 2
    const cy = cr * cellSize + cellSize / 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
