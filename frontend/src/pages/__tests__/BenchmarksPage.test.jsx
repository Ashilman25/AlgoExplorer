import { describe, it, expect } from 'vitest'
import {
  BENCHMARK_ALGORITHMS,
  BENCHMARK_INPUT_FAMILIES,
  BENCHMARK_METRICS,
  BENCHMARK_SIZE_PRESETS,
  BENCHMARK_SIZE_LIMITS,
  BENCHMARK_CATEGORIES,
} from '../../config/benchmarkConfig'

describe('benchmarkConfig', () => {
  it('sorting algorithms are a flat array', () => {
    expect(Array.isArray(BENCHMARK_ALGORITHMS.sorting)).toBe(true)
    expect(BENCHMARK_ALGORITHMS.sorting.length).toBeGreaterThan(0)
  })

  it('graph algorithms are keyed by category', () => {
    for (const cat of BENCHMARK_CATEGORIES.graph) {
      const algos = BENCHMARK_ALGORITHMS.graph[cat.key]
      expect(Array.isArray(algos)).toBe(true)
      expect(algos.length).toBeGreaterThan(0)
      for (const algo of algos) {
        expect(algo).toHaveProperty('key')
        expect(algo).toHaveProperty('label')
      }
    }
  })

  it('graph input families are keyed by category', () => {
    for (const cat of BENCHMARK_CATEGORIES.graph) {
      const families = BENCHMARK_INPUT_FAMILIES.graph[cat.key]
      expect(Array.isArray(families)).toBe(true)
      expect(families.length).toBeGreaterThan(0)
    }
  })

  it('graph metrics are keyed by category', () => {
    for (const cat of BENCHMARK_CATEGORIES.graph) {
      const metrics = BENCHMARK_METRICS.graph[cat.key]
      expect(Array.isArray(metrics)).toBe(true)
      expect(metrics.length).toBeGreaterThan(0)
      // Every category includes runtime_ms
      expect(metrics.find((m) => m.key === 'runtime_ms')).toBeTruthy()
    }
  })

  it('graph size presets exist for every input family', () => {
    for (const cat of BENCHMARK_CATEGORIES.graph) {
      const families = BENCHMARK_INPUT_FAMILIES.graph[cat.key]
      for (const family of families) {
        const presets = BENCHMARK_SIZE_PRESETS.graph[family.key]
        expect(Array.isArray(presets)).toBe(true)
        expect(presets.length).toBeGreaterThan(0)
      }
    }
  })

  it('graph size limits exist for every input family', () => {
    for (const cat of BENCHMARK_CATEGORIES.graph) {
      const families = BENCHMARK_INPUT_FAMILIES.graph[cat.key]
      for (const family of families) {
        const limits = BENCHMARK_SIZE_LIMITS.graph[family.key]
        expect(limits).toBeDefined()
        expect(limits.min).toBeLessThan(limits.max)
      }
    }
  })

  it('size presets are within family limits', () => {
    for (const cat of BENCHMARK_CATEGORIES.graph) {
      const families = BENCHMARK_INPUT_FAMILIES.graph[cat.key]
      for (const family of families) {
        const presets = BENCHMARK_SIZE_PRESETS.graph[family.key]
        const limits = BENCHMARK_SIZE_LIMITS.graph[family.key]
        for (const preset of presets) {
          for (const size of preset.sizes) {
            expect(size).toBeGreaterThanOrEqual(limits.min)
            expect(size).toBeLessThanOrEqual(limits.max)
          }
        }
      }
    }
  })

  it('traversal category has bfs and dfs', () => {
    const algos = BENCHMARK_ALGORITHMS.graph.traversal.map((a) => a.key)
    expect(algos).toContain('bfs')
    expect(algos).toContain('dfs')
  })

  it('shortest_path category has dijkstra, astar, bellman_ford', () => {
    const algos = BENCHMARK_ALGORITHMS.graph.shortest_path.map((a) => a.key)
    expect(algos).toContain('dijkstra')
    expect(algos).toContain('astar')
    expect(algos).toContain('bellman_ford')
  })

  it('mst category has prims and kruskals', () => {
    const algos = BENCHMARK_ALGORITHMS.graph.mst.map((a) => a.key)
    expect(algos).toContain('prims')
    expect(algos).toContain('kruskals')
  })

  it('ordering category has topological_sort', () => {
    const algos = BENCHMARK_ALGORITHMS.graph.ordering.map((a) => a.key)
    expect(algos).toContain('topological_sort')
  })
})
