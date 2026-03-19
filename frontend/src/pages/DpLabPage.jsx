import { useMemo } from 'react'
import { Grid3x3, Play } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Select } from '../components/ui'
import { SimulationLayout, ConfigPanel, ConfigSection } from '../components/simulation'
import { usePlaybackStore } from '../stores/usePlaybackStore'

const DP_ALGOS = [
  {value: 'lcs', label: 'LCS — Longest Common Subsequence'},
  {value: 'edit_distance', label: 'Edit Distance (Levenshtein)'},
]

function DpConfig() {
  return (
    <ConfigPanel title = "DP Lab">

      <ConfigSection title = "Algorithm">
        <Select options = {DP_ALGOS} />
      </ConfigSection>

      <ConfigSection title = "Input Strings">
        <div className = "space-y-1.5">
          <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">
            String A
          </label>

          <input
            type = "text"
            placeholder = "e.g. ABCDEF"
            defaultValue = "ABCDEF"
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
          />
        </div>

        <div className = "space-y-1.5">
          <label className = "block text-xs font-medium text-slate-500 uppercase tracking-wide">
            String B
          </label>

          <input
            type = "text"
            placeholder = "e.g. ACBDFE"
            defaultValue = "ACBDFE"
            className = "w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono transition-colors outline-none"
          />
        </div>
      </ConfigSection>

      <ConfigSection>
        <Button variant = "primary" size = "md" icon = {Play} className = "w-full">
          Run Simulation
        </Button>

        <Button variant = "ghost" size = "md" className = "w-full text-slate-500">
          Reset
        </Button>
      </ConfigSection>

    </ConfigPanel>
  )
}

export default function DpLabPage() {
  const currentStep = usePlaybackStore((s) => s.currentStep)

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

  return (
    <>
      <PageHeader
        icon = {Grid3x3}
        title = "DP Lab"
        description = "Explore LCS and Edit Distance through cell-by-cell DP table construction with traceback overlays."
        accent = "violet"
        badge = "Phase 7"
      />

      <SimulationLayout configPanel={<DpConfig />} metrics = {dpMetrics}>

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
