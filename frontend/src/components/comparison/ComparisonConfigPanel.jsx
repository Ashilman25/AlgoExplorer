import { useState, useCallback, useMemo } from 'react'
import { Play, X, Plus } from 'lucide-react'
import { Button, Select } from '../ui'
import { useComparisonStore } from '../../stores/useComparisonStore'
import { fmtAlgorithmName } from '../../utils/comparisonUtils'

const MODULE_OPTIONS = [
  { value: '', label: 'Select domain...' },
  { value: 'graph',   label: 'Graph' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'dp',      label: 'DP' },
]

const GRAPH_SUBCATEGORY_OPTIONS = [
  { value: 'pathfinding', label: 'Pathfinding' },
  { value: 'mst',         label: 'Minimum Spanning Tree' },
  { value: 'ordering',    label: 'Ordering' },
]

const GRAPH_SUBCATEGORY_ALGORITHMS = {
  pathfinding: [
    { value: 'bfs',          label: 'BFS — Breadth-First Search' },
    { value: 'dfs',          label: 'DFS — Depth-First Search' },
    { value: 'dijkstra',     label: 'Dijkstra — Shortest Path' },
    { value: 'astar',        label: 'A* — Heuristic Search' },
    { value: 'bellman_ford', label: 'Bellman-Ford — Negative Weights' },
  ],
  mst: [
    { value: 'prims',    label: "Prim's — Greedy MST" },
    { value: 'kruskals', label: "Kruskal's — Union-Find MST" },
  ],
  ordering: [
    { value: 'topological_sort', label: 'Topological Sort — DAG Ordering' },
  ],
}

const GRAPH_SUBCATEGORY_PAYLOADS = {
  pathfinding: {
    nodes: [
      { id: 'S', x: 0, y: 100 }, { id: 'A', x: 100, y: 30 }, { id: 'B', x: 100, y: 170 },
      { id: 'C', x: 200, y: 100 }, { id: 'T', x: 300, y: 100 },
    ],
    edges: [
      { source: 'S', target: 'A', weight: 1 }, { source: 'S', target: 'B', weight: 4 },
      { source: 'A', target: 'C', weight: 2 }, { source: 'B', target: 'C', weight: 1 },
      { source: 'C', target: 'T', weight: 3 }, { source: 'A', target: 'B', weight: 2 },
    ],
    source: 'S', target: 'T', weighted: true, directed: false, mode: 'graph',
  },
  mst: {
    nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }, { id: 'E' }, { id: 'F' }],
    edges: [
      { source: 'A', target: 'B', weight: 1 }, { source: 'A', target: 'C', weight: 4 },
      { source: 'B', target: 'C', weight: 2 }, { source: 'B', target: 'D', weight: 6 },
      { source: 'C', target: 'D', weight: 3 }, { source: 'C', target: 'E', weight: 5 },
      { source: 'D', target: 'E', weight: 7 }, { source: 'D', target: 'F', weight: 4 },
      { source: 'E', target: 'F', weight: 2 },
    ],
    source: 'A', weighted: true, directed: false, mode: 'graph',
  },
  ordering: {
    nodes: [{ id: 'CS101' }, { id: 'CS201' }, { id: 'CS301' }, { id: 'MATH' }, { id: 'CS202' }, { id: 'CS401' }, { id: 'CS402' }],
    edges: [
      { source: 'CS101', target: 'CS201' }, { source: 'CS101', target: 'CS202' },
      { source: 'MATH', target: 'CS301' }, { source: 'CS201', target: 'CS301' },
      { source: 'CS202', target: 'CS401' }, { source: 'CS301', target: 'CS401' },
      { source: 'CS301', target: 'CS402' },
    ],
    weighted: false, directed: true, mode: 'graph',
  },
}

const SORTING_SUBCATEGORY_OPTIONS = [
  { value: 'sorting',   label: 'Sorting' },
  { value: 'searching', label: 'Searching' },
]

const SORTING_SUBCATEGORY_ALGORITHMS = {
  sorting: [
    { value: 'bubble_sort',    label: 'Bubble Sort' },
    { value: 'insertion_sort', label: 'Insertion Sort' },
    { value: 'selection_sort', label: 'Selection Sort' },
    { value: 'quicksort',      label: 'Quick Sort' },
    { value: 'mergesort',      label: 'Merge Sort' },
    { value: 'heap_sort',      label: 'Heap Sort' },
  ],
  searching: [
    { value: 'binary_search', label: 'Binary Search' },
    { value: 'linear_search', label: 'Linear Search' },
  ],
}

const SORTING_SUBCATEGORY_PAYLOADS = {
  sorting: {
    array: [38, 27, 43, 3, 9, 82, 10, 64, 15, 57, 21, 76, 33, 48, 5, 91, 12, 68, 29, 55],
    preset: 'random',
    duplicate_density: 'none',
  },
  searching: {
    array: [3, 5, 9, 10, 12, 15, 21, 27, 29, 33, 38, 43, 48, 55, 57, 64, 68, 76, 82, 91],
    preset: 'custom',
    duplicate_density: 'none',
    target: 33,
  },
}

const DP_SUBCATEGORY_OPTIONS = [
  { value: 'string_dp',   label: 'String DP' },
  { value: 'knapsack',    label: 'Knapsack' },
  { value: 'coin_change', label: 'Coin Change' },
  { value: 'fibonacci',   label: 'Fibonacci' },
]

const DP_SUBCATEGORY_ALGORITHMS = {
  string_dp:   [
    { value: 'lcs',           label: 'LCS — Longest Common Subsequence' },
    { value: 'edit_distance', label: 'Edit Distance (Levenshtein)' },
  ],
  knapsack:    [
    { value: 'knapsack_01', label: '0/1 Knapsack' },
  ],
  coin_change: [
    { value: 'coin_change', label: 'Coin Change (Min Coins)' },
  ],
  fibonacci:   [
    { value: 'fibonacci', label: 'Fibonacci Variants' },
  ],
}

const DP_SUBCATEGORY_PAYLOADS = {
  string_dp:   { string1: 'ABCDEF', string2: 'ACBDFE' },
  knapsack:    { capacity: 10, items: [{ weight: 2, value: 3 }, { weight: 3, value: 4 }, { weight: 4, value: 5 }, { weight: 5, value: 7 }] },
  coin_change: { coins: [1, 5, 10, 25], target: 41 },
  fibonacci:   { n: 8 },
}

export default function ComparisonConfigPanel({ isRunning, onRun }) {
  const moduleType         = useComparisonStore((s) => s.moduleType)
  const graphSubCategory   = useComparisonStore((s) => s.graphSubCategory)
  const sortingSubCategory = useComparisonStore((s) => s.sortingSubCategory)
  const dpSubCategory      = useComparisonStore((s) => s.dpSubCategory)
  const slots              = useComparisonStore((s) => s.slots)
  const maxSlots           = useComparisonStore((s) => s.maxSlots)
  const { setModuleType, setInputPayload, setAlgorithmConfig, setGraphSubCategory, setSortingSubCategory, setDpSubCategory, addSlot, removeSlot } = useComparisonStore()

  const moduleAlgorithms = moduleType === 'graph'
    ? (GRAPH_SUBCATEGORY_ALGORITHMS[graphSubCategory] ?? [])
    : moduleType === 'sorting'
    ? (SORTING_SUBCATEGORY_ALGORITHMS[sortingSubCategory ?? 'sorting'] ?? [])
    : moduleType === 'dp'
    ? (DP_SUBCATEGORY_ALGORITHMS[dpSubCategory ?? 'string_dp'] ?? [])
    : []

  const [pendingAlg, setPendingAlg] = useState('')

  const availableAlgorithms = useMemo(
    () => moduleAlgorithms.filter(
      (a) => !slots.some((s) => s.algorithmKey === a.value)
    ),
    [moduleAlgorithms, slots]
  )

  const algOptions = useMemo(() => [
    { value: '', label: 'Add algorithm...' },
    ...availableAlgorithms,
  ], [availableAlgorithms])

  const canAddSlot = slots.length < maxSlots && pendingAlg
  const canRun = slots.length >= 2 && moduleType

  const handleAddAlgorithm = useCallback(() => {
    if (!pendingAlg) return
    addSlot(pendingAlg)
    setPendingAlg('')
  }, [pendingAlg, addSlot])

  return (
    <div className = "space-y-4 p-4 rounded-xl border border-hairline bg-surface-translucent">
      {/* Module selection */}
      <div className = "space-y-2">
        <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
          Domain
        </p>
        <Select
          options = {MODULE_OPTIONS}
          value = {moduleType ?? ''}
          onChange = {(e) => {
            const domain = e.target.value || null
            setModuleType(domain)
            if (domain === 'graph') {
              setInputPayload(GRAPH_SUBCATEGORY_PAYLOADS.pathfinding)
            } else if (domain === 'sorting') {
              setInputPayload(SORTING_SUBCATEGORY_PAYLOADS.sorting)
            } else if (domain === 'dp') {
              setInputPayload(DP_SUBCATEGORY_PAYLOADS.string_dp)
              setAlgorithmConfig({})
            }
            setPendingAlg('')
          }}
          aria-label = "Module type"
        />
      </div>

      {/* Graph sub-category */}
      {moduleType === 'graph' && (
        <div className = "space-y-2">
          <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            Category
          </p>
          <Select
            options = {GRAPH_SUBCATEGORY_OPTIONS}
            value = {graphSubCategory ?? 'pathfinding'}
            onChange = {(e) => {
              const cat = e.target.value
              setGraphSubCategory(cat)
              setInputPayload(GRAPH_SUBCATEGORY_PAYLOADS[cat])
              setPendingAlg('')
            }}
            aria-label = "Graph sub-category"
          />
        </div>
      )}

      {/* Sorting sub-category */}
      {moduleType === 'sorting' && (
        <div className = "space-y-2">
          <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            Category
          </p>
          <Select
            options = {SORTING_SUBCATEGORY_OPTIONS}
            value = {sortingSubCategory ?? 'sorting'}
            onChange = {(e) => {
              const cat = e.target.value
              setSortingSubCategory(cat)
              setInputPayload(SORTING_SUBCATEGORY_PAYLOADS[cat])
              setPendingAlg('')
            }}
            aria-label = "Sorting sub-category"
          />
        </div>
      )}

      {/* DP sub-category */}
      {moduleType === 'dp' && (
        <div className = "space-y-2">
          <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            Category
          </p>
          <Select
            options = {DP_SUBCATEGORY_OPTIONS}
            value = {dpSubCategory ?? 'string_dp'}
            onChange = {(e) => {
              const cat = e.target.value
              setDpSubCategory(cat)
              setInputPayload(DP_SUBCATEGORY_PAYLOADS[cat])
              setAlgorithmConfig(cat === 'fibonacci' ? { mode: 'tabulation' } : {})
              setPendingAlg('')
            }}
            aria-label = "DP sub-category"
          />
        </div>
      )}

      {/* Algorithm slots */}
      {moduleType && (
        <div className = "space-y-2">
          <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            Algorithms ({slots.length}/{maxSlots})
          </p>

          {/* Existing slots */}
          <div className = "space-y-1">
            {slots.map((slot) => (
              <div
                key = {slot.id}
                className = "flex items-center justify-between rounded-lg bg-base border border-state-source/20 px-3 py-1.5"
              >
                <span className = "font-mono text-xs text-state-source">
                  {fmtAlgorithmName(slot.algorithmKey)}
                </span>
                <button
                  onClick = {() => removeSlot(slot.id)}
                  className = "text-faint hover:text-state-target transition-colors"
                  aria-label = {`Remove ${fmtAlgorithmName(slot.algorithmKey)}`}
                >
                  <X size = {12} />
                </button>
              </div>
            ))}
          </div>

          {/* Add algorithm */}
          {slots.length < maxSlots && (
            <div className = "flex gap-2">
              <div className = "flex-1">
                <Select
                  options = {algOptions}
                  value = {pendingAlg}
                  onChange = {(e) => setPendingAlg(e.target.value)}
                  aria-label = "Add algorithm"
                />
              </div>
              <button
                onClick = {handleAddAlgorithm}
                disabled = {!canAddSlot}
                className = "w-8 h-8 flex items-center justify-center rounded-lg border border-state-source/30 text-state-source disabled:opacity-30 disabled:cursor-not-allowed hover:bg-state-source/10 transition-colors self-end"
                aria-label = "Add selected algorithm"
              >
                <Plus size = {14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Run button */}
      <Button
        icon = {Play}
        onClick = {onRun}
        disabled = {!canRun || isRunning}
        className = "w-full"
        aria-label = "Run comparison"
      >
        {isRunning ? 'Running...' : 'Run Comparison'}
      </Button>
    </div>
  )
}
