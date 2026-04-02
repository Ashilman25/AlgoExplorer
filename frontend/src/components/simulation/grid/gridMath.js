const AMBER_400 = { r: 251, g: 191, b: 36 }
const ORANGE_400 = { r: 251, g: 146, b: 60 }
const SLATE_500 = { r: 100, g: 116, b: 139 }
const SLATE_600 = { r: 71, g: 85, b: 105 }

export function calcCellSize(containerW, containerH, rows, cols) {
  // Fractional cell size — fills the constraining axis edge-to-edge
  return Math.max(1, Math.min(containerW / cols, containerH / rows))
}

export function calcGridOffset(containerW, containerH, cellSize, rows, cols) {
  // Center on the non-constraining axis only (constraining axis has zero gap)
  const gridW = cols * cellSize
  const gridH = rows * cellSize
  return {
    x: Math.max(0, (containerW - gridW) / 2),
    y: Math.max(0, (containerH - gridH) / 2),
  }
}

export function hitTestCell(offsetX, offsetY, cellSize, gridOffset, rows, cols) {
  const x = offsetX - gridOffset.x
  const y = offsetY - gridOffset.y
  if (x < 0 || y < 0) return null
  const col = Math.floor(x / cellSize)
  const row = Math.floor(y / cellSize)
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null
  return [row, col]
}

export function parseHexColor(hex) {
  const h = hex.startsWith('#') ? hex.slice(1) : hex
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export function hexFromRgb(r, g, b) {
  const toHex = (v) => Math.round(v).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function lerpColor(a, b, t) {
  const ct = Math.max(0, Math.min(1, t))
  return {
    r: Math.round(a.r + (b.r - a.r) * ct),
    g: Math.round(a.g + (b.g - a.g) * ct),
    b: Math.round(a.b + (b.b - a.b) * ct),
  }
}

export function recencyColor(stepsSince) {
  if (stepsSince <= 5) {
    return lerpColor(AMBER_400, ORANGE_400, stepsSince / 5)
  }
  if (stepsSince <= 20) {
    return lerpColor(ORANGE_400, SLATE_500, (stepsSince - 5) / 15)
  }
  return { ...SLATE_600 }
}
