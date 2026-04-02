// Hover fill colors based on what the next click will do
const HOVER_WALL = 'rgba(148,163,184,0.18)'        // slate — painting walls
const HOVER_START = 'rgba(167,139,250,0.25)'        // violet — placing start
const HOVER_END = 'rgba(251,113,133,0.25)'          // rose — placing end
const HOVER_REPOSITION = 'rgba(148,163,184,0.12)'   // subtle — repositioning existing pin

const START_PIN = {
  fill: '#a78bfa',
  inner: '#c4b5fd',
  shadowColor: 'rgba(167,139,250,0.45)',
  shadowBlur: 8,
  label: 'S',
}

const END_PIN = {
  fill: '#fb7185',
  inner: '#fda4af',
  shadowColor: 'rgba(251,113,133,0.45)',
  shadowBlur: 8,
  label: 'E',
}

/**
 * Draw Layer 5: hover highlight + start/end pins + optional preview pin.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cellSize
 * @param {{ x: number, y: number }} offset
 * @param {number[]|null} hoveredCell — [row, col] or null
 * @param {number[]|null} startCell — [row, col] or null
 * @param {number[]|null} endCell — [row, col] or null
 * @param {boolean} isBuildMode — only show hover in build mode
 * @param {{ type: 'start'|'end', cell: number[] }|null} previewPin — snap preview during drag
 */
export function drawInteraction(ctx, cellSize, offset, hoveredCell, startCell, endCell, isBuildMode, previewPin) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.save()
  ctx.translate(offset.x, offset.y)

  const halfCell = cellSize / 2

  // Hover highlight (build mode only)
  if (isBuildMode && hoveredCell) {
    const [hr, hc] = hoveredCell

    // During pin drag, use the pin's color for hover
    let hoverColor = HOVER_WALL
    if (previewPin) {
      hoverColor = previewPin.type === 'start' ? HOVER_START : HOVER_END
    } else if (!startCell) {
      hoverColor = HOVER_START
    } else if (!endCell) {
      hoverColor = HOVER_END
    } else {
      hoverColor = HOVER_REPOSITION
    }

    ctx.fillStyle = hoverColor
    ctx.fillRect(hc * cellSize, hr * cellSize, cellSize, cellSize)

    // Draw a thin border around the hovered cell for clarity
    ctx.strokeStyle = hoverColor.replace(/[\d.]+\)$/, '0.6)')
    ctx.lineWidth = 1.5
    ctx.strokeRect(hc * cellSize + 0.75, hr * cellSize + 0.75, cellSize - 1.5, cellSize - 1.5)
  }

  // Start pin
  if (startCell) {
    drawPin(ctx, startCell[1] * cellSize + halfCell, startCell[0] * cellSize + halfCell, cellSize, START_PIN)
  }

  // End pin
  if (endCell) {
    drawPin(ctx, endCell[1] * cellSize + halfCell, endCell[0] * cellSize + halfCell, cellSize, END_PIN)
  }

  // Preview pin during drag (semi-transparent)
  if (previewPin && previewPin.cell) {
    const [pr, pc] = previewPin.cell
    const style = previewPin.type === 'start' ? START_PIN : END_PIN
    ctx.globalAlpha = 0.5
    drawPin(ctx, pc * cellSize + halfCell, pr * cellSize + halfCell, cellSize, style)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

function drawPin(ctx, cx, cy, cellSize, style) {
  const outerR = cellSize * 0.4
  const innerR = cellSize * 0.15

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

  // Label letter
  if (cellSize >= 14) {
    ctx.fillStyle = '#0f172a'
    ctx.font = `bold ${Math.round(cellSize * 0.3)}px var(--font-mono), monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(style.label, cx, cy + 0.5)
  }
}
