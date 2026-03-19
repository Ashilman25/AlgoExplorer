import { useCallback, useState, useMemo } from 'react'
import { Grid3x3, Play, RotateCcw, Save } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { useRunSimulation } from '../hooks/useRunSimulation'
import { usePlaybackStore } from '../stores/usePlaybackStore'
import { useRunStore } from '../stores/useRunStore'
import { useGuestStore } from '../stores/useGuestStore'


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
  {value: 'custom', label: 'Custom'},
  {value: 'short_match', label: 'Short — obvious match'},
  {value: 'no_match', label: 'No common characters'},
  {value: 'identical', label: 'Identical strings'},
  {value: 'single_char', label: 'Single character each'},
  {value: 'substitutions', label: 'Substitution-heavy'},
  {value: 'insert_delete', label: 'Insert / delete mix'},
  {value: 'medium', label: 'Medium strings'},
]

const PRESET_DATA = {
  short_match: {string1: 'ABCDEF', string2: 'ACBDFE'},
  no_match: {string1: 'ABC', string2: 'XYZ'},
  identical: {string1: 'MATCH', string2: 'MATCH'},
  single_char: {string1: 'A', string2: 'B'},
  substitutions: {string1: 'kitten', string2: 'sitting'},
  insert_delete: {string1: 'abcde', string2: 'aebdc'},
  medium: {string1: 'ALGORITHM', string2: 'ALTRUISTIC'},
}

const MAX_STRING_LENGTH = 50
const DP_TABLE_MAX_CELLS = 2500


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



export default function DpLabPage() {
  const { run, isRunning } = useRunSimulation()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const { clearTimeline, error: timelineError } = usePlaybackStore()
  const { clearRun } = useRunStore()
  const { saveScenario } = useGuestStore()


  const [algorithm, setAlgorithm] = useState('lcs')
  const [preset, setPreset] = useState('short_match')
  const [string1, setString1] = useState(PRESET_DATA.short_match.string1)
  const [string2, setString2] = useState(PRESET_DATA.short_match.string2)
  const [explanationLevel, setExplanationLevel] = useState('standard')


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
        {label: 'Cells computed', value: '—'},
        {label: 'Table size', value: '—'},
        {label: 'Traceback length', value: '—'},
        {label: 'Subproblems reused', value: '—'},
        {label: 'Runtime', value: '—'},
      ]
    }

    return [
      {label: 'Cells computed', value: String(snapshot.cells_computed ?? 0)},
      {label: 'Table size', value: `${snapshot.table_rows ?? 0} × ${snapshot.table_cols ?? 0}`},
      {label: 'Traceback length', value: String(snapshot.traceback_length ?? 0)},
      {label: 'Subproblems reused', value: String(snapshot.subproblems_reused ?? 0)},
      {label: 'Runtime', value: snapshot.runtime_ms != null ? `${snapshot.runtime_ms} ms` : '—'},
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
    saveScenario({
      id: `dp-${Date.now()}`,
      name: `${DP_ALGOS.find((a) => a.value === algorithm)?.label ?? algorithm} — "${string1}" vs "${string2}"`,
      module_type: 'dp',
      algorithm_key: algorithm,
      input_payload: {
        string1,
        string2,
      },
      created_at: new Date().toISOString(),
    })
  }, [saveScenario, algorithm, string1, string2])


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

      </SimulationLayout>
    </>
  )
}
