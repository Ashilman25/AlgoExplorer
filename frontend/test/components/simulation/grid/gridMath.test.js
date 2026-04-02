import { describe, expect, it } from 'vitest'
import {
  calcCellSize,
  calcGridOffset,
  hitTestCell,
  lerpColor,
  recencyColor,
  parseHexColor,
  hexFromRgb,
} from '../../../../src/components/simulation/grid/gridMath'

describe('calcCellSize', () => {
  it('fits a square grid in a square container', () => {
    expect(calcCellSize(800, 800, 20, 20)).toBe(40)
  })
  it('fits a tall grid in a wide container (rows limit)', () => {
    expect(calcCellSize(1000, 500, 50, 20)).toBe(10)
  })
  it('fits a wide grid in a narrow container (cols limit)', () => {
    expect(calcCellSize(400, 800, 10, 40)).toBe(10)
  })
  it('floors to avoid subpixel blur', () => {
    expect(calcCellSize(801, 801, 20, 20)).toBe(40)
  })
  it('returns at least 1 for degenerate sizes', () => {
    expect(calcCellSize(5, 5, 50, 50)).toBe(1)
  })
})

describe('calcGridOffset', () => {
  it('centers grid in a square container with square grid', () => {
    const offset = calcGridOffset(800, 800, 40, 20, 20)
    expect(offset).toEqual({ x: 0, y: 0 })
  })
  it('centers grid horizontally in a wide container', () => {
    const offset = calcGridOffset(1000, 500, 10, 50, 20)
    expect(offset).toEqual({ x: 400, y: 0 })
  })
  it('centers grid vertically in a tall container', () => {
    const offset = calcGridOffset(400, 800, 10, 10, 40)
    expect(offset).toEqual({ x: 0, y: 350 })
  })
})

describe('hitTestCell', () => {
  it('returns row and col for a point inside the grid', () => {
    expect(hitTestCell(120, 80, 40, { x: 0, y: 0 }, 20, 20)).toEqual([2, 3])
  })
  it('accounts for grid offset', () => {
    expect(hitTestCell(520, 80, 40, { x: 400, y: 0 }, 20, 20)).toEqual([2, 3])
  })
  it('returns null for points outside the grid', () => {
    expect(hitTestCell(-10, 50, 40, { x: 0, y: 0 }, 20, 20)).toBeNull()
    expect(hitTestCell(50, 900, 40, { x: 0, y: 0 }, 20, 20)).toBeNull()
  })
  it('clamps to grid bounds', () => {
    expect(hitTestCell(799, 799, 40, { x: 0, y: 0 }, 20, 20)).toEqual([19, 19])
  })
})

describe('parseHexColor', () => {
  it('parses 6-char hex to RGB', () => {
    expect(parseHexColor('#fbbf24')).toEqual({ r: 251, g: 191, b: 36 })
  })
  it('parses lowercase', () => {
    expect(parseHexColor('#0f172a')).toEqual({ r: 15, g: 23, b: 42 })
  })
})

describe('hexFromRgb', () => {
  it('converts RGB to hex', () => {
    expect(hexFromRgb(251, 191, 36)).toBe('#fbbf24')
  })
  it('zero-pads single digit values', () => {
    expect(hexFromRgb(0, 0, 0)).toBe('#000000')
  })
})

describe('lerpColor', () => {
  it('returns start color at t=0', () => {
    expect(lerpColor({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 0))
      .toEqual({ r: 0, g: 0, b: 0 })
  })
  it('returns end color at t=1', () => {
    expect(lerpColor({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, 1))
      .toEqual({ r: 255, g: 255, b: 255 })
  })
  it('interpolates midpoint', () => {
    const result = lerpColor({ r: 0, g: 100, b: 200 }, { r: 100, g: 200, b: 0 }, 0.5)
    expect(result).toEqual({ r: 50, g: 150, b: 100 })
  })
  it('clamps t outside 0-1', () => {
    expect(lerpColor({ r: 0, g: 0, b: 0 }, { r: 100, g: 100, b: 100 }, 1.5))
      .toEqual({ r: 100, g: 100, b: 100 })
  })
})

describe('recencyColor', () => {
  it('returns bright amber for 0 steps since', () => {
    expect(recencyColor(0)).toEqual(parseHexColor('#fbbf24'))
  })
  it('returns orange range for 5 steps since', () => {
    expect(recencyColor(5)).toEqual(parseHexColor('#fb923c'))
  })
  it('returns muted slate for 20 steps since', () => {
    expect(recencyColor(20)).toEqual(parseHexColor('#64748b'))
  })
  it('returns dim slate for 30+ steps since', () => {
    expect(recencyColor(30)).toEqual(parseHexColor('#475569'))
  })
  it('interpolates within the 0-5 range', () => {
    const c = recencyColor(2.5)
    expect(c.r).toBe(251)
    expect(c.g).toBeGreaterThan(140)
    expect(c.g).toBeLessThan(192)
  })
})
