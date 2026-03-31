import { useState, useCallback, useEffect } from 'react'
import {
  Gauge, Play, Check, X, ChevronDown, ChevronUp,
  Clock, Hash, ArrowUpDown, PenTool, Loader2,
  Download, FileJson, FileSpreadsheet,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Button, Card, MetricCard, Badge, Spinner, Select, Slider, useToast, ErrorAlert } from '../components/ui'
import { benchmarksService } from '../services/benchmarksService'
import { parseApiError } from '../services/client'
import { useBenchmarkStore } from '../stores/useBenchmarkStore'
import BenchmarkChart from '../components/benchmark/BenchmarkChart'
import {
  BENCHMARK_MODULE_TYPES,
  BENCHMARK_CATEGORIES,
  BENCHMARK_ALGORITHMS,
  BENCHMARK_INPUT_FAMILIES,
  BENCHMARK_METRICS,
  BENCHMARK_LIMITS,
  BENCHMARK_SIZE_PRESETS,
  BENCHMARK_SIZE_LIMITS,
} from '../config/benchmarkConfig'
import GuestPromptBanner from '../components/guest/GuestPromptBanner'

const METRIC_ICONS = {
  runtime_ms: Clock,
  comparisons: Hash,
  swaps: ArrowUpDown,
  writes: PenTool,
  nodes_visited: Hash,
  edges_explored: Hash,
  max_structure_size: Hash,
  relaxations: Hash,
  edges_considered: Hash,
  edges_added: Hash,
  mst_total_weight: Hash,
  nodes_ordered: Hash,
  edges_processed: Hash,
}

function getAlgorithms(moduleType, category) {
  if (moduleType === 'sorting') return BENCHMARK_ALGORITHMS.sorting
  return BENCHMARK_ALGORITHMS.graph?.[category] ?? []
}
function getFamilies(moduleType, category) {
  if (moduleType === 'sorting') return BENCHMARK_INPUT_FAMILIES.sorting
  return BENCHMARK_INPUT_FAMILIES.graph?.[category] ?? []
}
function getMetrics(moduleType, category) {
  if (moduleType === 'sorting') return BENCHMARK_METRICS.sorting
  return BENCHMARK_METRICS.graph?.[category] ?? []
}
function getSizePresets(moduleType, category, inputFamily) {
  if (moduleType === 'sorting') return BENCHMARK_SIZE_PRESETS.sorting
  return BENCHMARK_SIZE_PRESETS.graph?.[inputFamily] ?? []
}
function getSizeLimits(moduleType, inputFamily) {
  if (moduleType === 'sorting') return BENCHMARK_SIZE_LIMITS.sorting
  return BENCHMARK_SIZE_LIMITS.graph?.[inputFamily] ?? { min: 10, max: 10000 }
}


function CheckboxGroup({ label, options, selected, onChange, min = 0, max = Infinity }) {
  const toggle = (key) => {
    const isSelected = selected.includes(key)
    if (isSelected && selected.length <= min) return
    if (!isSelected && selected.length >= max) return
    onChange(isSelected ? selected.filter((k) => k !== key) : [...selected, key])
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block text-xs font-medium text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      )}
      <div className="space-y-1">
        {options.map((opt) => {
          const checked = selected.includes(opt.key)
          return (
            <label
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer
                         hover:bg-slate-800/60 transition-colors duration-100"
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors
                  ${checked
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-slate-600'
                  }`}
              >
                {checked && <Check size={10} strokeWidth={3} className="text-slate-950" />}
              </span>
              <span className="text-sm text-slate-300">{opt.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}


// ── Size Selector ───────────────────────────────────────────

function SizeSelector({ preset, onPresetChange, customSizes, onCustomSizesChange, sizePresets, sizeLimits }) {
  const [showCustom, setShowCustom] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const presetOptions = sizePresets.map((p, i) => ({
    value: String(i),
    label: p.label,
  }))
  presetOptions.push({ value: 'custom', label: 'Custom' })

  const handlePresetChange = (val) => {
    if (val === 'custom') {
      onPresetChange('custom')
      setShowCustom(true)
    } else {
      onPresetChange(val)
      setShowCustom(false)
      onCustomSizesChange(sizePresets[Number(val)].sizes)
    }
  }

  const handleApplyCustom = () => {
    const parsed = customInput
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= sizeLimits.min && n <= sizeLimits.max)
    const unique = [...new Set(parsed)].sort((a, b) => a - b).slice(0, BENCHMARK_LIMITS.SIZES_MAX_COUNT)
    if (unique.length > 0) {
      onCustomSizesChange(unique)
    }
  }

  return (
    <div className="space-y-2">
      <Select
        label="Input Sizes"
        options={presetOptions}
        value={preset}
        onChange={(e) => handlePresetChange(e.target.value)}
      />
      {(showCustom || preset === 'custom') && (
        <div className="space-y-1.5">
          <input
            type="text"
            placeholder="e.g. 100, 500, 1000, 5000"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2
                       text-sm text-slate-200 placeholder-slate-600
                       focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 outline-none"
          />
          <div className="flex items-center justify-between">
            <Button size="sm" onClick={handleApplyCustom}>Apply</Button>
            <span className="text-[10px] text-slate-600 font-mono">
              {sizeLimits.min.toLocaleString()}\u2013{sizeLimits.max.toLocaleString()}
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-1 mt-1">
        {customSizes.map((s) => (
          <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/[0.06]">
            {s.toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  )
}


// ── Config Panel ────────────────────────────────────────────

function BenchmarkConfig({
  moduleType, onModuleTypeChange,
  category, onCategoryChange,
  algorithms, onAlgorithmsChange,
  inputFamily, onInputFamilyChange,
  sizePreset, onSizePresetChange,
  sizes, onSizesChange,
  trials, onTrialsChange,
  metrics, onMetricsChange,
  onLaunch, isRunning,
}) {
  const moduleOptions = BENCHMARK_MODULE_TYPES.map((m) => ({
    value: m,
    label: m.charAt(0).toUpperCase() + m.slice(1),
  }))

  const categoryOptions = (BENCHMARK_CATEGORIES[moduleType] ?? []).map((c) => ({
    value: c.key,
    label: c.label,
  }))

  const resolvedAlgorithms = getAlgorithms(moduleType, category)
  const resolvedFamilies = getFamilies(moduleType, category)
  const resolvedMetrics = getMetrics(moduleType, category)
  const resolvedPresets = getSizePresets(moduleType, category, inputFamily)
  const resolvedLimits = getSizeLimits(moduleType, inputFamily)

  const familyOptions = resolvedFamilies.map((f) => ({
    value: f.key,
    label: f.label,
  }))

  return (
    <div className="w-80 shrink-0 space-y-1">
      <Card title="Benchmark Configuration">
        <div className="p-4 space-y-5">

          <Select
            label="Module"
            options={moduleOptions}
            value={moduleType}
            onChange={(e) => onModuleTypeChange(e.target.value)}
          />

          {moduleType === 'graph' && (
            <Select
              label="Category"
              options={categoryOptions}
              value={category ?? ''}
              onChange={(e) => onCategoryChange(e.target.value)}
            />
          )}

          <CheckboxGroup
            label="Algorithms"
            options={resolvedAlgorithms}
            selected={algorithms}
            onChange={onAlgorithmsChange}
            min={BENCHMARK_LIMITS.ALGORITHMS_MIN}
          />

          <Select
            label="Input Family"
            options={familyOptions}
            value={inputFamily}
            onChange={(e) => onInputFamilyChange(e.target.value)}
          />

          <SizeSelector
            preset={sizePreset}
            onPresetChange={onSizePresetChange}
            customSizes={sizes}
            onCustomSizesChange={onSizesChange}
            sizePresets={resolvedPresets}
            sizeLimits={resolvedLimits}
          />

          <Slider
            label="Trials per Size"
            min={BENCHMARK_LIMITS.TRIALS_MIN}
            max={BENCHMARK_LIMITS.TRIALS_MAX}
            step={1}
            value={trials}
            onChange={onTrialsChange}
            formatValue={(v) => `${v} trials`}
          />

          <CheckboxGroup
            label="Metrics"
            options={resolvedMetrics}
            selected={metrics}
            onChange={onMetricsChange}
            min={1}
          />

          <Button
            variant="primary"
            icon={isRunning ? Loader2 : Play}
            disabled={isRunning || algorithms.length === 0 || sizes.length === 0 || metrics.length === 0}
            onClick={onLaunch}
            className="w-full"
          >
            {isRunning ? 'Running...' : 'Launch Benchmark'}
          </Button>

        </div>
      </Card>
    </div>
  )
}


// ── Summary Cards ───────────────────────────────────────────

function BenchmarkSummary({ summary, status }) {
  if (!summary || Object.keys(summary).length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard label="Algorithms" value={summary.total_algorithms} />
      <MetricCard label="Sizes Tested" value={summary.total_sizes} />
      <MetricCard label="Total Runs" value={summary.total_runs} />
      <MetricCard
        label="Elapsed"
        value={summary.elapsed_ms != null ? `${summary.elapsed_ms.toLocaleString()} ms` : '--'}
      />
    </div>
  )
}


// ── Results Table ───────────────────────────────────────────

function ResultsTable({ table, metrics, moduleType, category }) {
  const [sortCol, setSortCol] = useState('algorithm_key')
  const [sortDir, setSortDir] = useState('asc')
  const [showAllSizes, setShowAllSizes] = useState(false)
  const [selectedSize, setSelectedSize] = useState(null)

  if (!table || table.length === 0) return null

  const resolvedMetrics = getMetrics(moduleType, category)

  // Extract unique sizes sorted ascending
  const allSizes = [...new Set(table.map((r) => r.size))].sort((a, b) => a - b)

  // Default to largest size
  const activeSize = selectedSize ?? allSizes[allSizes.length - 1]

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const metricColumns = []
  for (const m of metrics) {
    const prefix = m === 'runtime_ms' ? 'runtime' : m
    metricColumns.push({ key: `${prefix}_mean`, label: `${resolvedMetrics.find((x) => x.key === m)?.label ?? m} (mean)` })
    metricColumns.push({ key: `${prefix}_median`, label: `${resolvedMetrics.find((x) => x.key === m)?.label ?? m} (med)` })
  }

  // Filter rows: single size unless "show all" is toggled
  const filtered = showAllSizes ? table : table.filter((r) => r.size === activeSize)

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? 0
    const bv = b[sortCol] ?? 0
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const SortIcon = sortDir === 'asc' ? ChevronUp : ChevronDown

  const formatCell = (val) => {
    if (val == null) return '--'
    if (typeof val === 'number') return val % 1 === 0 ? val.toLocaleString() : val.toFixed(3)
    return val
  }

  // Columns: hide "Size" column when viewing a single size
  const headerColumns = showAllSizes
    ? [{ key: 'algorithm_key', label: 'Algorithm' }, { key: 'size', label: 'Size' }, ...metricColumns]
    : [{ key: 'algorithm_key', label: 'Algorithm' }, ...metricColumns]

  return (
    <Card title="Results Table">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          {!showAllSizes && allSizes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Size</span>
              <select
                value={activeSize}
                onChange={(e) => setSelectedSize(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
              >
                {allSizes.map((s) => (
                  <option key={s} value={s}>{s.toLocaleString()}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {allSizes.length > 1 && (
          <button
            onClick={() => setShowAllSizes((v) => !v)}
            className="text-[10px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wide"
          >
            {showAllSizes ? 'Filter by size' : 'Show all sizes'}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              {headerColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-3 py-2.5 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && <SortIcon size={10} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.algorithm_key}-${row.size}`}
                className={`border-b border-slate-800/50 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}
              >
                <td className="px-3 py-2 text-slate-300 font-mono text-xs">{row.algorithm_key}</td>
                {showAllSizes && (
                  <td className="px-3 py-2 text-slate-400 font-mono text-xs">{row.size?.toLocaleString()}</td>
                )}
                {metricColumns.map((col) => (
                  <td key={col.key} className="px-3 py-2 text-slate-400 font-mono text-xs">
                    {formatCell(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}


// ── Charts ──────────────────────────────────────────────────

function ChartSection({ series, metrics, moduleType, category }) {
  if (!series || Object.keys(series).length === 0) return null

  const resolvedMetrics = getMetrics(moduleType, category)

  return (
    <Card title="Performance Charts">
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {metrics.map((metricKey) => {
            const metricInfo = resolvedMetrics.find((m) => m.key === metricKey)
            const Icon = METRIC_ICONS[metricKey] ?? Hash
            const seriesData = series[metricKey]

            return (
              <div
                key={metricKey}
                className="rounded-xl bg-slate-800/40 border border-white/[0.06] p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} strokeWidth={1.5} className="text-cyan-400" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {metricInfo?.label ?? metricKey}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono ml-auto">
                    {metricInfo?.unit}
                  </span>
                </div>

                <BenchmarkChart
                  seriesData={seriesData}
                  label={metricInfo?.label}
                  unit={metricInfo?.unit}
                />
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}


// ── Export ───────────────────────────────────────────────────

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportJSON(resultData) {
  const payload = {
    summary: resultData.summary,
    series: resultData.series,
    table: resultData.table,
    exported_at: new Date().toISOString(),
  }
  downloadFile(JSON.stringify(payload, null, 2), 'benchmark-results.json', 'application/json')
}

function exportCSV(resultData) {
  const table = resultData.table
  if (!table || table.length === 0) return

  const headers = Object.keys(table[0])
  const rows = table.map((row) =>
    headers.map((h) => {
      const val = row[h]
      return val == null ? '' : String(val)
    }).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  downloadFile(csv, 'benchmark-results.csv', 'text/csv')
}

function ExportBar({ resultData }) {
  if (!resultData) return null

  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-800/50 border border-white/[0.06] px-4 py-3">
      <div className="flex items-center gap-2">
        <Download size={14} strokeWidth={1.5} className="text-slate-500" />
        <span className="text-xs text-slate-500">Export Results</span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" icon={FileJson} onClick={() => exportJSON(resultData)}>
          JSON
        </Button>

        <Button size="sm" icon={FileSpreadsheet} onClick={() => exportCSV(resultData)}>
          CSV
        </Button>
      </div>
    </div>
  )
}


// ── Main Page ───────────────────────────────────────────────

export default function BenchmarksPage() {
  const toast = useToast()
  const { setJob, setActiveJob, pollJob, stopPolling, jobs, activeJobId } = useBenchmarkStore()

  // Module / category state
  const [moduleType, setModuleType] = useState('sorting')
  const [category, setCategory] = useState(null)

  // Form state
  const [algorithms, setAlgorithms] = useState(
    BENCHMARK_ALGORITHMS.sorting.map((a) => a.key)
  )
  const [inputFamily, setInputFamily] = useState('random')
  const [sizePreset, setSizePreset] = useState('0')
  const [sizes, setSizes] = useState(BENCHMARK_SIZE_PRESETS.sorting[0].sizes)
  const [trials, setTrials] = useState(BENCHMARK_LIMITS.TRIALS_DEFAULT)
  const [metrics, setMetrics] = useState(
    BENCHMARK_METRICS.sorting.slice(0, 3).map((m) => m.key)
  )

  // Result state
  const [isRunning, setIsRunning] = useState(false)
  const [resultData, setResultData] = useState(null)
  const [benchmarkError, setBenchmarkError] = useState(null)
  const [workerHealthy, setWorkerHealthy] = useState(true)

  // Active job tracking
  const activeJob = activeJobId != null ? jobs[activeJobId] : null

  // Check worker health on mount
  useEffect(() => {
    benchmarksService.getWorkerHealth()
      .then((health) => setWorkerHealthy(health.healthy))
      .catch(() => setWorkerHealthy(false))
  }, [])

  // React to polling updates
  useEffect(() => {
    if (!activeJob) return

    if (activeJob.status === 'completed') {
      setIsRunning(false)

      if (activeJob.results) {
        setResultData({
          status: 'completed',
          summary: activeJob.results?.summary || activeJob.summary || {},
          series: activeJob.results?.series || {},
          table: activeJob.results?.table || [],
        })
      } else {
        benchmarksService.getResults(activeJobId).then((results) => {
          setResultData(results)
        })
      }

      toast({
        type: 'success',
        title: 'Benchmark complete',
        message: `Benchmark finished successfully.`,
      })
    } else if (activeJob.status === 'failed') {
      setIsRunning(false)
      setBenchmarkError({
        title: 'Benchmark failed',
        message: activeJob.summary?.error || 'An unexpected error occurred during benchmarking.',
      })
      toast({
        type: 'error',
        title: 'Benchmark failed',
        message: activeJob.summary?.error || 'An unexpected error occurred.',
      })
    }
  }, [activeJob?.status])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const handleModuleTypeChange = useCallback((newModule) => {
    setModuleType(newModule)
    setResultData(null)
    setBenchmarkError(null)

    if (newModule === 'sorting') {
      setCategory(null)
      const algs = BENCHMARK_ALGORITHMS.sorting
      setAlgorithms(algs.map((a) => a.key))
      const families = BENCHMARK_INPUT_FAMILIES.sorting
      setInputFamily(families[0].key)
      const presets = BENCHMARK_SIZE_PRESETS.sorting
      setSizePreset('0')
      setSizes(presets[0].sizes)
      const mets = BENCHMARK_METRICS.sorting
      setMetrics(mets.slice(0, 3).map((m) => m.key))
    } else {
      const firstCat = BENCHMARK_CATEGORIES[newModule]?.[0]?.key ?? null
      setCategory(firstCat)
      const algs = getAlgorithms(newModule, firstCat)
      setAlgorithms(algs.map((a) => a.key))
      const families = getFamilies(newModule, firstCat)
      const firstFamily = families[0]?.key ?? ''
      setInputFamily(firstFamily)
      const presets = getSizePresets(newModule, firstCat, firstFamily)
      setSizePreset('0')
      setSizes(presets[0]?.sizes ?? [])
      const mets = getMetrics(newModule, firstCat)
      setMetrics(mets.slice(0, 3).map((m) => m.key))
    }
    setTrials(BENCHMARK_LIMITS.TRIALS_DEFAULT)
  }, [])

  const handleCategoryChange = useCallback((newCat) => {
    setCategory(newCat)
    setResultData(null)
    setBenchmarkError(null)

    const algs = getAlgorithms(moduleType, newCat)
    setAlgorithms(algs.map((a) => a.key))
    const families = getFamilies(moduleType, newCat)
    const firstFamily = families[0]?.key ?? ''
    setInputFamily(firstFamily)
    const presets = getSizePresets(moduleType, newCat, firstFamily)
    setSizePreset('0')
    setSizes(presets[0]?.sizes ?? [])
    const mets = getMetrics(moduleType, newCat)
    setMetrics(mets.slice(0, 3).map((m) => m.key))
  }, [moduleType])

  const handleInputFamilyChange = useCallback((newFamily) => {
    setInputFamily(newFamily)
    const presets = getSizePresets(moduleType, category, newFamily)
    setSizePreset('0')
    setSizes(presets[0]?.sizes ?? [])
  }, [moduleType, category])

  const handleLaunch = useCallback(async () => {
    setIsRunning(true)
    setResultData(null)
    setBenchmarkError(null)

    try {
      const body = {
        module_type: moduleType,
        algorithm_keys: algorithms,
        input_family: inputFamily,
        sizes,
        trials_per_size: trials,
        metrics,
      }
      if (category) {
        body.category = category
      }

      const statusResp = await benchmarksService.createJob(body)

      setJob(statusResp.id, statusResp)
      setActiveJob(statusResp.id)
      pollJob(statusResp.id)

    } catch (err) {
      setIsRunning(false)
      const parsed = parseApiError(err)
      setBenchmarkError(parsed)
      toast({
        type: 'error',
        title: parsed.title,
        message: parsed.message,
      })
    }
  }, [moduleType, category, algorithms, inputFamily, sizes, trials, metrics, setJob, setActiveJob, pollJob, toast])

  const progress = activeJob?.progress ?? 0
  const statusLabel = activeJob?.status === 'pending'
    ? 'Queued...'
    : activeJob?.status === 'running'
      ? `Running benchmarks... ${Math.round(progress * 100)}%`
      : null

  const hasResults = resultData && resultData.status === 'completed'

  return (
    <>
      <PageHeader
        icon={Gauge}
        title="Benchmark Lab"
        description="Compare algorithm performance across input sizes with repeated trials and aggregated statistics."
        accent="emerald"
      >
        {activeJob && (
          <Badge variant={activeJob.status === 'completed' ? 'success' : activeJob.status === 'failed' ? 'error' : 'info'}>
            {activeJob.status}
          </Badge>
        )}
      </PageHeader>

      <GuestPromptBanner />

      {!workerHealthy && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          No benchmark workers detected. Jobs will be queued until a worker is available.
        </div>
      )}

      <div className="flex gap-6 items-start">
        <BenchmarkConfig
          moduleType={moduleType}
          onModuleTypeChange={handleModuleTypeChange}
          category={category}
          onCategoryChange={handleCategoryChange}
          algorithms={algorithms}
          onAlgorithmsChange={setAlgorithms}
          inputFamily={inputFamily}
          onInputFamilyChange={handleInputFamilyChange}
          sizePreset={sizePreset}
          onSizePresetChange={setSizePreset}
          sizes={sizes}
          onSizesChange={setSizes}
          trials={trials}
          onTrialsChange={setTrials}
          metrics={metrics}
          onMetricsChange={setMetrics}
          onLaunch={handleLaunch}
          isRunning={isRunning}
        />

        <div className="flex-1 min-w-0 space-y-4">
          {isRunning && (
            <Card>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Spinner size="md" />
                    <span className="text-sm text-slate-400">
                      {statusLabel || `Running benchmark (${algorithms.length} algorithms x ${sizes.length} sizes x ${trials} trials)...`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          )}

          {benchmarkError && !isRunning && (
            <ErrorAlert
              title={benchmarkError.title}
              message={benchmarkError.message}
              fields={benchmarkError.fields}
              onDismiss={() => setBenchmarkError(null)}
            />
          )}

          {hasResults && (
            <>
              <BenchmarkSummary summary={resultData.summary} status={resultData.status} />
              <ExportBar resultData={resultData} />
              <ChartSection series={resultData.series} metrics={metrics} moduleType={moduleType} category={category} />
              <ResultsTable table={resultData.table} metrics={metrics} moduleType={moduleType} category={category} />
            </>
          )}

          {!isRunning && !hasResults && !benchmarkError && (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-white/[0.07] mb-5">
                  <Gauge size={22} strokeWidth={1} className="text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-1">No benchmark results yet</p>
                <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                  Configure your benchmark parameters and click Launch to compare algorithm performance.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
