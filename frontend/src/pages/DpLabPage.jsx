import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { Grid3x3, Play, RotateCcw, Save } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, useToast, ErrorAlert } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection, DpStripCanvas, FibCallTree } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { useReopenRun } from '../hooks/useReopenRun'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'
import { generateId } from '../services/guestService'
import { metadataService } from '../services/metadataService'
import { useMetadataStore } from '../stores/useMetadataStore'
import GuestPromptBanner from '../components/guest/GuestPromptBanner'


// ─── Constants ──────────────────────────────────────────

const DP_ALGOS = [
  {value: 'lcs', label: 'LCS — Longest Common Subsequence'},
  {value: 'edit_distance', label: 'Edit Distance (Levenshtein)'},
  {value: 'knapsack_01', label: '0/1 Knapsack'},
  {value: 'coin_change', label: 'Coin Change (Min Coins)'},
  {value: 'fibonacci', label: 'Fibonacci Variants'},
]

const EXPLANATION_LEVELS = [
  {value: 'standard', label: 'Standard'},
  {value: 'detailed', label: 'Detailed'},
  {value: 'none', label: 'None'},
]

const FIB_MODES = [
  { value: 'tabulation',      label: 'Tabulation' },
  { value: 'memoized',        label: 'Memoized' },
  { value: 'naive_recursive', label: 'Naive Recursive' },
]

const FIB_MODE_CAPS = { tabulation: 50, memoized: 40, naive_recursive: 15 }

const MAX_STRING_LENGTH = 50
const DP_TABLE_MAX_CELLS = 2500
const CELL_SIZE = 36

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


export function validateDpStrings(s1, s2) {
  if (s1.length === 0 && s2.length === 0) {
    return 'At least one string must be non-empty'
  }

  if (s1.length > 0 && s1.trim().length === 0) {
    return 'String A must not be whitespace-only'
  }

  if (s2.length > 0 && s2.trim().length === 0) {
    return 'String B must not be whitespace-only'
  }

  if (s1.length > MAX_STRING_LENGTH) {
    return `String A exceeds ${MAX_STRING_LENGTH} characters`
  }

  if (s2.length > MAX_STRING_LENGTH) {
    return `String B exceeds ${MAX_STRING_LENGTH} characters`
  }

  const cells = (s1.length + 1) * (s2.length + 1)
  if (cells > DP_TABLE_MAX_CELLS) {
    return `Table size (${s1.length + 1} × ${s2.length + 1} = ${cells} cells) exceeds visualization limit of ${DP_TABLE_MAX_CELLS}`
  }

  return null
}

export function validateKnapsack(capacity, items) {
  if (items.length === 0) return 'Add at least one item'
  for (let i = 0; i < items.length; i++) {
    if (!items[i].weight || items[i].weight < 1) return `Item ${i + 1}: weight must be >= 1`
    if (!items[i].value || items[i].value < 1) return `Item ${i + 1}: value must be >= 1`
  }
  const cells = (items.length + 1) * (capacity + 1)
  if (cells > DP_TABLE_MAX_CELLS) {
    return `Table size (${items.length + 1} x ${capacity + 1} = ${cells} cells) exceeds limit of ${DP_TABLE_MAX_CELLS}`
  }
  return null
}

export function validateCoinChange(coins, target) {
  if (coins.length === 0) return 'Add at least one coin'
  for (const c of coins) {
    if (c < 1) return `Coin value ${c} must be >= 1`
  }
  if (new Set(coins).size !== coins.length) return 'Coin values must be unique'
  if (target + 1 > DP_TABLE_MAX_CELLS) {
    return `Array size (${target + 1}) exceeds limit of ${DP_TABLE_MAX_CELLS}`
  }
  return null
}

export function validateFibonacci(n, mode) {
  const cap = FIB_MODE_CAPS[mode] || 50
  if (n < 1) return 'n must be >= 1'
  if (n > cap) return `n=${n} exceeds maximum of ${cap} for ${mode} mode`
  return null
}


// ─── Config Panel ───────────────────────────────────────

export function DpConfig({
  algorithm, onAlgorithmChange, presetOptions,
  // string-pair (LCS / Edit Distance)
  preset, onPresetChange,
  string1, onString1Change,
  string2, onString2Change,
  // knapsack
  knapsackPreset, onKnapsackPresetChange,
  capacity, onCapacityChange,
  items, onItemAdd, onItemRemove, onItemChange,
  // coin change
  coinPreset, onCoinPresetChange,
  coins, coinsText, onCoinsTextChange,
  coinTarget, onCoinTargetChange,
  // fibonacci
  fibPreset, onFibPresetChange,
  fibN, onFibNChange,
  fibMode, onFibModeChange,
  // shared
  explanationLevel, onExplanationLevelChange,
  inputError,
  error,
}) {

  return (
    <ConfigPanel title = "DP Lab">

      <ConfigSection title = "Algorithm">
        <Select aria-label = "Algorithm" options = {DP_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Preset">
        {(algorithm === 'lcs' || algorithm === 'edit_distance') && (
          <Select aria-label = "Preset" options = {presetOptions} value = {preset} onChange = {onPresetChange} />
        )}
        {algorithm === 'knapsack_01' && (
          <Select aria-label = "Preset" options = {presetOptions} value = {knapsackPreset} onChange = {onKnapsackPresetChange} />
        )}
        {algorithm === 'coin_change' && (
          <Select aria-label = "Preset" options = {presetOptions} value = {coinPreset} onChange = {onCoinPresetChange} />
        )}
        {algorithm === 'fibonacci' && (
          <Select aria-label = "Preset" options = {presetOptions} value = {fibPreset} onChange = {onFibPresetChange} />
        )}
      </ConfigSection>

      {/* Input — string pair (LCS / Edit Distance) */}
      {(algorithm === 'lcs' || algorithm === 'edit_distance') && (
        <ConfigSection title = "Input Strings">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">String A</label>
            <input type = "text" aria-label = "String A" value = {string1} onChange = {onString1Change}
              placeholder = "e.g. ABCDEF" maxLength = {MAX_STRING_LENGTH}
              className = "w-full bg-base border border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-secondary text-sm font-mono transition-colors outline-none"
            />
          </div>
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">String B</label>
            <input type = "text" aria-label = "String B" value = {string2} onChange = {onString2Change}
              placeholder = "e.g. ACBDFE" maxLength = {MAX_STRING_LENGTH}
              className = "w-full bg-base border border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-secondary text-sm font-mono transition-colors outline-none"
            />
          </div>
        </ConfigSection>
      )}

      {/* Input — knapsack */}
      {algorithm === 'knapsack_01' && (
        <ConfigSection title = "Knapsack Input">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">Capacity</label>
            <input type = "number" aria-label = "Capacity" value = {capacity} min = {1} max = {1000}
              onChange = {onCapacityChange}
              className = "w-full bg-base border border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-secondary text-sm font-mono transition-colors outline-none"
            />
          </div>
          <div className = "space-y-2">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">Items</label>
            {items.map((item, i) => (
              <div key = {i} className = "flex gap-2 items-center">
                <input type = "number" aria-label = {`Item ${i + 1} weight`} value = {item.weight} min = {1}
                  onChange = {(e) => onItemChange(i, 'weight', Number(e.target.value))}
                  className = "w-16 bg-base border border-default focus:border-brand-500 rounded-lg px-2 py-1.5 text-secondary text-xs font-mono outline-none"
                  placeholder = "w"
                />
                <input type = "number" aria-label = {`Item ${i + 1} value`} value = {item.value} min = {1}
                  onChange = {(e) => onItemChange(i, 'value', Number(e.target.value))}
                  className = "w-16 bg-base border border-default focus:border-brand-500 rounded-lg px-2 py-1.5 text-secondary text-xs font-mono outline-none"
                  placeholder = "v"
                />
                <span className = "text-[10px] text-faint font-mono">#{i + 1}</span>
                {items.length > 1 && (
                  <button onClick = {() => onItemRemove(i)}
                    className = "text-rose-400/60 hover:text-rose-400 text-xs px-1"
                  >&times;</button>
                )}
              </div>
            ))}
            <button onClick = {onItemAdd}
              className = "text-xs text-brand-500 hover:text-brand-400 font-medium"
            >+ Add item</button>
          </div>
        </ConfigSection>
      )}

      {/* Input — coin change */}
      {algorithm === 'coin_change' && (
        <ConfigSection title = "Coin Change Input">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">Coins (comma-separated)</label>
            <input type = "text" aria-label = "Coins" value = {coinsText} onChange = {onCoinsTextChange}
              placeholder = "e.g. 1, 5, 10, 25"
              className = "w-full bg-base border border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-secondary text-sm font-mono transition-colors outline-none"
            />
          </div>
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">Target Amount</label>
            <input type = "number" aria-label = "Target" value = {coinTarget} min = {1} max = {2499}
              onChange = {onCoinTargetChange}
              className = "w-full bg-base border border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-secondary text-sm font-mono transition-colors outline-none"
            />
          </div>
        </ConfigSection>
      )}

      {/* Input — fibonacci */}
      {algorithm === 'fibonacci' && (
        <ConfigSection title = "Fibonacci Input">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">Mode</label>
            <Select aria-label = "Mode" options = {FIB_MODES} value = {fibMode} onChange = {onFibModeChange} />
          </div>
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-muted uppercase tracking-wide">
              n (max {FIB_MODE_CAPS[fibMode]})
            </label>
            <input type = "number" aria-label = "n" value = {fibN} min = {1} max = {FIB_MODE_CAPS[fibMode]}
              onChange = {onFibNChange}
              className = "w-full bg-base border border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-secondary text-sm font-mono transition-colors outline-none"
            />
            {fibMode === 'naive_recursive' && (
              <p className = "text-[10px] text-amber-400/70">Capped at 15 for recursive to keep the call tree manageable</p>
            )}
          </div>
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

      {inputError && (
        <ConfigSection>
          <ErrorAlert message={inputError} />
        </ConfigSection>
      )}

      {error && (
        <ConfigSection>
          <ErrorAlert title="Simulation failed" message={error} />
        </ConfigSection>
      )}

    </ConfigPanel>
  )
}



const CELL_BASE = 'flex items-center justify-center font-mono text-xs tabular-nums transition-all duration-150'

const CELL_STATE_CLASSES = {
  default:  `${CELL_BASE} border border-hairline text-faint`,
  active:   `${CELL_BASE} border-2 border-state-active   bg-state-active/20   text-state-active`,
  frontier: `${CELL_BASE} border-2 border-state-frontier bg-state-frontier/15 text-state-frontier`,
  visited:  `${CELL_BASE} border border-state-visited/20  bg-state-visited/10  text-state-visited`,
  swap:     `${CELL_BASE} border border-state-swap/30     bg-state-swap/15     text-state-swap`,
  success:  `${CELL_BASE} border border-state-success/30  bg-state-success/15  text-state-success`,
  source:   `${CELL_BASE} border border-state-source/30   bg-state-source/15   text-state-source`,
  target:   `${CELL_BASE} border border-state-target/30   bg-state-target/15   text-state-target`,
}

const GLOW = {
  active:   '0 0 8px rgba(34,211,238,0.35), inset 0 0 6px rgba(34,211,238,0.12)',
  frontier: '0 0 6px rgba(251,191,36,0.3)',
}

const HEADER_CELL = 'flex items-center justify-center bg-surface border border-hairline font-mono text-xs font-semibold text-muted select-none'


function buildBlankTable(algorithm, string1, string2, items, capacity) {
  if (algorithm === 'knapsack_01') {
    const rows = (items?.length ?? 0) + 1
    const cols = (capacity ?? 0) + 1
    return Array.from({ length: rows }, () => Array(cols).fill(null))
  }
  const rows = (string1?.length ?? 0) + 1
  const cols = (string2?.length ?? 0) + 1
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

function DpTableCanvas({ string1, string2, algorithm, items, capacity }) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const isLoading  = usePlaybackStore((s) => s.isLoading)

  const activeCellRef = useRef(null)

  const table         = currentStep?.state_payload?.table ?? null
  const cellStates    = currentStep?.state_payload?.cell_states ?? null
  const currentCell   = currentStep?.state_payload?.current_cell ?? null
  const tracebackPath = currentStep?.state_payload?.traceback_path ?? []
  const rawExp        = currentStep?.explanation ?? null
  const explanation   = typeof rawExp === 'string' ? rawExp : rawExp?.body ?? rawExp?.text ?? rawExp?.title ?? null
  const eventType     = currentStep?.event_type ?? currentStep?.eventType ?? null

  const displayTable = table ?? buildBlankTable(algorithm, string1, string2, items, capacity)

  const activeRow = currentCell?.[0] ?? null
  const activeCol = currentCell?.[1] ?? null

  // auto-scroll the active cell into view on each step
  useEffect(() => {
    activeCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeRow, activeCol])

  if (!displayTable || displayTable.length === 0) {
    return (
      <div className = "flex-1 flex items-center justify-center">
        <p className = "text-sm text-muted">No table data.</p>
      </div>
    )
  }


  // ── derive grid dimensions ──
  const rows = displayTable.length
  const cols = displayTable[0]?.length ?? 0

  // derive headers based on algorithm
  const isKnapsack = algorithm === 'knapsack_01'

  const rowHeaders = isKnapsack
    ? ['\u2205', ...Array.from({ length: rows - 1 }, (_, i) => `Item ${i + 1}`)]
    : ['\u03b5', ...(string1 || '').split('')]

  const colHeaders = isKnapsack
    ? Array.from({ length: cols }, (_, j) => String(j))
    : ['\u03b5', ...(string2 || '').split('')]

  const gridWidth  = CELL_SIZE * (cols + 1)
  const gridHeight = CELL_SIZE * (rows + 1)


  return (
    <div className = "flex-1 flex flex-col min-h-0 relative">

      {/* loading overlay */}
      {isLoading && (
        <div className = "absolute inset-0 flex items-center justify-center bg-base/60 z-10">
          <div className = "flex flex-col items-center gap-3">
            <div className = "w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className = "text-xs text-muted font-mono">Running simulation…</p>
          </div>
        </div>
      )}

      {/* scrollable table area */}
      <div className = "flex-1 overflow-auto min-h-0 p-4">
        <div className = "relative inline-block" style = {{ minWidth: gridWidth, minHeight: gridHeight }}>

          {/* CSS grid table */}
          <div
            style = {{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols + 1}, ${CELL_SIZE}px)`,
              gridTemplateRows:    `repeat(${rows + 1}, ${CELL_SIZE}px)`,
            }}
          >
            {/* corner cell */}
            <div className = {HEADER_CELL} style = {{ fontSize: 9, color: 'var(--color-slate-600, #475569)' }}>
              {isKnapsack ? 'Item↓ Cap→' : 'A↓ B→'}
            </div>

            {/* column headers — string2 characters */}
            {colHeaders.map((ch, j) => (
              <div key = {`ch-${j}`} className = {HEADER_CELL}>
                {ch}
              </div>
            ))}

            {/* rows: header + data cells */}
            {displayTable.map((row, i) => [
              /* row header — string1 character */
              <div
                key = {`rh-${i}`}
                className = {HEADER_CELL}
                title = {isKnapsack && i > 0 && items?.[i - 1]
                  ? `Item ${i}: w=${items[i - 1].weight}, v=${items[i - 1].value}`
                  : undefined
                }
                style = {isKnapsack ? { fontSize: 8 } : undefined}
              >
                {rowHeaders[i]}
              </div>,

              /* data cells */
              ...row.map((val, j) => {
                const state    = cellStates?.[i]?.[j] ?? 'default'
                const isActive = state === 'active'
                const isDep    = state === 'frontier'
                const cls      = CELL_STATE_CLASSES[state] ?? CELL_STATE_CLASSES.default
                const glow     = isActive ? GLOW.active : isDep ? GLOW.frontier : undefined

                return (
                  <div
                    key = {`c-${i}-${j}`}
                    ref = {isActive ? activeCellRef : undefined}
                    className = {cls}
                    style = {glow ? { boxShadow: glow } : undefined}
                  >
                    {val != null ? val : ''}
                  </div>
                )
              }),
            ])}
          </div>

          {/* SVG traceback overlay */}
          {tracebackPath.length > 1 && (
            <svg
              className = "absolute top-0 left-0 pointer-events-none"
              width = {gridWidth}
              height = {gridHeight}
              style = {{ zIndex: 5 }}
            >
              {/* connecting lines */}
              {tracebackPath.map(([ci, cj], idx) => {
                if (idx === 0) return null
                const [pi, pj] = tracebackPath[idx - 1]
                return (
                  <line
                    key = {`tl-${idx}`}
                    x1 = {(pj + 1) * CELL_SIZE + CELL_SIZE / 2}
                    y1 = {(pi + 1) * CELL_SIZE + CELL_SIZE / 2}
                    x2 = {(cj + 1) * CELL_SIZE + CELL_SIZE / 2}
                    y2 = {(ci + 1) * CELL_SIZE + CELL_SIZE / 2}
                    stroke = {STATE_COLOR.success}
                    strokeWidth = {2}
                    strokeOpacity = {0.55}
                    strokeLinecap = "round"
                  />
                )
              })}

              {/* dots at each traceback cell */}
              {tracebackPath.map(([ci, cj], idx) => (
                <circle
                  key = {`td-${idx}`}
                  cx = {(cj + 1) * CELL_SIZE + CELL_SIZE / 2}
                  cy = {(ci + 1) * CELL_SIZE + CELL_SIZE / 2}
                  r = {3}
                  fill = {STATE_COLOR.success}
                  fillOpacity = {0.8}
                />
              ))}
            </svg>
          )}

        </div>
      </div>

      {/* recurrence explanation panel */}
      <DpDataPanel
        explanation = {explanation}
        currentCell = {currentCell}
        eventType = {eventType}
      />

    </div>
  )
}


export function DpDataPanel({ explanation, currentCell, eventType }) {
  if (!explanation && !currentCell) {
    return <div className = "shrink-0 border-t border-hairline px-4 py-3 min-h-[40px]" />
  }

  return (
    <div className = "shrink-0 border-t border-hairline px-4 py-3 space-y-2 overflow-x-auto min-h-[40px]">

      {currentCell && (
        <div className = "flex items-center gap-2">
          <span className = "mono-label shrink-0">Cell</span>

          <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-active bg-state-active/10 border-state-active/30">
            ({currentCell[0]}, {currentCell[1]})
          </span>

          {eventType && (
            <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-source bg-state-source/10 border-state-source/30">
              {eventType}
            </span>
          )}
        </div>
      )}

      {explanation && (
        <p className = "text-xs text-muted leading-relaxed">{explanation}</p>
      )}

    </div>
  )
}


// ─── Page ───────────────────────────────────────────────

export default function DpLabPage() {
  const { run, isRunning } = useRunSimulation()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const { clearTimeline, registerRunHandler, unregisterRunHandler, error: timelineError } = usePlaybackStore()
  const { clearRun } = useRunStore()
  const { saveScenario } = useGuestStore()
  const toast = useToast()


  // --- load scenario from library (if navigated from Scenario Library) ---
  const [loadedScenario] = useState(() => {
    const s = useScenarioStore.getState().scenario
    return s?.module_type === 'dp' ? s : null
  })

  const [algorithm, setAlgorithm] = useState(loadedScenario?.algorithm_key ?? 'lcs')
  const [dpPresets, setDpPresets] = useState([])
  const needsInitialPreset = useRef(!loadedScenario)

  const [preset, setPreset] = useState(loadedScenario ? 'custom' : '')
  const [string1, setString1] = useState(loadedScenario?.input_payload?.string1 ?? '')
  const [string2, setString2] = useState(loadedScenario?.input_payload?.string2 ?? '')
  const [explanationLevel, setExplanationLevel] = useState('standard')

  // knapsack state
  const [capacity, setCapacity] = useState(10)
  const [items, setItems] = useState([{ weight: 1, value: 1 }])
  const [knapsackPreset, setKnapsackPreset] = useState('')

  // coin change state
  const [coins, setCoins] = useState([1])
  const [coinTarget, setCoinTarget] = useState(1)
  const [coinPreset, setCoinPreset] = useState('')
  const [coinsText, setCoinsText] = useState('1')

  // fibonacci state
  const [fibN, setFibN] = useState(8)
  const [fibMode, setFibMode] = useState('tabulation')
  const [fibPreset, setFibPreset] = useState('')

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

  // ── Preset fetching ──
  useEffect(() => {
    const cached = useMetadataStore.getState().getPresets('dp', algorithm)
    if (cached) {
      setDpPresets(cached)
      return
    }

    let cancelled = false
    metadataService.getPresets('dp', algorithm).then((resp) => {
      if (cancelled) return
      const fetchedItems = resp.groups.flatMap((g) => g.presets)
      useMetadataStore.getState().setPresets('dp', algorithm, fetchedItems)
      setDpPresets(fetchedItems)
    }).catch(() => {
      // Graceful degradation — presets dropdown will just show "Custom"
    })
    return () => { cancelled = true }
  }, [algorithm])

  // Apply first preset when presets arrive after algorithm change (or initial load)
  useEffect(() => {
    if (!needsInitialPreset.current || dpPresets.length === 0) return
    needsInitialPreset.current = false
    const first = dpPresets[0]
    const p = first.input_payload

    if (algorithm === 'lcs' || algorithm === 'edit_distance') {
      setPreset(first.key)
      setString1(p.string1)
      setString2(p.string2)
    } else if (algorithm === 'knapsack_01') {
      setKnapsackPreset(first.key)
      setCapacity(p.capacity)
      setItems(p.items.map((it) => ({ ...it })))
    } else if (algorithm === 'coin_change') {
      setCoinPreset(first.key)
      setCoins(p.coins)
      setCoinTarget(p.target)
      setCoinsText(p.coins.join(', '))
    } else if (algorithm === 'fibonacci') {
      setFibPreset(first.key)
      setFibN(p.n)
    }
  }, [dpPresets, algorithm])

  const presetOptions = useMemo(() => [
    { value: 'custom', label: 'Custom' },
    ...dpPresets.map((p) => ({ value: p.key, label: p.label })),
  ], [dpPresets])

  // --- validation ---
  const inputError = useMemo(() => {
    if (algorithm === 'lcs' || algorithm === 'edit_distance') {
      return validateDpStrings(string1, string2)
    }
    if (algorithm === 'knapsack_01') {
      return validateKnapsack(capacity, items)
    }
    if (algorithm === 'coin_change') {
      return validateCoinChange(coins, coinTarget)
    }
    if (algorithm === 'fibonacci') {
      return validateFibonacci(fibN, fibMode)
    }
    return null
  }, [algorithm, string1, string2, capacity, items, coins, coinTarget, fibN, fibMode])


  // --- metrics derived from current step ---
  const dpMetrics = useMemo(() => {
    const s = currentStep?.metrics_snapshot
    if (!s) {
      return [
        { label: 'Cells computed', value: '\u2014' },
        { label: 'Runtime',        value: '\u2014' },
      ]
    }

    if (algorithm === 'lcs' || algorithm === 'edit_distance') {
      return [
        { label: 'Cells computed',     value: String(s.cells_computed ?? 0) },
        { label: 'Table size',         value: `${s.table_rows ?? 0} \u00d7 ${s.table_cols ?? 0}` },
        { label: 'Traceback length',   value: String(s.traceback_length ?? 0) },
        { label: 'Subproblems reused', value: String(s.subproblems_reused ?? 0) },
        { label: 'Runtime',            value: s.runtime_ms != null ? `${s.runtime_ms} ms` : '\u2014' },
      ]
    }

    if (algorithm === 'knapsack_01') {
      return [
        { label: 'Cells computed',   value: String(s.cells_computed ?? 0) },
        { label: 'Table size',       value: `${s.table_rows ?? 0} \u00d7 ${s.table_cols ?? 0}` },
        { label: 'Optimal value',    value: String(s.total_value ?? 0) },
        { label: 'Total weight',     value: String(s.total_weight ?? 0) },
        { label: 'Items selected',   value: String(s.items_selected ?? 0) },
        { label: 'Runtime',          value: s.runtime_ms != null ? `${s.runtime_ms} ms` : '\u2014' },
      ]
    }

    if (algorithm === 'coin_change') {
      const coinsList = s.coins_used_list?.length > 0 ? s.coins_used_list.join(' + ') : '\u2014'
      return [
        { label: 'Cells computed',     value: String(s.cells_computed ?? 0) },
        { label: 'Array length',       value: String(s.array_length ?? 0) },
        { label: 'Min coins',          value: s.min_coins != null ? String(s.min_coins) : 'Impossible' },
        { label: 'Coins used',         value: coinsList },
        { label: 'Subproblems reused', value: String(s.subproblems_reused ?? 0) },
        { label: 'Runtime',            value: s.runtime_ms != null ? `${s.runtime_ms} ms` : '\u2014' },
      ]
    }

    if (algorithm === 'fibonacci') {
      return [
        { label: 'F(n) result',     value: s.fib_result != null ? String(s.fib_result) : '\u2014' },
        { label: 'Total calls',     value: String(s.total_calls ?? 0) },
        { label: 'Redundant calls', value: String(s.redundant_calls ?? 0) },
        { label: 'Max depth',       value: String(s.max_depth ?? 0) },
        { label: 'Mode',            value: s.mode ?? '\u2014' },
        { label: 'Runtime',         value: s.runtime_ms != null ? `${s.runtime_ms} ms` : '\u2014' },
      ]
    }

    return [{ label: 'Runtime', value: s.runtime_ms != null ? `${s.runtime_ms} ms` : '\u2014' }]
  }, [currentStep, algorithm])


  // --- handlers ---

  const handlePresetChange = useCallback((e) => {
    const key = e.target.value
    setPreset(key)
    clearTimeline()
    clearRun()

    const found = dpPresets.find((pr) => pr.key === key)
    if (found) {
      setString1(found.input_payload.string1)
      setString2(found.input_payload.string2)
    }
  }, [dpPresets, clearTimeline, clearRun])


  const handleString1Change = useCallback((e) => {
    setString1(e.target.value)
    setPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleString2Change = useCallback((e) => {
    setString2(e.target.value)
    setPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleRun = useCallback(({ autoPlay = true } = {}) => {
    let input_payload = {}
    let algorithm_config = null

    if (algorithm === 'lcs' || algorithm === 'edit_distance') {
      input_payload = { string1, string2 }
    } else if (algorithm === 'knapsack_01') {
      input_payload = { capacity, items: items.map((it) => ({ weight: it.weight, value: it.value })) }
    } else if (algorithm === 'coin_change') {
      input_payload = { coins: [...coins], target: coinTarget }
    } else if (algorithm === 'fibonacci') {
      input_payload = { n: fibN }
      algorithm_config = { mode: fibMode }
    }

    run({
      module_type: 'dp',
      algorithm_key: algorithm,
      input_payload,
      algorithm_config,
      execution_mode: 'simulate',
      explanation_level: 'detailed',
    }, null, { autoPlay })
  }, [run, algorithm, string1, string2, capacity, items, coins, coinTarget, fibN, fibMode])


  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleSave = useCallback(() => {
    let input_payload = {}
    let name = ''

    if (algorithm === 'lcs' || algorithm === 'edit_distance') {
      input_payload = { string1, string2 }
      name = `${DP_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm} \u2014 "${string1}" vs "${string2}"`
    } else if (algorithm === 'knapsack_01') {
      input_payload = { capacity, items }
      name = `0/1 Knapsack \u2014 cap=${capacity}, ${items.length} items`
    } else if (algorithm === 'coin_change') {
      input_payload = { coins, target: coinTarget }
      name = `Coin Change \u2014 [${coins.join(',')}] target=${coinTarget}`
    } else if (algorithm === 'fibonacci') {
      input_payload = { n: fibN }
      name = `Fibonacci \u2014 F(${fibN}) ${fibMode}`
    }

    saveScenario({
      id: generateId(),
      name,
      module_type: 'dp',
      algorithm_key: algorithm,
      input_payload,
      tags: [],
      created_at: new Date().toISOString(),
    })
    toast({ type: 'success', title: 'Scenario saved', message: `"${name}" added to library.` })
  }, [saveScenario, toast, algorithm, string1, string2, capacity, items, coins, coinTarget, fibN, fibMode])

  const handleItemChange = useCallback((index, field, val) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: val } : it))
    setKnapsackPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleItemAdd = useCallback(() => {
    setItems((prev) => [...prev, { weight: 1, value: 1 }])
    setKnapsackPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleItemRemove = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setKnapsackPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleCoinsTextChange = useCallback((e) => {
    const text = e.target.value
    setCoinsText(text)
    setCoinPreset('custom')
    const parsed = text.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    setCoins(parsed)
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleCapacityChange = useCallback((e) => {
    setCapacity(Number(e.target.value))
    setKnapsackPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleCoinTargetChange = useCallback((e) => {
    setCoinTarget(Number(e.target.value))
    setCoinPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleFibNChange = useCallback((e) => {
    setFibN(Number(e.target.value))
    setFibPreset('custom')
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])

  const handleKnapsackPresetChange = useCallback((e) => {
    const key = e.target.value
    setKnapsackPreset(key)
    clearTimeline()
    clearRun()
    const found = dpPresets.find((pr) => pr.key === key)
    if (found) {
      setCapacity(found.input_payload.capacity)
      setItems(found.input_payload.items.map((it) => ({ ...it })))
    }
  }, [dpPresets, clearTimeline, clearRun])

  const handleCoinPresetChange = useCallback((e) => {
    const key = e.target.value
    setCoinPreset(key)
    clearTimeline()
    clearRun()
    const found = dpPresets.find((pr) => pr.key === key)
    if (found) {
      setCoins(found.input_payload.coins)
      setCoinTarget(found.input_payload.target)
      setCoinsText(found.input_payload.coins.join(', '))
    }
  }, [dpPresets, clearTimeline, clearRun])

  const handleFibPresetChange = useCallback((e) => {
    const key = e.target.value
    setFibPreset(key)
    clearTimeline()
    clearRun()
    const found = dpPresets.find((pr) => pr.key === key)
    if (found) {
      setFibN(found.input_payload.n)
    }
  }, [dpPresets, clearTimeline, clearRun])

  const handleFibModeChange = useCallback((e) => {
    const mode = e.target.value
    setFibMode(mode)
    clearTimeline()
    clearRun()
    const cap = FIB_MODE_CAPS[mode]
    if (fibN > cap) setFibN(cap)
  }, [clearTimeline, clearRun, fibN])

  const handleAlgorithmChange = useCallback((e) => {
    const key = e.target.value
    setAlgorithm(key)
    setDpPresets([])
    clearTimeline()
    clearRun()
    needsInitialPreset.current = true

    if (key === 'fibonacci') {
      setFibMode('tabulation')
    }
  }, [clearTimeline, clearRun])

  const handleRunRef = useRef()
  handleRunRef.current = handleRun

  useEffect(() => {
    clearTimeline()
    clearRun()
    registerRunHandler((opts) => handleRunRef.current?.(opts))
    return () => unregisterRunHandler()
  }, [registerRunHandler, unregisterRunHandler, clearTimeline, clearRun])

  return (
    <>
      <PageHeader
        icon = {Grid3x3}
        title = "DP Lab"
        description = "Explore dynamic programming through step-by-step table construction, traceback, and recursive call trees."
        accent = "violet"
      >
        <div className = "flex items-center gap-1 bg-base border border-hairline rounded-lg p-1">
          <Button variant = "primary" size = "sm" icon = {Play} onClick = {handleRun} disabled = {isRunning || isPlaying || !!inputError}>
            {isRunning || isPlaying ? 'Running…' : 'Run'}
          </Button>
          <Button variant = "ghost" size = "sm" icon = {Save} onClick = {handleSave} disabled = {isRunning || isPlaying || !!inputError}>
            Save
          </Button>
          <div className = "w-px h-4 border-l border-hairline" />
          <Button variant = "ghost" size = "sm" icon = {RotateCcw} onClick = {handleReset} disabled = {isRunning || isPlaying}>
            Reset
          </Button>
        </div>
      </PageHeader>

      <GuestPromptBanner />

      <SimulationLayout
        moduleKey = "dp"
        algorithmKey = {algorithm}
        explanationLevel = {explanationLevel}
        configPanel = {
          <DpConfig
            algorithm = {algorithm}
            onAlgorithmChange = {handleAlgorithmChange}
            presetOptions = {presetOptions}
            preset = {preset}
            onPresetChange = {handlePresetChange}
            string1 = {string1}
            onString1Change = {handleString1Change}
            string2 = {string2}
            onString2Change = {handleString2Change}
            knapsackPreset = {knapsackPreset}
            onKnapsackPresetChange = {handleKnapsackPresetChange}
            capacity = {capacity}
            onCapacityChange = {handleCapacityChange}
            items = {items}
            onItemAdd = {handleItemAdd}
            onItemRemove = {handleItemRemove}
            onItemChange = {handleItemChange}
            coinPreset = {coinPreset}
            onCoinPresetChange = {handleCoinPresetChange}
            coins = {coins}
            coinsText = {coinsText}
            onCoinsTextChange = {handleCoinsTextChange}
            coinTarget = {coinTarget}
            onCoinTargetChange = {handleCoinTargetChange}
            fibPreset = {fibPreset}
            onFibPresetChange = {handleFibPresetChange}
            fibN = {fibN}
            onFibNChange = {handleFibNChange}
            fibMode = {fibMode}
            onFibModeChange = {handleFibModeChange}
            explanationLevel = {explanationLevel}
            onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
            inputError = {inputError}
            error = {timelineError}
          />
        }
        metrics = {dpMetrics}
      >

        {/* visualization — switches based on algorithm and mode */}
        {(algorithm === 'lcs' || algorithm === 'edit_distance') && (
          <DpTableCanvas string1 = {string1} string2 = {string2} />
        )}

        {algorithm === 'knapsack_01' && (
          <DpTableCanvas
            algorithm = "knapsack_01"
            items = {items}
            capacity = {capacity}
          />
        )}

        {algorithm === 'coin_change' && (
          <DpStripCanvas showCoinUsed previewLength = {coinTarget + 1} />
        )}

        {algorithm === 'fibonacci' && fibMode === 'tabulation' && (
          <DpStripCanvas previewLength = {fibN + 1} />
        )}

        {algorithm === 'fibonacci' && fibMode === 'memoized' && (
          <div className = "flex-1 flex flex-col min-h-0">
            <div className = "flex-1 min-h-0 border-b border-hairline">
              <DpStripCanvas previewLength = {fibN + 1} />
            </div>
            <div className = "flex-1 min-h-0">
              <FibCallTree />
            </div>
          </div>
        )}

        {algorithm === 'fibonacci' && fibMode === 'naive_recursive' && (
          <FibCallTree />
        )}

      </SimulationLayout>
    </>
  )
}
