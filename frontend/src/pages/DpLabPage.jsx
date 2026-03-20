import { useCallback, useState, useMemo, useRef, useEffect } from 'react'
import { Grid3x3, Play, RotateCcw, Save } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select, useToast } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'
import { runsService } from '../services/runsService'


// ─── Constants ──────────────────────────────────────────

const DP_ALGOS = [
  {value: 'lcs', label: 'LCS — Longest Common Subsequence'},
  {value: 'edit_distance', label: 'Edit Distance (Levenshtein)'},
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


function validateDpStrings(s1, s2) {
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


// ─── Config Panel ───────────────────────────────────────

function DpConfig({
  algorithm, onAlgorithmChange,
  preset, onPresetChange,
  string1, onString1Change,
  string2, onString2Change,
  explanationLevel, onExplanationLevelChange,
  inputError,
  onRun, onReset, onSave,
  isRunning, error,
}) {
  const tableCells = (string1.length + 1) * (string2.length + 1)

  return (
    <ConfigPanel title = "DP Lab">

      <ConfigSection title = "Algorithm">
        <Select options = {DP_ALGOS} value = {algorithm} onChange = {onAlgorithmChange} />
      </ConfigSection>

      <ConfigSection title = "Preset">
        <Select options = {DP_PRESETS} value = {preset} onChange = {onPresetChange} />
      </ConfigSection>

      <ConfigSection title = "Input Strings">
        <div className = "space-y-1.5">
          <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">
            String A
          </label>

          <input
            type = "text"
            value = {string1}
            onChange = {onString1Change}
            placeholder = "e.g. ABCDEF"
            maxLength = {MAX_STRING_LENGTH}
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
          />
        </div>

        <div className = "space-y-1.5">
          <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">
            String B
          </label>

          <input
            type = "text"
            value = {string2}
            onChange = {onString2Change}
            placeholder = "e.g. ACBDFE"
            maxLength = {MAX_STRING_LENGTH}
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
          />
        </div>
      </ConfigSection>

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
            {DP_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm}
          </p>

          <p className = "font-mono text-[10px] text-slate-500">
            {string1.length + string2.length > 0
              ? `|A| = ${string1.length}, |B| = ${string2.length} · table ${string1.length + 1} × ${string2.length + 1} (${tableCells} cells)`
              : 'No input yet'
            }
          </p>

          {string1.length > 0 && (
            <p className = "font-mono text-[10px] text-slate-600 leading-relaxed truncate" title = {string1}>
              A = "{string1}"
            </p>
          )}

          {string2.length > 0 && (
            <p className = "font-mono text-[10px] text-slate-600 leading-relaxed truncate" title = {string2}>
              B = "{string2}"
            </p>
          )}
        </div>
      </ConfigSection>

      {inputError && (
        <ConfigSection>
          <div className = "rounded-lg bg-state-target/10 border border-state-target/20 px-3 py-2">
            <p className = "text-[10px] font-mono text-state-target leading-relaxed">{inputError}</p>
          </div>
        </ConfigSection>
      )}

      {error && (
        <ConfigSection>
          <div className = "rounded-lg bg-state-target/10 border border-state-target/20 px-3 py-2">
            <p className = "text-[10px] font-mono text-state-target leading-relaxed">{error}</p>
          </div>
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


function DpTableCanvas({ string1, string2 }) {
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

        <div className = "flex gap-2 mt-1">
          {['LCS', 'Edit Distance'].map((alg) => (
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

  const rowHeaders = ['\u03b5', ...string1.split('')]   // ε + chars of string1
  const colHeaders = ['\u03b5', ...string2.split('')]   // ε + chars of string2

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
              A↓ B→
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
              <div key = {`rh-${i}`} className = {HEADER_CELL}>
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


function DpDataPanel({ explanation, currentCell, eventType }) {
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
  const { clearTimeline, setTimeline, setLoading: setTimelineLoading, play, error: timelineError } = usePlaybackStore()
  const { clearRun, setRun } = useRunStore()
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

  useEffect(() => {
    if (loadedScenario) useScenarioStore.getState().clearScenario()
  }, [loadedScenario])

  // Reopen run: auto-fetch timeline if navigated from Run History
  useEffect(() => {
    const reopenId = loadedScenario?._reopenRunId
    if (!reopenId) return

    let cancelled = false
    setTimelineLoading(true)

    ;(async () => {
      try {
        const [runSummary, timeline] = await Promise.all([
          runsService.getRun(reopenId),
          runsService.getTimeline(reopenId),
        ])
        if (cancelled) return
        setRun(reopenId, runSummary)
        setTimeline(timeline.steps)
        play()
      } catch {
        // timeline may no longer exist on backend — silently skip
      } finally {
        if (!cancelled) setTimelineLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  // --- validation ---
  const inputError = useMemo(
    () => validateDpStrings(string1, string2),
    [string1, string2],
  )


  // --- metrics derived from current step ---
  const dpMetrics = useMemo(() => {
    const snapshot = currentStep?.metrics_snapshot
    if (!snapshot) {
      return [
        { label: 'Cells computed',     value: '—' },
        { label: 'Table size',         value: '—' },
        { label: 'Traceback length',   value: '—' },
        { label: 'Subproblems reused', value: '—' },
        { label: 'Runtime',            value: '—' },
      ]
    }

    return [
      { label: 'Cells computed',     value: String(snapshot.cells_computed ?? 0) },
      { label: 'Table size',         value: `${snapshot.table_rows ?? 0} × ${snapshot.table_cols ?? 0}` },
      { label: 'Traceback length',   value: String(snapshot.traceback_length ?? 0) },
      { label: 'Subproblems reused', value: String(snapshot.subproblems_reused ?? 0) },
      { label: 'Runtime',            value: snapshot.runtime_ms != null ? `${snapshot.runtime_ms} ms` : '—' },
    ]
  }, [currentStep])


  // --- handlers ---

  const handlePresetChange = useCallback((e) => {
    const key = e.target.value
    setPreset(key)

    if (key !== 'custom') {
      const data = PRESET_DATA[key]
      setString1(data.string1)
      setString2(data.string2)
    }
  }, [])


  const handleString1Change = useCallback((e) => {
    setString1(e.target.value)
    setPreset('custom')
  }, [])


  const handleString2Change = useCallback((e) => {
    setString2(e.target.value)
    setPreset('custom')
  }, [])


  const handleRun = useCallback(() => {
    run({
      module_type: 'dp',
      algorithm_key: algorithm,
      input_payload: {
        string1,
        string2,
      },
      execution_mode: 'simulate',
      explanation_level: explanationLevel,
    })
  }, [run, algorithm, string1, string2, explanationLevel])


  const handleReset = useCallback(() => {
    clearTimeline()
    clearRun()
  }, [clearTimeline, clearRun])


  const handleSave = useCallback(() => {
    const name = `${DP_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm} — "${string1}" vs "${string2}"`
    saveScenario({
      id: `dp-${Date.now()}`,
      name,
      module_type: 'dp',
      algorithm_key: algorithm,
      input_payload: {
        string1,
        string2,
      },
      created_at: new Date().toISOString(),
    })
    toast({ type: 'success', title: 'Scenario saved', message: `"${name}" added to library.` })
  }, [saveScenario, toast, algorithm, string1, string2])


  return (
    <>
      <PageHeader
        icon = {Grid3x3}
        title = "DP Lab"
        description = "Explore LCS and Edit Distance through cell-by-cell DP table construction with traceback overlays."
        accent = "violet"
        badge = "Phase 7"
      />

      <SimulationLayout
        configPanel = {
          <DpConfig
            algorithm = {algorithm}
            onAlgorithmChange = {(e) => setAlgorithm(e.target.value)}
            preset = {preset}
            onPresetChange = {handlePresetChange}
            string1 = {string1}
            onString1Change = {handleString1Change}
            string2 = {string2}
            onString2Change = {handleString2Change}
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

        <DpTableCanvas string1 = {string1} string2 = {string2} />

      </SimulationLayout>
    </>
  )
}
