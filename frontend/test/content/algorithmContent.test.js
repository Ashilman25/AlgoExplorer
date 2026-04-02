import { describe, expect, it } from 'vitest'
import { algorithmContent } from '../../src/content/algorithms'

const ALL_LANGUAGES = ['python', 'javascript', 'java', 'cpp']
const PYTHON_ONLY_KEYS = ['graph/bfs_grid', 'graph/dfs_grid', 'graph/dijkstra_grid', 'graph/astar_grid']

describe('algorithmContent', () => {
  const keys = Object.keys(algorithmContent)

  it('has at least 20 algorithms registered', () => {
    expect(keys.length).toBeGreaterThanOrEqual(20)
  })

  keys.forEach((key) => {
    describe(key, () => {
      const entry = algorithmContent[key]

      it('has a pseudocode array with at least 5 lines', () => {
        expect(Array.isArray(entry.pseudocode)).toBe(true)
        expect(entry.pseudocode.length).toBeGreaterThanOrEqual(5)
        entry.pseudocode.forEach((line) => {
          expect(typeof line).toBe('string')
        })
      })

      const requiredLangs = PYTHON_ONLY_KEYS.includes(key) ? ['python'] : ALL_LANGUAGES

      it(`has code for required languages (${requiredLangs.join(', ')})`, () => {
        expect(entry.code).toBeDefined()
        requiredLangs.forEach((lang) => {
          expect(typeof entry.code[lang]).toBe('string')
          expect(entry.code[lang].length).toBeGreaterThan(10)
        })
      })
    })
  })
})
