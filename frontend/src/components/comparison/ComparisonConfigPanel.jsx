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

const DOMAIN_ALGORITHMS = {
  graph: [
    { value: 'bfs',      label: 'BFS — Breadth-First Search' },
    { value: 'dijkstra', label: "Dijkstra — Shortest Path" },
  ],
  sorting: [
    { value: 'quicksort', label: 'Quick Sort' },
    { value: 'mergesort', label: 'Merge Sort' },
  ],
  dp: [
    { value: 'lcs',           label: 'LCS — Longest Common Subsequence' },
    { value: 'edit_distance', label: 'Edit Distance (Levenshtein)' },
  ],
}

const DEFAULT_INPUT_PAYLOADS = {
  graph: {
    nodes: [{ id: 'S' }, { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'T' }],
    edges: [
      { source: 'S', target: 'A', weight: 1 }, { source: 'S', target: 'B', weight: 4 },
      { source: 'A', target: 'C', weight: 2 }, { source: 'B', target: 'C', weight: 1 },
      { source: 'C', target: 'T', weight: 3 }, { source: 'A', target: 'B', weight: 2 },
    ],
    source: 'S',
    target: 'T',
    weighted: true,
    directed: false,
    mode: 'graph',
  },
  sorting: {
    array: [38, 27, 43, 3, 9, 82, 10, 64, 15, 57, 21, 76, 33, 48, 5, 91, 12, 68, 29, 55],
    preset: 'random',
    duplicate_density: 'none',
  },
  dp: {
    string1: 'ABCDEF',
    string2: 'ACBDFE',
  },
}

export default function ComparisonConfigPanel({ isRunning, onRun }) {
  const moduleType = useComparisonStore((s) => s.moduleType)
  const slots      = useComparisonStore((s) => s.slots)
  const maxSlots   = useComparisonStore((s) => s.maxSlots)
  const { setModuleType, setInputPayload, addSlot, removeSlot } = useComparisonStore()

  const moduleAlgorithms = DOMAIN_ALGORITHMS[moduleType] ?? []

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
    <div className = "space-y-4 p-4 rounded-xl border border-white/[0.07] bg-slate-800/50">
      {/* Module selection */}
      <div className = "space-y-2">
        <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
          Domain
        </p>
        <Select
          options = {MODULE_OPTIONS}
          value = {moduleType ?? ''}
          onChange = {(e) => {
            const domain = e.target.value || null
            setModuleType(domain)
            setInputPayload(domain ? DEFAULT_INPUT_PAYLOADS[domain] : null)
            setPendingAlg('')
          }}
          aria-label = "Module type"
        />
      </div>

      {/* Algorithm slots */}
      {moduleType && (
        <div className = "space-y-2">
          <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
            Algorithms ({slots.length}/{maxSlots})
          </p>

          {/* Existing slots */}
          <div className = "space-y-1">
            {slots.map((slot) => (
              <div
                key = {slot.id}
                className = "flex items-center justify-between rounded-lg bg-slate-900/50 border border-state-source/20 px-3 py-1.5"
              >
                <span className = "font-mono text-xs text-state-source">
                  {fmtAlgorithmName(slot.algorithmKey)}
                </span>
                <button
                  onClick = {() => removeSlot(slot.id)}
                  className = "text-slate-600 hover:text-state-target transition-colors"
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
