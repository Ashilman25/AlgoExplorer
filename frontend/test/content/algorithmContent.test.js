import { describe, expect, it } from 'vitest'
import { algorithmContent } from '../../src/content/algorithms'

const REQUIRED_LANGUAGES = ['python', 'javascript', 'java', 'cpp']

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

      it('has code for all four required languages', () => {
        expect(entry.code).toBeDefined()
        REQUIRED_LANGUAGES.forEach((lang) => {
          expect(typeof entry.code[lang]).toBe('string')
          expect(entry.code[lang].length).toBeGreaterThan(10)
        })
      })
    })
  })
})
