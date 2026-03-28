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

const DP_PRESETS = [
  { value: 'custom',          label: 'Custom' },
  { value: 'short_match',     label: 'Short — obvious match' },
  { value: 'no_match',        label: 'No common characters' },
  { value: 'identical',       label: 'Identical strings' },
  { value: 'single_char',     label: 'Single character each' },
  { value: 'substitutions',   label: 'Substitution-heavy' },
  { value: 'insert_delete',   label: 'Insert / delete mix' },
  { value: 'medium',          label: 'Medium strings' },
]

const PRESET_DATA = {
  short_match:   { string1: 'ABCDEF',    string2: 'ACBDFE' },
  no_match:      { string1: 'ABC',       string2: 'XYZ' },
  identical:     { string1: 'MATCH',     string2: 'MATCH' },
  single_char:   { string1: 'A',         string2: 'B' },
  substitutions: { string1: 'kitten',    string2: 'sitting' },
  insert_delete: { string1: 'abcde',     string2: 'aebdc' },
  medium:        { string1: 'ALGORITHM', string2: 'ALTRUISTIC' },
}

const KNAPSACK_PRESETS = [
  { value: 'custom',          label: 'Custom' },
  { value: 'textbook',        label: 'Textbook classic' },
  { value: 'tight_fit',       label: 'Tight fit' },
  { value: 'single_item',     label: 'Single item' },
  { value: 'all_fit',         label: 'All fit' },
]

const KNAPSACK_PRESET_DATA = {
  textbook:    { capacity: 10, items: [{weight: 2, value: 3}, {weight: 3, value: 4}, {weight: 4, value: 5}, {weight: 5, value: 6}] },
  tight_fit:   { capacity: 7,  items: [{weight: 3, value: 4}, {weight: 4, value: 5}, {weight: 5, value: 7}] },
  single_item: { capacity: 5,  items: [{weight: 3, value: 10}] },
  all_fit:     { capacity: 50, items: [{weight: 2, value: 3}, {weight: 3, value: 4}, {weight: 5, value: 8}] },
}

const COIN_PRESETS = [
  { value: 'custom',      label: 'Custom' },
  { value: 'us_coins',    label: 'US coins' },
  { value: 'greedy_fails', label: 'Greedy fails' },
  { value: 'impossible',  label: 'Impossible' },
  { value: 'powers_of_2', label: 'Powers of 2' },
]

const COIN_PRESET_DATA = {
  us_coins:    { coins: [1, 5, 10, 25], target: 41 },
  greedy_fails: { coins: [1, 3, 4], target: 6 },
  impossible:  { coins: [3, 7], target: 5 },
  powers_of_2: { coins: [1, 2, 4, 8, 16], target: 31 },
}

const FIB_PRESETS = [
  { value: 'custom',   label: 'Custom' },
  { value: 'small',    label: 'Small (n=8)' },
  { value: 'medium',   label: 'Medium (n=15)' },
  { value: 'large',    label: 'Large (n=30)' },
  { value: 'max_tab',  label: 'Max tabulation (n=50)' },
]

const FIB_PRESET_DATA = {
  small:   { n: 8 },
  medium:  { n: 15 },
  large:   { n: 30 },
  max_tab: { n: 50 },
}

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
  algorithm, onAlgorithmChange,
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
  onRun, onReset, onSave,
  isRunning, error,
}) {

  return (
    <ConfigPanel title = "DP Lab">

      <ConfigSection title = "Algorithm">
        <Select aria-label = "Algorithm" options = {DP_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Preset">
        {(algorithm === 'lcs' || algorithm === 'edit_distance') && (
          <Select aria-label = "Preset" options = {DP_PRESETS} value = {preset} onChange = {onPresetChange} />
        )}
        {algorithm === 'knapsack_01' && (
          <Select aria-label = "Preset" options = {KNAPSACK_PRESETS} value = {knapsackPreset} onChange = {onKnapsackPresetChange} />
        )}
        {algorithm === 'coin_change' && (
          <Select aria-label = "Preset" options = {COIN_PRESETS} value = {coinPreset} onChange = {onCoinPresetChange} />
        )}
        {algorithm === 'fibonacci' && (
          <Select aria-label = "Preset" options = {FIB_PRESETS} value = {fibPreset} onChange = {onFibPresetChange} />
        )}
      </ConfigSection>

      {/* Input — string pair (LCS / Edit Distance) */}
      {(algorithm === 'lcs' || algorithm === 'edit_distance') && (
        <ConfigSection title = "Input Strings">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">String A</label>
            <input type = "text" aria-label = "String A" value = {string1} onChange = {onString1Change}
              placeholder = "e.g. ABCDEF" maxLength = {MAX_STRING_LENGTH}
              className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
            />
          </div>
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">String B</label>
            <input type = "text" aria-label = "String B" value = {string2} onChange = {onString2Change}
              placeholder = "e.g. ACBDFE" maxLength = {MAX_STRING_LENGTH}
              className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
            />
          </div>
        </ConfigSection>
      )}

      {/* Input — knapsack */}
      {algorithm === 'knapsack_01' && (
        <ConfigSection title = "Knapsack Input">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">Capacity</label>
            <input type = "number" aria-label = "Capacity" value = {capacity} min = {1} max = {1000}
              onChange = {onCapacityChange}
              className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
            />
          </div>
          <div className = "space-y-2">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">Items</label>
            {items.map((item, i) => (
              <div key = {i} className = "flex gap-2 items-center">
                <input type = "number" aria-label = {`Item ${i + 1} weight`} value = {item.weight} min = {1}
                  onChange = {(e) => onItemChange(i, 'weight', Number(e.target.value))}
                  className = "w-16 bg-slate-900 border border-slate-700 focus:border-brand-500 rounded-lg px-2 py-1.5 text-slate-200 text-xs font-mono outline-none"
                  placeholder = "w"
                />
                <input type = "number" aria-label = {`Item ${i + 1} value`} value = {item.value} min = {1}
                  onChange = {(e) => onItemChange(i, 'value', Number(e.target.value))}
                  className = "w-16 bg-slate-900 border border-slate-700 focus:border-brand-500 rounded-lg px-2 py-1.5 text-slate-200 text-xs font-mono outline-none"
                  placeholder = "v"
                />
                <span className = "text-[10px] text-slate-600 font-mono">#{i + 1}</span>
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
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">Coins (comma-separated)</label>
            <input type = "text" aria-label = "Coins" value = {coinsText} onChange = {onCoinsTextChange}
              placeholder = "e.g. 1, 5, 10, 25"
              className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
            />
          </div>
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">Target Amount</label>
            <input type = "number" aria-label = "Target" value = {coinTarget} min = {1} max = {2499}
              onChange = {onCoinTargetChange}
              className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
            />
          </div>
        </ConfigSection>
      )}

      {/* Input — fibonacci */}
      {algorithm === 'fibonacci' && (
        <ConfigSection title = "Fibonacci Input">
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">Mode</label>
            <Select aria-label = "Mode" options = {FIB_MODES} value = {fibMode} onChange = {onFibModeChange} />
          </div>
          <div className = "space-y-1.5">
            <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">
              n (max {FIB_MODE_CAPS[fibMode]})
            </label>
            <input type = "number" aria-label = "n" value = {fibN} min = {1} max = {FIB_MODE_CAPS[fibMode]}
              onChange = {onFibNChange}
              className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
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

      <ConfigSection title = "Input Summary">
        <div className = "rounded-lg bg-slate-800/50 border border-white/[0.06] px-3 py-2.5 space-y-1">
          <p className = "text-xs font-medium text-slate-300">
            {DP_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm}
          </p>
          {(algorithm === 'lcs' || algorithm === 'edit_distance') && string1.length + string2.length > 0 && (
            <p className = "font-mono text-[10px] text-slate-500">
              |A| = {string1.length}, |B| = {string2.length} &middot; table {string1.length + 1} &times; {string2.length + 1}
            </p>
          )}
          {algorithm === 'knapsack_01' && (
            <p className = "font-mono text-[10px] text-slate-500">
              cap={capacity}, {items.length} items &middot; table {items.length + 1} &times; {capacity + 1}
            </p>
          )}
          {algorithm === 'coin_change' && (
            <p className = "font-mono text-[10px] text-slate-500">
              coins=[{coins.join(',')}], target={coinTarget} &middot; array length {coinTarget + 1}
            </p>
          )}
          {algorithm === 'fibonacci' && (
            <p className = "font-mono text-[10px] text-slate-500">
              F({fibN}), mode={fibMode}
            </p>
          )}
        </div>
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

      <ConfigSection>
        <Button
          variant = "primary"
          size = "md"
          icon = {Play}
          className = "w-full"
          onClick = {onRun}
          disabled = {isRunning || !!inputError}
        >
          {isRunning ? 'Running…' : 'Run Simulation'}
        </Button>

        <Button
          variant = "ghost"
          size = "md"
          icon = {Save}
          className = "w-full text-slate-500"
          onClick = {onSave}
          disabled = {isRunning || !!inputError}
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



const CELL_BASE = 'flex items-center justify-center font-mono text-xs tabular-nums transition-all duration-150'

const CELL_STATE_CLASSES = {
  default:  `${CELL_BASE} border border-white/[0.04] text-slate-600`,
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

const HEADER_CELL = 'flex items-center justify-center bg-slate-800/80 border border-white/[0.06] font-mono text-xs font-semibold text-slate-400 select-none'


function DpTableCanvas({ string1, string2, algorithm, items }) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const isLoading  = usePlaybackStore((s) => s.isLoading)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)

  const activeCellRef = useRef(null)

  const table         = currentStep?.state_payload?.table ?? null
  const cellStates    = currentStep?.state_payload?.cell_states ?? null
  const currentCell   = currentStep?.state_payload?.current_cell ?? null
  const tracebackPath = currentStep?.state_payload?.traceback_path ?? []
  const explanation   = currentStep?.explanation ?? null
  const eventType     = currentStep?.event_type ?? currentStep?.eventType ?? null

  const hasTimeline = totalSteps > 0

  const activeRow = currentCell?.[0] ?? null
  const activeCol = currentCell?.[1] ?? null

  // auto-scroll the active cell into view on each step
  useEffect(() => {
    activeCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeRow, activeCol])


  // ── empty state ──
  if (!hasTimeline) {
    return (
      <div className = "flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className = "text-sm font-medium text-slate-500">
          DP table — cells fill in as the algorithm progresses
        </p>

        <p className = "text-xs text-slate-600 max-w-xs leading-relaxed">
          Enter your input strings, then step through the recurrence relation.
        </p>

        <div className = "flex flex-wrap gap-2 mt-1">
          {['LCS', 'Edit Distance', 'Knapsack', 'Coin Change', 'Fibonacci'].map((alg) => (
            <span
              key = {alg}
              className = "text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-white/[0.06]"
            >
              {alg}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (!table || table.length === 0) {
    return (
      <div className = "flex-1 flex items-center justify-center">
        <p className = "text-sm text-slate-500">No table data.</p>
      </div>
    )
  }


  // ── derive grid dimensions ──
  const rows = table.length
  const cols = table[0]?.length ?? 0

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
        <div className = "absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
          <div className = "flex flex-col items-center gap-3">
            <div className = "w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className = "text-xs text-slate-500 font-mono">Running simulation…</p>
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
            {table.map((row, i) => [
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
    return <div className = "shrink-0 border-t border-white/[0.06] px-4 py-3 min-h-[40px]" />
  }

  return (
    <div className = "shrink-0 border-t border-white/[0.06] px-4 py-3 space-y-2 overflow-x-auto min-h-[40px]">

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
        <p className = "text-xs text-slate-400 leading-relaxed">{explanation}</p>
      )}

    </div>
  )
}


// ─── Page ───────────────────────────────────────────────

export default function DpLabPage() {
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
    return s?.module_type === 'dp' ? s : null
  })

  const [algorithm, setAlgorithm] = useState(loadedScenario?.algorithm_key ?? 'lcs')
  const [preset, setPreset] = useState(loadedScenario ? 'custom' : 'short_match')
  const [string1, setString1] = useState(loadedScenario?.input_payload?.string1 ?? PRESET_DATA.short_match.string1)
  const [string2, setString2] = useState(loadedScenario?.input_payload?.string2 ?? PRESET_DATA.short_match.string2)
  const [explanationLevel, setExplanationLevel] = useState('standard')

  // knapsack state
  const [capacity, setCapacity] = useState(KNAPSACK_PRESET_DATA.textbook.capacity)
  const [items, setItems] = useState(KNAPSACK_PRESET_DATA.textbook.items)
  const [knapsackPreset, setKnapsackPreset] = useState('textbook')

  // coin change state
  const [coins, setCoins] = useState(COIN_PRESET_DATA.us_coins.coins)
  const [coinTarget, setCoinTarget] = useState(COIN_PRESET_DATA.us_coins.target)
  const [coinPreset, setCoinPreset] = useState('us_coins')
  const [coinsText, setCoinsText] = useState('1, 5, 10, 25')

  // fibonacci state
  const [fibN, setFibN] = useState(8)
  const [fibMode, setFibMode] = useState('tabulation')
  const [fibPreset, setFibPreset] = useState('small')

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

    if (key !== 'custom') {
      const data = PRESET_DATA[key]
      setString1(data.string1)
      setString2(data.string2)
    }
  }, [clearTimeline, clearRun])


  const handleString1Change = useCallback((e) => {
    setString1(e.target.value)
    setPreset('custom')
  }, [])


  const handleString2Change = useCallback((e) => {
    setString2(e.target.value)
    setPreset('custom')
  }, [])


  const handleRun = useCallback(() => {
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
      explanation_level: explanationLevel,
    })
  }, [run, algorithm, string1, string2, capacity, items, coins, coinTarget, fibN, fibMode, explanationLevel])


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
  }, [])

  const handleItemAdd = useCallback(() => {
    setItems((prev) => [...prev, { weight: 1, value: 1 }])
    setKnapsackPreset('custom')
  }, [])

  const handleItemRemove = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setKnapsackPreset('custom')
  }, [])

  const handleCoinsTextChange = useCallback((e) => {
    const text = e.target.value
    setCoinsText(text)
    setCoinPreset('custom')
    const parsed = text.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
    setCoins(parsed)
  }, [])

  const handleKnapsackPresetChange = useCallback((e) => {
    const key = e.target.value
    setKnapsackPreset(key)
    clearTimeline()
    clearRun()
    if (key !== 'custom') {
      const data = KNAPSACK_PRESET_DATA[key]
      setCapacity(data.capacity)
      setItems(data.items.map((it) => ({ ...it })))
    }
  }, [clearTimeline, clearRun])

  const handleCoinPresetChange = useCallback((e) => {
    const key = e.target.value
    setCoinPreset(key)
    clearTimeline()
    clearRun()
    if (key !== 'custom') {
      const data = COIN_PRESET_DATA[key]
      setCoins(data.coins)
      setCoinTarget(data.target)
      setCoinsText(data.coins.join(', '))
    }
  }, [clearTimeline, clearRun])

  const handleFibPresetChange = useCallback((e) => {
    const key = e.target.value
    setFibPreset(key)
    clearTimeline()
    clearRun()
    if (key !== 'custom') {
      setFibN(FIB_PRESET_DATA[key].n)
    }
  }, [clearTimeline, clearRun])

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
    clearTimeline()
    clearRun()

    // select first preset for the new algorithm
    if (key === 'lcs' || key === 'edit_distance') {
      setPreset('short_match')
      setString1(PRESET_DATA.short_match.string1)
      setString2(PRESET_DATA.short_match.string2)
    } else if (key === 'knapsack_01') {
      setKnapsackPreset('textbook')
      setCapacity(KNAPSACK_PRESET_DATA.textbook.capacity)
      setItems(KNAPSACK_PRESET_DATA.textbook.items)
    } else if (key === 'coin_change') {
      setCoinPreset('us_coins')
      setCoins(COIN_PRESET_DATA.us_coins.coins)
      setCoinTarget(COIN_PRESET_DATA.us_coins.target)
      setCoinsText(COIN_PRESET_DATA.us_coins.coins.join(', '))
    } else if (key === 'fibonacci') {
      setFibPreset('small')
      setFibN(FIB_PRESET_DATA.small.n)
      setFibMode('tabulation')
    }
  }, [clearTimeline, clearRun])


  return (
    <>
      <PageHeader
        icon = {Grid3x3}
        title = "DP Lab"
        description = "Explore dynamic programming through step-by-step table construction, traceback, and recursive call trees."
        accent = "violet"
        badge = "Phase 7"
      />

      <GuestPromptBanner />

      <SimulationLayout
        configPanel = {
          <DpConfig
            algorithm = {algorithm}
            onAlgorithmChange = {handleAlgorithmChange}
            preset = {preset}
            onPresetChange = {handlePresetChange}
            string1 = {string1}
            onString1Change = {handleString1Change}
            string2 = {string2}
            onString2Change = {handleString2Change}
            knapsackPreset = {knapsackPreset}
            onKnapsackPresetChange = {handleKnapsackPresetChange}
            capacity = {capacity}
            onCapacityChange = {(e) => { setCapacity(Number(e.target.value)); setKnapsackPreset('custom') }}
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
            onCoinTargetChange = {(e) => { setCoinTarget(Number(e.target.value)); setCoinPreset('custom') }}
            fibPreset = {fibPreset}
            onFibPresetChange = {handleFibPresetChange}
            fibN = {fibN}
            onFibNChange = {(e) => { setFibN(Number(e.target.value)); setFibPreset('custom') }}
            fibMode = {fibMode}
            onFibModeChange = {handleFibModeChange}
            explanationLevel = {explanationLevel}
            onExplanationLevelChange = {(e) => setExplanationLevel(e.target.value)}
            inputError = {inputError}
            onRun = {handleRun}
            onReset = {handleReset}
            onSave = {handleSave}
            isRunning = {isRunning || isPlaying}
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
          />
        )}

        {algorithm === 'coin_change' && (
          <DpStripCanvas showCoinUsed />
        )}

        {algorithm === 'fibonacci' && fibMode === 'tabulation' && (
          <DpStripCanvas />
        )}

        {algorithm === 'fibonacci' && fibMode === 'memoized' && (
          <div className = "flex-1 flex flex-col min-h-0">
            <div className = "flex-1 min-h-0 border-b border-white/[0.06]">
              <DpStripCanvas />
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
