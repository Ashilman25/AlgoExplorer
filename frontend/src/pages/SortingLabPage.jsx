import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { BarChart3, Play, RotateCcw, Save, Shuffle, Sparkles } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, Slider, useToast, ErrorAlert } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { useReopenRun } from '../hooks/useReopenRun'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'
import { generateId } from '../services/guestService'
import GuestPromptBanner from '../components/guest/GuestPromptBanner'
import {
  generateFromPreset,
  parseManualInput,
  PRESETS,
  DUPLICATE_DENSITIES,
  ANIMATION_MAX_SIZE,
} from '../utils/arrayGenerators'


const SORTING_ALGOS = [
  { value: '_sorting',       label: '── Sorting ──',   disabled: true },
  { value: 'bubble_sort',    label: 'Bubble Sort' },
  { value: 'insertion_sort', label: 'Insertion Sort' },
  { value: 'selection_sort', label: 'Selection Sort' },
  { value: 'quicksort',      label: 'Quick Sort' },
  { value: 'mergesort',      label: 'Merge Sort' },
  { value: 'heap_sort',      label: 'Heap Sort' },
  { value: '_searching',     label: '── Searching ──', disabled: true },
  { value: 'binary_search',  label: 'Binary Search' },
  { value: 'linear_search',  label: 'Linear Search' },
]

const SEARCH_ALGORITHMS = new Set(['binary_search', 'linear_search'])

const EXPLANATION_LEVELS = [
  {value: 'standard', label: 'Standard'},
  {value: 'detailed', label: 'Detailed'},
  {value: 'none', label: 'None'},
]



export function SortingConfig({
  algorithm, onAlgorithmChange,
  searchTarget, onSearchTargetChange,
  preset, onPresetChange,
  size, onSizeChange,
  duplicateDensity, onDuplicateDensityChange,
  explanationLevel, onExplanationLevelChange,
  manualInput, onManualInputChange,
  inputError,
  array,
  onGenerate, onShuffle,
  isRunning, error,
}) {
  const isSearching = SEARCH_ALGORITHMS.has(algorithm)
  const showSizeControls = preset !== 'custom'
  const showDensityControl = preset !== 'custom' && preset !== 'duplicates'

  return (
    <ConfigPanel
      title = "Sorting Lab"
      footer = {preset !== 'custom' && (
        <div className = "flex gap-2">
          <Button
            variant = "secondary"
            size = "sm"
            icon = {Sparkles}
            className = "flex-1"
            onClick = {onGenerate}
            disabled = {isRunning}
          >
            Generate
          </Button>
          <Button
            variant = "secondary"
            size = "sm"
            icon = {Shuffle}
            className = "flex-1"
            onClick = {onShuffle}
            disabled = {isRunning}
          >
            Shuffle
          </Button>
        </div>
      )}
    >

      <ConfigSection title = "Algorithm">
        <Select
          aria-label = "Algorithm"
          options = {SORTING_ALGOS}
          value = {algorithm}
          onChange = {onAlgorithmChange}
        />
      </ConfigSection>

      {isSearching && (
        <ConfigSection title = "Search Target">
          <input
            type = "number"
            aria-label = "Search Target"
            value = {searchTarget}
            onChange = {onSearchTargetChange}
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono outline-none"
          />
          {algorithm === 'binary_search' && (
            <p className = "text-[10px] text-slate-600 mt-1">
              Array will be auto-sorted for Binary Search.
            </p>
          )}
        </ConfigSection>
      )}

      <ConfigSection title = "Array Preset">
        <Select aria-label = "Array Preset" options = {PRESETS} value = {preset} onChange = {onPresetChange} />
      </ConfigSection>

      {showSizeControls && (
        <ConfigSection title = "Array Size">
          <Slider
            label = "Size"
            min = {5}
            max = {ANIMATION_MAX_SIZE}
            step = {5}
            value = {size}
            onChange = {onSizeChange}
            formatValue = {(v) => `${v} elements`}
          />
        </ConfigSection>
      )}

      {showDensityControl && (
        <ConfigSection title = "Duplicate Density">
          <Select
            aria-label = "Duplicate Density"
            options = {DUPLICATE_DENSITIES}
            value = {duplicateDensity}
            onChange = {onDuplicateDensityChange}
          />
        </ConfigSection>
      )}

      {preset === 'custom' && (
        <ConfigSection title = "Manual Input">
          <textarea
            aria-label = "Manual Input"
            value = {manualInput}
            onChange = {onManualInputChange}
            placeholder = "Enter numbers separated by commas or spaces, e.g. 5, 3, 8, 1, 4"
            rows = {3}
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono placeholder:text-slate-600 outline-none resize-none"
          />
          {inputError && (
            <ErrorAlert message={inputError} className="mt-1" />
          )}
        </ConfigSection>
      )}

      <ConfigSection title = "Explanation">
        <Select
          aria-label = "Explanation"
          options = {EXPLANATION_LEVELS}
          value = {explanationLevel}
          onChange = {onExplanationLevelChange}
        />
      </ConfigSection>

      {error && (
        <ConfigSection>
          <ErrorAlert title="Simulation failed" message={error} />
        </ConfigSection>
      )}

    </ConfigPanel>
  )
}



const STATE_COLOR = {
  default:  'var(--color-state-default)',
  active:   'var(--color-state-active)',
  frontier: 'var(--color-state-frontier)',
  visited:  'var(--color-state-visited)',
  swap:     'var(--color-state-swap)',
  success:  'var(--color-state-success)',
  source:   'var(--color-state-source)',
  target:   'var(--color-state-target)',
}

function stateColor(s) {
  return STATE_COLOR[s] ?? STATE_COLOR.default
}


function SortingCanvas({ array }) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const isLoading = usePlaybackStore((s) => s.isLoading)

  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })

    ro.observe(el)

    return () => ro.disconnect()
  }, [])


  const displayArray = currentStep?.state_payload?.array ?? array
  const elementStates = currentStep?.state_payload?.element_states ?? displayArray.map(() => 'default')
  const comparing = currentStep?.state_payload?.comparing ?? []
  const swapping = currentStep?.state_payload?.swapping ?? []
  const pivotIndex = currentStep?.state_payload?.pivot_index ?? null

  const searchLow = currentStep?.state_payload?.search_low ?? null
  const searchMid = currentStep?.state_payload?.search_mid ?? null
  const searchHigh = currentStep?.state_payload?.search_high ?? null
  const searchTarget = currentStep?.state_payload?.search_target ?? null
  const foundIndex = currentStep?.state_payload?.found_index ?? null
  const isSearchMode = searchLow != null || searchMid != null || searchHigh != null

  const n = displayArray.length
  if (n === 0) {
    return (
      <div className = "flex-1 flex items-center justify-center">
        <p className = "text-sm text-slate-500">No array data to display.</p>
      </div>
    )
  }

  let maxVal = displayArray[0]
  for (let i = 1; i < n; i++) {
    if (displayArray[i] > maxVal) maxVal = displayArray[i]
  }
  if (maxVal <= 0) maxVal = 1

  const pad = { top: 28, bottom: 32, left: 16, right: 16 }
  const chartW = canvasSize.w - pad.left - pad.right
  const chartH = canvasSize.h - pad.top - pad.bottom
  const totalGapRatio = 0.15
  const gapSize = n > 1 ? Math.max(1, (chartW * totalGapRatio) / (n - 1)) : 0
  const barW = n > 1 ? (chartW - gapSize * (n - 1)) / n : chartW * 0.3

  const showValues = barW >= 14
  const showIndices = barW >= 10

  const comparingSet = new Set(comparing)
  const swappingSet = new Set(swapping)


  return (
    <div className = "flex-1 flex flex-col min-h-0 relative">

      {/* loading overlay — sits on top of bars, does not replace them */}
      {isLoading && (
        <div className = "absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
          <div className = "flex flex-col items-center gap-3">
            <div className = "w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className = "text-xs text-slate-500 font-mono">Running simulation…</p>
          </div>
        </div>
      )}

      <div ref = {containerRef} className = "flex-1 min-h-0 overflow-hidden">
        <svg
          viewBox = {`0 0 ${canvasSize.w} ${canvasSize.h}`}
          className = "w-full h-full"
          style = {{ userSelect: 'none' }}
        >
          {displayArray.map((val, i) => {
            const state = elementStates[i] ?? 'default'
            const color = stateColor(state)
            const barH = Math.max(2, (val / maxVal) * chartH)
            const x = pad.left + i * (barW + gapSize)
            const y = pad.top + chartH - barH

            const isComparing = comparingSet.has(i)
            const isSwapping = swappingSet.has(i)
            const isPivot = pivotIndex === i

            const isOutOfRange = isSearchMode && searchLow != null && searchHigh != null && (i < searchLow || i > searchHigh)
            const barOpacity = isOutOfRange ? 0.2 : 1

            return (
              <g key = {i}>

                {/* glow effect for comparing, swapping, or pivot */}
                {(isComparing || isSwapping || isPivot) && (
                  <rect
                    x = {x - 2}
                    y = {y - 2}
                    width = {barW + 4}
                    height = {barH + 4}
                    rx = {3}
                    fill = {isPivot ? 'var(--color-state-source)' : color}
                    opacity = {0.15}
                  />
                )}

                {/* main bar */}
                <rect
                  x = {x}
                  y = {y}
                  width = {Math.max(1, barW)}
                  height = {barH}
                  rx = {Math.min(2, barW / 4)}
                  fill = {color}
                  opacity = {barOpacity}
                  style = {{ transition: 'y 0.15s ease, height 0.15s ease, fill 0.2s ease' }}
                />

                {/* value label above bar */}
                {showValues && (
                  <text
                    x = {x + barW / 2}
                    y = {y - 5}
                    textAnchor = "middle"
                    fill = {color}
                    fontSize = {Math.min(10, barW * 0.6)}
                    fontFamily = "'IBM Plex Mono', monospace"
                    fontWeight = "500"
                    opacity = {barOpacity}
                    style = {{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                  >
                    {val}
                  </text>
                )}

                {/* index label below chart */}
                {showIndices && (
                  <text
                    x = {x + barW / 2}
                    y = {pad.top + chartH + 14}
                    textAnchor = "middle"
                    fill = "rgba(100,116,139,0.5)"
                    fontSize = {Math.min(8, barW * 0.5)}
                    fontFamily = "'IBM Plex Mono', monospace"
                    fontWeight = "400"
                    style = {{ pointerEvents: 'none' }}
                  >
                    {i}
                  </text>
                )}

                {/* pivot marker — small triangle below the bar */}
                {isPivot && (
                  <polygon
                    points = {`${x + barW / 2 - 4},${pad.top + chartH + 24} ${x + barW / 2 + 4},${pad.top + chartH + 24} ${x + barW / 2},${pad.top + chartH + 18}`}
                    fill = "var(--color-state-source)"
                    opacity = {0.8}
                    style = {{ pointerEvents: 'none' }}
                  />
                )}
              </g>
            )
          })}

          {isSearchMode && (
            <>
              {searchLow != null && (() => {
                const lx = pad.left + searchLow * (barW + gapSize) + barW / 2
                const markerY = pad.top + chartH + 18
                return (
                  <g>
                    <polygon
                      points = {`${lx - 4},${markerY + 6} ${lx + 4},${markerY + 6} ${lx},${markerY}`}
                      fill = "var(--color-state-active)"
                      opacity = {0.8}
                    />
                    <text x = {lx} y = {markerY + 16} textAnchor = "middle" fill = "var(--color-state-active)" fontSize = "8" fontFamily = "'IBM Plex Mono', monospace" fontWeight = "600">L</text>
                  </g>
                )
              })()}
              {searchMid != null && (() => {
                const mx = pad.left + searchMid * (barW + gapSize) + barW / 2
                const markerY = pad.top + chartH + 18
                return (
                  <g>
                    <polygon
                      points = {`${mx - 4},${markerY + 6} ${mx + 4},${markerY + 6} ${mx},${markerY}`}
                      fill = "var(--color-state-frontier)"
                      opacity = {0.8}
                    />
                    <text x = {mx} y = {markerY + 16} textAnchor = "middle" fill = "var(--color-state-frontier)" fontSize = "8" fontFamily = "'IBM Plex Mono', monospace" fontWeight = "600">M</text>
                  </g>
                )
              })()}
              {searchHigh != null && (() => {
                const hx = pad.left + searchHigh * (barW + gapSize) + barW / 2
                const markerY = pad.top + chartH + 18
                return (
                  <g>
                    <polygon
                      points = {`${hx - 4},${markerY + 6} ${hx + 4},${markerY + 6} ${hx},${markerY}`}
                      fill = "var(--color-state-active)"
                      opacity = {0.8}
                    />
                    <text x = {hx} y = {markerY + 16} textAnchor = "middle" fill = "var(--color-state-active)" fontSize = "8" fontFamily = "'IBM Plex Mono', monospace" fontWeight = "600">H</text>
                  </g>
                )
              })()}
            </>
          )}
        </svg>
      </div>

      <SortingDataPanel
        comparing = {comparing}
        swapping = {swapping}
        pivotIndex = {pivotIndex}
        displayArray = {displayArray}
        searchLow = {searchLow}
        searchMid = {searchMid}
        searchHigh = {searchHigh}
        searchTarget = {searchTarget}
        foundIndex = {foundIndex}
      />
    </div>
  )
}


export function SortingDataPanel({ comparing, swapping, pivotIndex, displayArray, searchLow, searchMid, searchHigh, searchTarget, foundIndex }) {
  const isSearchMode = searchLow != null || searchMid != null || searchHigh != null

  if (isSearchMode) {
    return (
      <div className = "shrink-0 border-t border-white/[0.06] px-4 py-3 space-y-2 overflow-x-auto min-h-[40px]">
        {searchTarget != null && (
          <div className = "flex items-center gap-2">
            <span className = "mono-label shrink-0">Target</span>
            <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-target bg-state-target/10 border-state-target/30">
              {searchTarget}
            </span>
          </div>
        )}
        {searchLow != null && searchHigh != null && (
          <div className = "flex items-center gap-2">
            <span className = "mono-label shrink-0">Range</span>
            <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-active bg-state-active/10 border-state-active/30">
              [{searchLow}..{searchHigh}]
            </span>
          </div>
        )}
        {searchMid != null && (
          <div className = "flex items-center gap-2">
            <span className = "mono-label shrink-0">Checking</span>
            <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-frontier bg-state-frontier/10 border-state-frontier/30">
              [{searchMid}] = {displayArray[searchMid]}
            </span>
          </div>
        )}
        {foundIndex != null && (
          <div className = "flex items-center gap-2">
            <span className = "mono-label shrink-0">Found</span>
            <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-success bg-state-success/10 border-state-success/30">
              [{foundIndex}] = {displayArray[foundIndex]}
            </span>
          </div>
        )}
      </div>
    )
  }

  const hasComparing = comparing.length > 0
  const hasSwapping = swapping.length > 0
  const hasPivot = pivotIndex != null

  if (!hasComparing && !hasSwapping && !hasPivot) {
    return <div className = "shrink-0 border-t border-white/[0.06] px-4 py-3 min-h-[40px]" />
  }

  return (
    <div className = "shrink-0 border-t border-white/[0.06] px-4 py-3 space-y-2 overflow-x-auto min-h-[40px]">

      {hasPivot && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Pivot</span>
          <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-source bg-state-source/10 border-state-source/30">
            [{pivotIndex}] = {displayArray[pivotIndex]}
          </span>
        </div>
      )}

      {hasComparing && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Compare</span>
          <div className = "flex gap-1">
            {comparing.map((idx) => (
              <span
                key = {idx}
                className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-frontier bg-state-frontier/10 border-state-frontier/30"
              >
                [{idx}] = {displayArray[idx]}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasSwapping && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Swap</span>
          <div className = "flex items-center gap-0.5">
            {swapping.map((idx, i) => (
              <span key = {idx} className = "flex items-center gap-0.5">
                <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-swap bg-state-swap/10 border-state-swap/30">
                  [{idx}] = {displayArray[idx]}
                </span>
                {i < swapping.length - 1 && (
                  <span className = "text-[10px] text-slate-600">↔</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}



export default function SortingLabPage() {
  const { run, isRunning } = useRunSimulation()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const { clearTimeline, error: timelineError } = usePlaybackStore()
  const { clearRun } = useRunStore()
  const { saveScenario } = useGuestStore()
  const toast = useToast()


  // --- load scenario from library (if navigated from Scenario Library) ---
  const [loadedScenario] = useState(() => {
    const s = useScenarioStore.getState().scenario
    return s?.module_type === 'sorting' ? s : null
  })
  const lp = loadedScenario?.input_payload

  const [algorithm, setAlgorithm] = useState(loadedScenario?.algorithm_key ?? 'bubble_sort')
  const [searchTarget, setSearchTarget] = useState(5)
  const [preset, setPreset] = useState(lp?.preset ?? (loadedScenario ? 'custom' : 'random'))
  const [size, setSize] = useState(lp?.array?.length ?? 20)
  const [duplicateDensity, setDuplicateDensity] = useState(lp?.duplicate_density ?? 'none')
  const [explanationLevel, setExplanationLevel] = useState('standard')
  const [manualInput, setManualInput] = useState(lp?.array ? lp.array.join(', ') : '')
  const [inputError, setInputError] = useState(null)
  const [array, setArray] = useState(() => lp?.array ?? generateFromPreset('random', 20, 'none'))

  const isSearching = SEARCH_ALGORITHMS.has(algorithm)

  const skipInitialGenerate = useRef(!!lp)

  useEffect(() => {
    if (loadedScenario) {
      useScenarioStore.getState().clearScenario()
      if (!loadedScenario._reopenRunId) {
        usePlaybackStore.getState().clearTimeline()
        useRunStore.getState().clearRun()
      }
    }
  }, [loadedScenario])

  // Reopen run: fetch stored timeline if navigated from Run History
  useReopenRun(loadedScenario?._reopenRunId)

  useEffect(() => {
    if (skipInitialGenerate.current) { skipInitialGenerate.current = false; return }
    if (preset === 'custom') return
    setArray(generateFromPreset(preset, size, preset === 'duplicates' ? 'high' : duplicateDensity))
    setInputError(null)
    clearTimeline()
    clearRun()
  }, [preset, size, duplicateDensity, clearTimeline, clearRun])


  // parse manual input when it changes
  useEffect(() => {
    if (preset !== 'custom') return
    const result = parseManualInput(manualInput)

    if (result.array) {
      setArray(result.array)
      setInputError(null)
    } else {
      setArray([])
      setInputError(result.error)
    }

    clearTimeline()
    clearRun()
  }, [manualInput, preset, clearTimeline, clearRun])


  // --- metrics derived from current step ---
  const sortingMetrics = useMemo(() => {
    const snapshot = currentStep?.metrics_snapshot
    const isSearch = SEARCH_ALGORITHMS.has(algorithm)

    if (!snapshot) {
      return isSearch
        ? [
            { label: 'Comparisons', value: '—' },
            { label: 'Iterations', value: '—' },
            { label: 'Accesses', value: '—' },
            { label: 'Result', value: '—' },
          ]
        : [
            { label: 'Comparisons', value: '—' },
            { label: 'Swaps', value: '—' },
            { label: 'Writes', value: '—' },
            { label: 'Max Depth', value: '—' },
          ]
    }

    if (isSearch) {
      const found = currentStep?.state_payload?.found_index
      return [
        { label: 'Comparisons', value: String(snapshot.comparisons ?? 0) },
        { label: 'Iterations', value: String(snapshot.iterations ?? 0) },
        { label: 'Accesses', value: String(snapshot.array_accesses ?? 0) },
        { label: 'Result', value: found != null ? `Found [${found}]` : 'Searching…' },
      ]
    }

    return [
      { label: 'Comparisons', value: String(snapshot.comparisons ?? 0) },
      { label: 'Swaps', value: String(snapshot.swaps ?? 0) },
      { label: 'Writes', value: String(snapshot.writes ?? snapshot.shifts ?? 0) },
      { label: 'Max Depth', value: String(snapshot.max_recursion_depth ?? snapshot.passes ?? snapshot.heapify_ops ?? 0) },
    ]
  }, [currentStep, algorithm])


  // --- handlers ---

  const handleAlgorithmChange = useCallback((e) => {
    setAlgorithm(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleSearchTargetChange = useCallback((e) => {
    setSearchTarget(Number(e.target.value))
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handlePresetChange = useCallback((e) => {
    setPreset(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleDuplicateDensityChange = useCallback((e) => {
    setDuplicateDensity(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleManualInputChange = useCallback((e) => {
    setManualInput(e.target.value)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleGenerate = useCallback(() => {
    if (preset === 'custom') return
    setArray(generateFromPreset(preset, size, preset === 'duplicates' ? 'high' : duplicateDensity))
    clearTimeline()
    clearRun()
  }, [preset, size, duplicateDensity, clearTimeline, clearRun])


  const handleShuffle = useCallback(() => {
    setArray((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = copy[i]
        copy[i] = copy[j]
        copy[j] = temp
      }
      return copy
    })
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleRun = useCallback(() => {
    const payload = {
      array: algorithm === 'binary_search' ? [...array].sort((a, b) => a - b) : array,
      preset,
      duplicate_density: duplicateDensity,
    }

    if (isSearching) {
      payload.target = searchTarget
    }

    run({
      module_type: 'sorting',
      algorithm_key: algorithm,
      input_payload: payload,
      execution_mode: 'simulate',
      explanation_level: explanationLevel,
    })
  }, [run, algorithm, array, preset, duplicateDensity, explanationLevel, isSearching, searchTarget])


  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleSave = useCallback(() => {
    const name = `${SORTING_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm} — ${array.length} elements`
    saveScenario({
      id: generateId(),
      name,
      module_type: 'sorting',
      algorithm_key: algorithm,
      input_payload: {
        array,
        preset,
        duplicate_density: duplicateDensity,
      },
      tags: [],
      created_at: new Date().toISOString(),
    })
    toast({ type: 'success', title: 'Scenario saved', message: `"${name}" added to library.` })
  }, [saveScenario, toast, algorithm, array, preset, duplicateDensity])


  return (
    <>
      <PageHeader
        icon = {BarChart3}
        title = "Sorting & Searching Lab"
        description = "Visualize sorting and searching algorithms with comparison, swap, and operation tracking."
        accent = "amber"
        badge = "Phase 6"
      >
        <div className = "flex items-center gap-1 bg-slate-900/50 border border-white/[0.06] rounded-lg p-1">
          <Button variant = "primary" size = "sm" icon = {Play} onClick = {handleRun} disabled = {isRunning || isPlaying || array.length < 2 || !!inputError}>
            {isRunning || isPlaying ? 'Running…' : 'Run'}
          </Button>
          <Button variant = "ghost" size = "sm" icon = {Save} onClick = {handleSave} disabled = {isRunning || isPlaying || array.length < 2 || !!inputError}>
            Save
          </Button>
          <div className = "w-px h-4 bg-white/[0.08]" />
          <Button variant = "ghost" size = "sm" icon = {RotateCcw} onClick = {handleReset} disabled = {isRunning || isPlaying}>
            Reset
          </Button>
        </div>
      </PageHeader>

      <GuestPromptBanner />

      <SimulationLayout
        moduleKey = "sorting"
        algorithmKey = {algorithm}
        configPanel = {
          <SortingConfig
            algorithm = {algorithm}
            onAlgorithmChange = {handleAlgorithmChange}
            searchTarget = {searchTarget}
            onSearchTargetChange = {handleSearchTargetChange}
            preset = {preset}
            onPresetChange = {handlePresetChange}
            size = {size}
            onSizeChange = {setSize}
            duplicateDensity = {duplicateDensity}
            onDuplicateDensityChange = {handleDuplicateDensityChange}
            explanationLevel = {explanationLevel}
            onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
            manualInput = {manualInput}
            onManualInputChange = {handleManualInputChange}
            inputError = {inputError}
            array = {array}
            onGenerate = {handleGenerate}
            onShuffle = {handleShuffle}
            isRunning = {isRunning || isPlaying}
            error = {timelineError}
          />
        }
        metrics = {sortingMetrics}
      >

        <SortingCanvas array = {array} />

      </SimulationLayout>
    </>
  )
}
