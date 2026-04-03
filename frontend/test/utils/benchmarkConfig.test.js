import { describe, it, expect } from 'vitest'
import {
  estimateBenchmarkDuration,
  formatEstimate,
  ALGO_COMPLEXITY,
  BENCHMARK_LIMITS,
  BENCHMARK_SIZE_LIMITS,
  BENCHMARK_ALGORITHMS,
  BENCHMARK_METRICS,
  BENCHMARK_INPUT_FAMILIES,
  BENCHMARK_SIZE_PRESETS,
} from '../../src/config/benchmarkConfig'

// ---------------------------------------------------------------------------
// estimateBenchmarkDuration
// ---------------------------------------------------------------------------

describe('estimateBenchmarkDuration', () => {
  it('returns 0 for unknown algorithms', () => {
    const result = estimateBenchmarkDuration(['unknown_algo'], [100], 1)
    expect(result).toBe(0)
  })

  it('returns positive value for known O(n²) algorithms', () => {
    const result = estimateBenchmarkDuration(['bubble_sort'], [1000], 5)
    expect(result).toBeGreaterThan(0)
  })

  it('returns positive value for known O(n log n) algorithms', () => {
    const result = estimateBenchmarkDuration(['quicksort'], [1000], 5)
    expect(result).toBeGreaterThan(0)
  })

  it('O(n²) estimate is larger than O(n log n) for the same size', () => {
    const n2 = estimateBenchmarkDuration(['bubble_sort'], [5000], 5)
    const nlogn = estimateBenchmarkDuration(['quicksort'], [5000], 5)
    expect(n2).toBeGreaterThan(nlogn)
  })

  it('estimate scales with number of trials', () => {
    const t1 = estimateBenchmarkDuration(['bubble_sort'], [1000], 1)
    const t5 = estimateBenchmarkDuration(['bubble_sort'], [1000], 5)
    expect(t5).toBeCloseTo(t1 * 5, 5)
  })

  it('estimate scales with sizes (more sizes = longer)', () => {
    const small = estimateBenchmarkDuration(['bubble_sort'], [100], 1)
    const multi = estimateBenchmarkDuration(['bubble_sort'], [100, 500, 1000], 1)
    expect(multi).toBeGreaterThan(small)
  })

  it('uses max algorithm time (not sum) for multiple algorithms', () => {
    const n2Only = estimateBenchmarkDuration(['bubble_sort'], [5000], 5)
    const mixed = estimateBenchmarkDuration(['bubble_sort', 'quicksort'], [5000], 5)
    // With multiple algorithms, the estimate is the max per-algorithm time
    // Since bubble_sort dominates, mixed should equal bubble_sort estimate
    expect(mixed).toBe(n2Only)
  })

  it('handles all 6 sorting algorithms', () => {
    const all = ['quicksort', 'mergesort', 'heap_sort', 'bubble_sort', 'insertion_sort', 'selection_sort']
    const result = estimateBenchmarkDuration(all, [1000, 5000, 10000], 5)
    expect(result).toBeGreaterThan(0)
  })

  it('large preset scenario gives meaningful estimate', () => {
    // The original bottleneck: Large (1k-10k) with all 6 algorithms
    const all = ['quicksort', 'mergesort', 'heap_sort', 'bubble_sort', 'insertion_sort', 'selection_sort']
    const result = estimateBenchmarkDuration(all, [1000, 2500, 5000, 7500, 10000], 5)
    expect(result).toBeGreaterThan(0)
    // Should produce a reasonable estimate (not astronomically large)
    expect(result).toBeLessThan(600) // under 10 minutes
  })

  it('empty algorithms list returns 0', () => {
    const result = estimateBenchmarkDuration([], [1000], 5)
    expect(result).toBe(0)
  })

  it('empty sizes list returns 0', () => {
    const result = estimateBenchmarkDuration(['quicksort'], [], 5)
    expect(result).toBe(0)
  })

  it('small sizes produce sub-second estimates', () => {
    const result = estimateBenchmarkDuration(['quicksort'], [10, 25, 50], 1)
    expect(result).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// formatEstimate
// ---------------------------------------------------------------------------

describe('formatEstimate', () => {
  it('sub-second: "< 1s" in emerald', () => {
    const result = formatEstimate(0.5)
    expect(result.text).toBe('< 1s')
    expect(result.color).toBe('text-emerald-400')
  })

  it('exactly 0: "< 1s"', () => {
    const result = formatEstimate(0)
    expect(result.text).toBe('< 1s')
    expect(result.color).toBe('text-emerald-400')
  })

  it('1-29 seconds: "~Ns" in emerald', () => {
    const result = formatEstimate(15)
    expect(result.text).toBe('~15s')
    expect(result.color).toBe('text-emerald-400')
  })

  it('exactly 1 second: "~1s" in emerald', () => {
    const result = formatEstimate(1)
    expect(result.text).toBe('~1s')
    expect(result.color).toBe('text-emerald-400')
  })

  it('30-59 seconds: "~Ns" in amber', () => {
    const result = formatEstimate(45)
    expect(result.text).toBe('~45s')
    expect(result.color).toBe('text-amber-400')
  })

  it('exactly 30 seconds: amber boundary', () => {
    const result = formatEstimate(30)
    expect(result.text).toBe('~30s')
    expect(result.color).toBe('text-amber-400')
  })

  it('60-119 seconds: "~1 min" in amber', () => {
    const result = formatEstimate(90)
    expect(result.text).toBe('~2 min')
    expect(result.color).toBe('text-amber-400')
  })

  it('exactly 60 seconds: "~1 min" in amber', () => {
    const result = formatEstimate(60)
    expect(result.text).toBe('~1 min')
    expect(result.color).toBe('text-amber-400')
  })

  it('120+ seconds: "~N min" in rose', () => {
    const result = formatEstimate(180)
    expect(result.text).toBe('~3 min')
    expect(result.color).toBe('text-rose-400')
  })

  it('exactly 120 seconds: rose boundary', () => {
    const result = formatEstimate(120)
    expect(result.text).toBe('~2 min')
    expect(result.color).toBe('text-rose-400')
  })

  it('large value: "~N min" in rose', () => {
    const result = formatEstimate(600)
    expect(result.text).toBe('~10 min')
    expect(result.color).toBe('text-rose-400')
  })
})

// ---------------------------------------------------------------------------
// ALGO_COMPLEXITY mapping
// ---------------------------------------------------------------------------

describe('ALGO_COMPLEXITY', () => {
  it('has entries for all 6 sorting algorithms', () => {
    expect(ALGO_COMPLEXITY.quicksort).toBe('nlogn')
    expect(ALGO_COMPLEXITY.mergesort).toBe('nlogn')
    expect(ALGO_COMPLEXITY.heap_sort).toBe('nlogn')
    expect(ALGO_COMPLEXITY.bubble_sort).toBe('n2')
    expect(ALGO_COMPLEXITY.insertion_sort).toBe('n2')
    expect(ALGO_COMPLEXITY.selection_sort).toBe('n2')
  })

  it('has exactly 6 entries', () => {
    expect(Object.keys(ALGO_COMPLEXITY)).toHaveLength(6)
  })
})

// ---------------------------------------------------------------------------
// Config constants consistency
// ---------------------------------------------------------------------------

describe('BENCHMARK_ALGORITHMS', () => {
  it('sorting has all 6 algorithms', () => {
    expect(BENCHMARK_ALGORITHMS.sorting).toHaveLength(6)
    const keys = BENCHMARK_ALGORITHMS.sorting.map(a => a.key)
    expect(keys).toContain('quicksort')
    expect(keys).toContain('mergesort')
    expect(keys).toContain('bubble_sort')
    expect(keys).toContain('insertion_sort')
    expect(keys).toContain('selection_sort')
    expect(keys).toContain('heap_sort')
  })

  it('every sorting algorithm has a complexity entry', () => {
    for (const algo of BENCHMARK_ALGORITHMS.sorting) {
      expect(ALGO_COMPLEXITY[algo.key]).toBeDefined()
    }
  })
})

describe('BENCHMARK_SIZE_PRESETS', () => {
  it('sorting presets have valid sizes within limits', () => {
    const limits = BENCHMARK_SIZE_LIMITS.sorting
    for (const preset of BENCHMARK_SIZE_PRESETS.sorting) {
      for (const size of preset.sizes) {
        expect(size).toBeGreaterThanOrEqual(limits.min)
        expect(size).toBeLessThanOrEqual(limits.max)
      }
    }
  })

  it('sorting has Small, Medium, Large, Full Range presets', () => {
    const labels = BENCHMARK_SIZE_PRESETS.sorting.map(p => p.label)
    expect(labels).toContain('Small (10–100)')
    expect(labels).toContain('Medium (100–1k)')
    expect(labels).toContain('Large (1k–10k)')
    expect(labels).toContain('Full Range')
  })
})

describe('BENCHMARK_METRICS', () => {
  it('sorting has runtime_ms, comparisons, swaps, writes', () => {
    const keys = BENCHMARK_METRICS.sorting.map(m => m.key)
    expect(keys).toEqual(['runtime_ms', 'comparisons', 'swaps', 'writes'])
  })
})

describe('BENCHMARK_INPUT_FAMILIES', () => {
  it('sorting has random, sorted, reversed, nearly_sorted', () => {
    const keys = BENCHMARK_INPUT_FAMILIES.sorting.map(f => f.key)
    expect(keys).toEqual(['random', 'sorted', 'reversed', 'nearly_sorted'])
  })
})

describe('BENCHMARK_LIMITS', () => {
  it('trials range is 1-20', () => {
    expect(BENCHMARK_LIMITS.TRIALS_MIN).toBe(1)
    expect(BENCHMARK_LIMITS.TRIALS_MAX).toBe(20)
  })

  it('max sizes count is 12', () => {
    expect(BENCHMARK_LIMITS.SIZES_MAX_COUNT).toBe(12)
  })

  it('default trials is 5', () => {
    expect(BENCHMARK_LIMITS.TRIALS_DEFAULT).toBe(5)
  })
})
