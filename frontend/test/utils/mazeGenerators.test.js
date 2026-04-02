// frontend/test/utils/mazeGenerators.test.js

import { describe, expect, it } from 'vitest'
import { recursiveBacktracker, randomScatter } from '../../src/utils/mazeGenerators'

describe('recursiveBacktracker', () => {
  it('returns a Set of wall key strings', () => {
    const walls = recursiveBacktracker(10, 10, null, null)
    expect(walls).toBeInstanceOf(Set)
    for (const key of walls) {
      expect(key).toMatch(/^\d+,\d+$/)
    }
  })

  it('produces walls within grid bounds', () => {
    const rows = 15
    const cols = 15
    const walls = recursiveBacktracker(rows, cols, null, null)
    for (const key of walls) {
      const [r, c] = key.split(',').map(Number)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(rows)
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThan(cols)
    }
  })

  it('does not wall the startCell position', () => {
    const start = [2, 3]
    const walls = recursiveBacktracker(10, 10, start, null)
    expect(walls.has('2,3')).toBe(false)
  })

  it('does not wall the endCell position', () => {
    const end = [7, 8]
    const walls = recursiveBacktracker(10, 10, null, end)
    expect(walls.has('7,8')).toBe(false)
  })

  it('protects both start and end simultaneously', () => {
    const start = [1, 1]
    const end = [8, 8]
    const walls = recursiveBacktracker(10, 10, start, end)
    expect(walls.has('1,1')).toBe(false)
    expect(walls.has('8,8')).toBe(false)
  })

  it('produces a non-empty wall set for reasonable grid sizes', () => {
    const walls = recursiveBacktracker(11, 11, null, null)
    expect(walls.size).toBeGreaterThan(0)
  })

  it('handles minimum grid size (5x5)', () => {
    const walls = recursiveBacktracker(5, 5, null, null)
    expect(walls).toBeInstanceOf(Set)
    expect(walls.size).toBeGreaterThanOrEqual(0)
  })
})

describe('randomScatter', () => {
  it('returns a Set of wall key strings', () => {
    const walls = randomScatter(10, 10, 0.25, null, null)
    expect(walls).toBeInstanceOf(Set)
    for (const key of walls) {
      expect(key).toMatch(/^\d+,\d+$/)
    }
  })

  it('produces walls within grid bounds', () => {
    const rows = 20
    const cols = 20
    const walls = randomScatter(rows, cols, 0.3, null, null)
    for (const key of walls) {
      const [r, c] = key.split(',').map(Number)
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(rows)
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThan(cols)
    }
  })

  it('does not wall startCell or endCell', () => {
    const start = [0, 0]
    const end = [9, 9]
    // Use high density to make collisions likely
    const walls = randomScatter(10, 10, 0.40, start, end)
    expect(walls.has('0,0')).toBe(false)
    expect(walls.has('9,9')).toBe(false)
  })

  it('respects approximate density', () => {
    const rows = 50
    const cols = 50
    const density = 0.25
    const totalCells = rows * cols
    const walls = randomScatter(rows, cols, density, null, null)
    // Allow wide tolerance since it is random
    expect(walls.size).toBeGreaterThan(totalCells * 0.10)
    expect(walls.size).toBeLessThan(totalCells * 0.45)
  })

  it('handles null pins gracefully', () => {
    const walls = randomScatter(10, 10, 0.2, null, null)
    expect(walls).toBeInstanceOf(Set)
  })

  it('produces zero walls at density 0', () => {
    const walls = randomScatter(10, 10, 0, null, null)
    expect(walls.size).toBe(0)
  })
})
