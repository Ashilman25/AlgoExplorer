export const BENCHMARK_MODULE_TYPES = ['sorting']

export const BENCHMARK_ALGORITHMS = {
  sorting: [
    { key: 'quicksort', label: 'Quick Sort' },
    { key: 'mergesort', label: 'Merge Sort' },
  ],
}

export const BENCHMARK_INPUT_FAMILIES = {
  sorting: [
    { key: 'random', label: 'Random' },
    { key: 'sorted', label: 'Already Sorted' },
    { key: 'reversed', label: 'Reversed' },
    { key: 'nearly_sorted', label: 'Nearly Sorted' },
  ],
}

export const BENCHMARK_METRICS = {
  sorting: [
    { key: 'runtime_ms', label: 'Runtime (ms)', unit: 'ms' },
    { key: 'comparisons', label: 'Comparisons', unit: 'count' },
    { key: 'swaps', label: 'Swaps', unit: 'count' },
  ],
}

export const BENCHMARK_LIMITS = {
  SIZE_MIN: 10,
  SIZE_MAX: 10_000,
  SIZES_MAX_COUNT: 12,
  TRIALS_MIN: 1,
  TRIALS_MAX: 20,
  TRIALS_DEFAULT: 5,
  ALGORITHMS_MIN: 1,
  ALGORITHMS_MAX: 5,
}

export const BENCHMARK_SIZE_PRESETS = [
  { label: 'Small (10–100)', sizes: [10, 25, 50, 75, 100] },
  { label: 'Medium (100–1k)', sizes: [100, 250, 500, 750, 1000] },
  { label: 'Large (1k–10k)', sizes: [1000, 2500, 5000, 7500, 10000] },
  { label: 'Full Range', sizes: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000] },
]
