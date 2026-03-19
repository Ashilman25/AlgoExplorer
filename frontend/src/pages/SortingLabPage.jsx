import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { BarChart3, Play, RotateCcw, Save, Shuffle, Sparkles } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, Slider, useToast } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'
import {
  generateFromPreset,
  parseManualInput,
  PRESETS,
  DUPLICATE_DENSITIES,
  ANIMATION_MAX_SIZE,
} from '../utils/arrayGenerators'


const SORT_ALGOS = [
  {value: 'quicksort', label: 'Quick Sort'},
  {value: 'mergesort', label: 'Merge Sort'},
]

const EXPLANATION_LEVELS = [
  {value: 'standard', label: 'Standard'},
  {value: 'detailed', label: 'Detailed'},
  {value: 'none', label: 'None'},
]



function SortingConfig({
  algorithm, onAlgorithmChange,
  preset, onPresetChange,
  size, onSizeChange,
  duplicateDensity, onDuplicateDensityChange,
  explanationLevel, onExplanationLevelChange,
  manualInput, onManualInputChange,
  inputError,
  array,
  onGenerate, onShuffle,
  onRun, onReset, onSave,
  isRunning, error,
}) {
  const showSizeControls = preset !== 'custom'
  const showDensityControl = preset !== 'custom' && preset !== 'duplicates'

  return (
    <ConfigPanel title = "Sorting Lab">

      <ConfigSection title = "Algorithm">
        <Select options = {SORT_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Array Preset">
        <Select options = {PRESETS} value = {preset} onChange = {onPresetChange} />
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
            options = {DUPLICATE_DENSITIES}
            value = {duplicateDensity}
            onChange = {onDuplicateDensityChange}
          />
        </ConfigSection>
      )}

      {preset === 'custom' && (
        <ConfigSection title = "Manual Input">
          <textarea
            value = {manualInput}
            onChange = {onManualInputChange}
            placeholder = "Enter numbers separated by commas or spaces, e.g. 5, 3, 8, 1, 4"
            rows = {3}
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono placeholder:text-slate-600 outline-none resize-none"
          />
          {inputError && (
            <p className = "text-[10px] font-mono text-state-target mt-1">{inputError}</p>
          )}
        </ConfigSection>
      )}

      <ConfigSection title = "Explanation">
        <Select
          options = {EXPLANATION_LEVELS}
          value = {explanationLevel}
          onChange = {onExplanationLevelChange}
        />
      </ConfigSection>

      {/* input summary */}
      <ConfigSection title = "Input Summary">
        <div className = "rounded-lg bg-slate-800/50 border border-white/[0.06] px-3 py-2.5 space-y-1">
          <p className = "text-xs font-medium text-slate-300">
            {SORT_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm}
            {' · '}
            {PRESETS.find((p) => p.value === preset)?.label ?? preset}
          </p>

          <p className = "font-mono text-[10px] text-slate-500">
            {array.length} elements
            {duplicateDensity !== 'none' && preset !== 'custom' && preset !== 'duplicates'
              ? ` · ${DUPLICATE_DENSITIES.find((d) => d.value === duplicateDensity)?.label ?? duplicateDensity}`
              : ''
            }
          </p>

          <p
            className = "font-mono text-[10px] text-slate-600 leading-relaxed truncate"
            title = {array.join(', ')}
          >
            [{array.length <= 20 ? array.join(', ') : array.slice(0, 20).join(', ') + ', …'}]
          </p>
        </div>
      </ConfigSection>

      {error && (
        <ConfigSection>
          <div className = "rounded-lg bg-state-target/10 border border-state-target/20 px-3 py-2">
            <p className = "text-[10px] font-mono text-state-target leading-relaxed">{error}</p>
          </div>
        </ConfigSection>
      )}

      <ConfigSection>
        {preset !== 'custom' && (
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

        <Button
          variant = "primary"
          size = "md"
          icon = {Play}
          className = "w-full"
          onClick = {onRun}
          disabled = {isRunning || array.length < 2}
        >
          {isRunning ? 'Running…' : 'Run Simulation'}
        </Button>

        <Button
          variant = "ghost"
          size = "md"
          icon = {Save}
          className = "w-full text-slate-500"
          onClick = {onSave}
          disabled = {isRunning || array.length < 2}
        >
          Save Scenario
        </Button>

        <Button
          variant = "ghost"
          size = "md"
          icon = {RotateCcw}
          className = "w-full text-slate-500"
          onClick = {onReset}
          disabled = {isRunning}
        >
          Reset
        </Button>
      </ConfigSection>

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
        </svg>
      </div>

      <SortingDataPanel
        comparing = {comparing}
        swapping = {swapping}
        pivotIndex = {pivotIndex}
        displayArray = {displayArray}
      />
    </div>
  )
}


function SortingDataPanel({ comparing, swapping, pivotIndex, displayArray }) {
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

  const [algorithm, setAlgorithm] = useState(loadedScenario?.algorithm_key ?? 'quicksort')
  const [preset, setPreset] = useState(lp?.preset ?? (loadedScenario ? 'custom' : 'random'))
  const [size, setSize] = useState(lp?.array?.length ?? 20)
  const [duplicateDensity, setDuplicateDensity] = useState(lp?.duplicate_density ?? 'none')
  const [explanationLevel, setExplanationLevel] = useState('standard')
  const [manualInput, setManualInput] = useState(lp?.array ? lp.array.join(', ') : '')
  const [inputError, setInputError] = useState(null)
  const [array, setArray] = useState(() => lp?.array ?? generateFromPreset('random', 20, 'none'))

  useEffect(() => {
    if (loadedScenario) useScenarioStore.getState().clearScenario()
  }, [loadedScenario])


  useEffect(() => {
    if (preset === 'custom') return
    setArray(generateFromPreset(preset, size, preset === 'duplicates' ? 'high' : duplicateDensity))
    setInputError(null)

  }, [preset, size, duplicateDensity])


  // parse manual input when it changes
  useEffect(() => {
    if (preset !== 'custom') return
    const result = parseManualInput(manualInput)
    
    if (result.array) {
      setArray(result.array)
      setInputError(null)

    } else {
      setInputError(result.error)
    }

  }, [manualInput, preset])


  // --- metrics derived from current step ---
  const sortingMetrics = useMemo(() => {
    const snapshot = currentStep?.metrics_snapshot
    if (!snapshot) {
      return [
        { label: 'Comparisons', value: '—' },
        { label: 'Swaps', value: '—' },
        { label: 'Writes', value: '—' },
        { label: 'Max Depth', value: '—' },
      ]
    }

    return [
      { label: 'Comparisons', value: String(snapshot.comparisons ?? 0) },
      { label: 'Swaps', value: String(snapshot.swaps ?? 0) },
      { label: 'Writes', value: String(snapshot.writes ?? 0) },
      { label: 'Max Depth', value: String(snapshot.max_recursion_depth ?? 0) },
    ]
  }, [currentStep])


  // --- handlers ---

  const handleGenerate = useCallback(() => {
    if (preset === 'custom') return
    setArray(generateFromPreset(preset, size, preset === 'duplicates' ? 'high' : duplicateDensity))
  }, [preset, size, duplicateDensity])


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
  }, [])


  const handleRun = useCallback(() => {
    run({
      module_type: 'sorting',
      algorithm_key: algorithm,
      input_payload: {
        array,
        preset,
        duplicate_density: duplicateDensity,
      },
      execution_mode: 'simulate',
      explanation_level: explanationLevel,
    })
  }, [run, algorithm, array, preset, duplicateDensity, explanationLevel])


  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleSave = useCallback(() => {
    const name = `${SORT_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm} — ${array.length} elements`
    saveScenario({
      id: `sorting-${Date.now()}`,
      name,
      module_type: 'sorting',
      algorithm_key: algorithm,
      input_payload: {
        array,
        preset,
        duplicate_density: duplicateDensity,
      },
      created_at: new Date().toISOString(),
    })
    toast({ type: 'success', title: 'Scenario saved', message: `"${name}" added to library.` })
  }, [saveScenario, toast, algorithm, array, preset, duplicateDensity])


  return (
    <>
      <PageHeader
        icon = {BarChart3}
        title = "Sorting Lab"
        description = "Watch Quick Sort and Merge Sort work through arrays with comparison, swap, and partition tracking."
        accent = "amber"
        badge = "Phase 6"
      />

      <SimulationLayout
        configPanel = {
          <SortingConfig
            algorithm = {algorithm}
            onAlgorithmChange = {(e) => setAlgorithm(e.target.value)}
            preset = {preset}
            onPresetChange = {(e) => setPreset(e.target.value)}
            size = {size}
            onSizeChange = {setSize}
            duplicateDensity = {duplicateDensity}
            onDuplicateDensityChange = {(e) => setDuplicateDensity(e.target.value)}
            explanationLevel = {explanationLevel}
            onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
            manualInput = {manualInput}
            onManualInputChange = {(e) => setManualInput(e.target.value)}
            inputError = {inputError}
            array = {array}
            onGenerate = {handleGenerate}
            onShuffle = {handleShuffle}
            onRun = {handleRun}
            onReset = {handleReset}
            onSave = {handleSave}
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
