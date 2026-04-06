import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Network, BarChart3, Grid3x3, BookMarked, Gauge, ArrowRight,
  Columns2, History, ExternalLink, Zap,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'


/* ── constants ──────────────────────────────────────────────── */

const LABS = [
  {
    label: 'Graph Lab',
    to: '/graph',
    icon: Network,
    iconColor: 'text-brand-400',
    iconBg: 'bg-brand-500/10',
    borderHover: 'hover:border-brand-500/25',
    description:
      'Visualize graph and pathfinding algorithms step by step on an interactive node/edge canvas.',
    algorithms: ['BFS', 'Dijkstra'],
  },
  {
    label: 'Sorting Lab',
    to: '/sorting',
    icon: BarChart3,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    borderHover: 'hover:border-amber-500/25',
    description:
      'Watch sorting algorithms work through arrays in real time with comparison and swap tracking.',
    algorithms: ['Quick Sort', 'Merge Sort'],
  },
  {
    label: 'DP Lab',
    to: '/dp',
    icon: Grid3x3,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/25',
    description:
      'Explore dynamic programming through cell-by-cell table construction with traceback overlays.',
    algorithms: ['LCS', 'Edit Distance'],
  },
]

const TOOLS = [
  {
    label: 'Scenario Library',
    to: '/scenarios',
    icon: BookMarked,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    borderHover: 'hover:border-sky-500/25',
    description: 'Save, browse, and reload your custom algorithm inputs and configurations.',
  },
  {
    label: 'Benchmark Lab',
    to: '/benchmarks',
    icon: Gauge,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    borderHover: 'hover:border-emerald-500/25',
    description: 'Measure algorithm performance across input sizes and visualize runtime curves.',
  },
  {
    label: 'Compare',
    to: '/compare',
    icon: Columns2,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/25',
    description: 'Run two algorithms side by side on identical inputs and compare their execution.',
  },
]

const MODULE_META = {
  graph:   { icon: Network,   badge: 'info',    route: '/graph',   label: 'Graph' },
  sorting: { icon: BarChart3, badge: 'warning',  route: '/sorting', label: 'Sorting' },
  dp:      { icon: Grid3x3,   badge: 'violet',   route: '/dp',      label: 'DP' },
}

const ALGO_LABELS = {
  bfs: 'BFS',
  dijkstra: 'Dijkstra',
  quicksort: 'Quick Sort',
  mergesort: 'Merge Sort',
  lcs: 'LCS',
  edit_distance: 'Edit Distance',
}

const FEATURED_PRESETS = [
  {
    label: 'BFS Traversal',
    description: 'Breadth-first search on a 6-node graph from A to F.',
    module_type: 'graph',
    algorithm_key: 'bfs',
    icon: Network,
    iconColor: 'text-brand-400',
    iconBg: 'bg-brand-500/10',
    borderHover: 'hover:border-brand-500/25',
    input_payload: {
      nodes: [{id:'A'},{id:'B'},{id:'C'},{id:'D'},{id:'E'},{id:'F'}],
      edges: [
        {source:'A',target:'B'},{source:'A',target:'C'},
        {source:'B',target:'D'},{source:'C',target:'E'},
        {source:'D',target:'F'},{source:'E',target:'F'},
      ],
      source: 'A', target: 'F', weighted: false, directed: false,
    },
  },
  {
    label: 'Dijkstra Shortest Path',
    description: 'Weighted shortest path through a diamond graph.',
    module_type: 'graph',
    algorithm_key: 'dijkstra',
    icon: Network,
    iconColor: 'text-brand-400',
    iconBg: 'bg-brand-500/10',
    borderHover: 'hover:border-brand-500/25',
    input_payload: {
      nodes: [{id:'S'},{id:'A'},{id:'B'},{id:'C'},{id:'T'}],
      edges: [
        {source:'S',target:'A',weight:1},{source:'S',target:'B',weight:4},
        {source:'A',target:'C',weight:2},{source:'B',target:'C',weight:1},
        {source:'C',target:'T',weight:3},{source:'A',target:'B',weight:2},
      ],
      source: 'S', target: 'T', weighted: true, directed: false,
    },
  },
  {
    label: 'Quick Sort',
    description: 'Sort a reversed 20-element array with pivot partitioning.',
    module_type: 'sorting',
    algorithm_key: 'quicksort',
    icon: BarChart3,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    borderHover: 'hover:border-amber-500/25',
    input_payload: {
      array: Array.from({ length: 20 }, (_, i) => 20 - i),
      preset: 'custom',
    },
  },
  {
    label: 'Merge Sort',
    description: 'Divide-and-conquer a shuffled 15-element array.',
    module_type: 'sorting',
    algorithm_key: 'mergesort',
    icon: BarChart3,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    borderHover: 'hover:border-amber-500/25',
    input_payload: {
      array: [8, 3, 14, 1, 11, 6, 15, 4, 12, 7, 2, 13, 9, 5, 10],
      preset: 'custom',
    },
  },
  {
    label: 'LCS',
    description: 'Longest common subsequence of "ABCDEF" and "ACBDFE".',
    module_type: 'dp',
    algorithm_key: 'lcs',
    icon: Grid3x3,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/25',
    input_payload: { string1: 'ABCDEF', string2: 'ACBDFE' },
  },
  {
    label: 'Edit Distance',
    description: 'Minimum edits to transform "kitten" into "sitting".',
    module_type: 'dp',
    algorithm_key: 'edit_distance',
    icon: Grid3x3,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/25',
    input_payload: { string1: 'kitten', string2: 'sitting' },
  },
]

const MAX_RECENT = 5


/* ── helpers ────────────────────────────────────────────────── */

function formatRelative(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function runInputSummary(run) {
  const p = run.config?.input_payload
  if (!p) return ''
  switch (run.module_type) {
    case 'graph':   return `${p.nodes?.length ?? 0} nodes`
    case 'sorting': return `${p.array?.length ?? 0} elements`
    case 'dp':      return `"${truncate(p.string1, 8)}" vs "${truncate(p.string2, 8)}"`
    default:        return ''
  }
}

function scenarioInputSummary(s) {
  const p = s.input_payload
  if (!p) return ''
  switch (s.module_type) {
    case 'graph':   return `${p.nodes?.length ?? 0} nodes, ${p.edges?.length ?? 0} edges`
    case 'sorting': return `${p.array?.length ?? 0} elements`
    case 'dp':      return `"${truncate(p.string1, 8)}" vs "${truncate(p.string2, 8)}"`
    default:        return ''
  }
}


/* ── RecentRunRow ──────────────────────────────────────────── */

function RecentRunRow({ run, onClick }) {
  const meta = MODULE_META[run.module_type] ?? MODULE_META.graph
  const Icon = meta.icon

  return (
    <button
      onClick = {onClick}
      className = "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-dim border border-hairline hover:border-subtle hover:bg-hover transition-colors duration-fast group text-left"
    >
      <div className = "p-1 rounded-md bg-hover border border-hairline shrink-0">
        <Icon size = {11} strokeWidth = {1.5} className = "text-muted" />
      </div>

      <div className = "min-w-0 flex-1">
        <p className = "text-xs font-medium text-secondary truncate">
          {ALGO_LABELS[run.algorithm_key] ?? run.algorithm_key}
        </p>
        <p className = "text-[10px] text-faint truncate">
          {runInputSummary(run)}
        </p>
      </div>

      <Badge variant = {meta.badge} className = "shrink-0 hidden sm:inline-flex">{meta.label}</Badge>
      <span className = "text-[10px] text-faint shrink-0">{formatRelative(run.created_at)}</span>

      <ExternalLink
        size = {11}
        strokeWidth = {1.5}
        className = "text-faint group-hover:text-brand-400 shrink-0 transition-colors duration-fast"
      />
    </button>
  )
}


/* ── RecentScenarioRow ─────────────────────────────────────── */

function RecentScenarioRow({ scenario, onClick }) {
  const meta = MODULE_META[scenario.module_type] ?? MODULE_META.graph
  const Icon = meta.icon

  return (
    <button
      onClick = {onClick}
      className = "w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-dim border border-hairline hover:border-subtle hover:bg-hover transition-colors duration-fast group text-left"
    >
      <div className = "p-1 rounded-md bg-hover border border-hairline shrink-0">
        <Icon size = {11} strokeWidth = {1.5} className = "text-muted" />
      </div>

      <div className = "min-w-0 flex-1">
        <p className = "text-xs font-medium text-secondary truncate">{scenario.name}</p>
        <p className = "text-[10px] text-faint truncate">
          {ALGO_LABELS[scenario.algorithm_key] ?? scenario.algorithm_key}
          {' · '}
          {scenarioInputSummary(scenario)}
        </p>
      </div>

      <Badge variant = {meta.badge} className = "shrink-0 hidden sm:inline-flex">{meta.label}</Badge>
      <span className = "text-[10px] text-faint shrink-0">{formatRelative(scenario.created_at)}</span>

      <ExternalLink
        size = {11}
        strokeWidth = {1.5}
        className = "text-faint group-hover:text-brand-400 shrink-0 transition-colors duration-fast"
      />
    </button>
  )
}


/* ── PresetCard ────────────────────────────────────────────── */

function PresetCard({ preset, onClick }) {
  const Icon = preset.icon

  return (
    <button
      onClick = {onClick}
      className = {[
        'group flex flex-col gap-2.5 rounded-xl p-4 text-left',
        'bg-surface-dim border border-hairline',
        'transition-all duration-fast',
        preset.borderHover,
        'hover:bg-hover',
      ].join(' ')}
    >
      <div className = "flex items-center gap-2.5">
        <div className = {`p-1.5 rounded-lg ${preset.iconBg}`}>
          <Icon size = {13} strokeWidth = {1.5} className = {preset.iconColor} />
        </div>

        <span className = "text-xs font-semibold text-secondary">{preset.label}</span>
      </div>

      <p className = "text-[11px] text-muted leading-relaxed">{preset.description}</p>

      <div className = "flex items-center gap-1 mt-auto">
        <span className = "text-[10px] font-medium text-faint group-hover:text-brand-400 transition-colors duration-fast">
          Try it
        </span>
        <ArrowRight
          size = {10}
          strokeWidth = {1.5}
          className = "text-faint group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all duration-fast"
        />
      </div>
    </button>
  )
}


/* ── HomePage ──────────────────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { runs, scenarios } = useGuestStore()
  const setScenario = useScenarioStore((s) => s.setScenario)

  const recentRuns = runs.slice(0, MAX_RECENT)
  const recentScenarios = scenarios.slice(0, MAX_RECENT)
  const hasActivity = recentRuns.length > 0 || recentScenarios.length > 0

  const handleReopenRun = useCallback((run) => {
    const meta = MODULE_META[run.module_type]
    if (!meta || !run.config) {
      toast({ type: 'error', title: 'Cannot reopen', message: 'Run configuration is no longer available.' })
      return
    }
    setScenario({
      module_type: run.module_type,
      algorithm_key: run.algorithm_key,
      input_payload: run.config.input_payload,
      _reopenRunId: run.run_id,
    })
    navigate(meta.route)
  }, [navigate, setScenario, toast])

  const handleLoadScenario = useCallback((scenario) => {
    const meta = MODULE_META[scenario.module_type]
    if (!meta) return
    setScenario(scenario)
    navigate(meta.route)
  }, [navigate, setScenario])

  const handleLoadPreset = useCallback((preset) => {
    const meta = MODULE_META[preset.module_type]
    if (!meta) return
    setScenario({
      module_type: preset.module_type,
      algorithm_key: preset.algorithm_key,
      input_payload: preset.input_payload,
    })
    navigate(meta.route)
  }, [navigate, setScenario])


  return (
    <div className = "max-w-5xl">

      {/* ── Header ─────────────────────────────────────── */}
      <div className = "mb-10 animate-enter">
        <p className = "text-[11px] font-semibold tracking-[0.12em] uppercase text-brand-400 mb-2">
          Algorithm Explorer
        </p>

        <h1 className = "text-2xl font-semibold text-primary tracking-tight mb-2">
          Dashboard
        </h1>

        <p className = "text-sm text-muted max-w-md leading-relaxed">
          A browser-based simulation lab for visualizing, comparing, and benchmarking algorithms.
          Pick a lab below to begin exploring.
        </p>

      </div>


      {/* ── Algorithm Labs ─────────────────────────────── */}
      <section className = "mb-9 animate-enter stagger-1">
        <h2 className = "text-[10px] font-semibold tracking-[0.10em] uppercase text-faint mb-4">
          Algorithm Labs
        </h2>

        <div className = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LABS.map(lab => (
            <Link
              key = {lab.to}
              to = {lab.to}
              className = {[
                'group flex flex-col gap-5 rounded-xl p-5',
                'bg-surface-translucent border border-hairline',
                'transition-all duration-[150ms]',
                lab.borderHover,
                'hover:bg-hover',
              ].join(' ')}
            >
              <div className = "flex items-start justify-between">
                <div className = {`p-2.5 rounded-xl ${lab.iconBg}`}>
                  <lab.icon size = {17} strokeWidth = {1.5} className = {lab.iconColor} />
                </div>
              </div>

              <div className = "flex-1 space-y-1.5">
                <h3 className = "text-sm font-semibold text-primary">{lab.label}</h3>
                <p className = "text-xs text-muted leading-relaxed">{lab.description}</p>
              </div>

              <div className = "flex items-center justify-between gap-2">
                <div className = "flex gap-1.5 flex-wrap">
                  {lab.algorithms.map(alg => (
                    <span
                      key = {alg}
                      className = "text-[10px] font-mono px-2 py-0.5 rounded-full bg-elevated text-muted border border-hairline"
                    >
                      {alg}
                    </span>
                  ))}
                </div>
                <ArrowRight
                  size = {13}
                  strokeWidth = {1.5}
                  className = "text-faint group-hover:text-muted group-hover:translate-x-0.5 transition-all duration-[100ms] shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* ── Recent Activity ────────────────────────────── */}
      {hasActivity && (
        <section className = "mb-9 animate-enter stagger-2">
          <h2 className = "text-[10px] font-semibold tracking-[0.10em] uppercase text-faint mb-4">
            Recent Activity
          </h2>

          <div className = "grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* Recent Runs */}
            {recentRuns.length > 0 && (
              <div>
                <div className = "flex items-center justify-between mb-2.5">
                  <div className = "flex items-center gap-2">
                    <History size = {12} strokeWidth = {1.5} className = "text-faint" />
                    <h3 className = "text-[11px] font-semibold text-muted uppercase tracking-wide">Recent Runs</h3>
                    <span className = "text-[10px] text-faint font-mono">{runs.length}</span>
                  </div>

                  <Link
                    to = "/runs"
                    className = "text-[10px] font-medium text-faint hover:text-brand-400 transition-colors duration-fast flex items-center gap-1"
                  >
                    View all
                    <ArrowRight size = {9} strokeWidth = {1.5} />
                  </Link>
                </div>

                <div className = "flex flex-col gap-1">
                  {recentRuns.map((r) => (
                    <RecentRunRow key = {r.id} run = {r} onClick = {() => handleReopenRun(r)} />
                  ))}
                </div>
              </div>
            )}

            {/* Saved Scenarios */}
            {recentScenarios.length > 0 && (
              <div>
                <div className = "flex items-center justify-between mb-2.5">
                  <div className = "flex items-center gap-2">
                    <BookMarked size = {12} strokeWidth = {1.5} className = "text-faint" />
                    <h3 className = "text-[11px] font-semibold text-muted uppercase tracking-wide">Saved Scenarios</h3>
                    <span className = "text-[10px] text-faint font-mono">{scenarios.length}</span>
                  </div>

                  <Link
                    to = "/scenarios"
                    className = "text-[10px] font-medium text-faint hover:text-brand-400 transition-colors duration-fast flex items-center gap-1"
                  >
                    View all
                    <ArrowRight size = {9} strokeWidth = {1.5} />
                  </Link>
                </div>

                <div className = "flex flex-col gap-1">
                  {recentScenarios.map((s) => (
                    <RecentScenarioRow key = {s.id} scenario = {s} onClick = {() => handleLoadScenario(s)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}


      {/* ── Featured Presets ────────────────────────────── */}
      <section className = {`mb-9 animate-enter ${hasActivity ? 'stagger-3' : 'stagger-2'}`}>
        <div className = "flex items-center gap-2 mb-4">
          <Zap size = {12} strokeWidth = {1.5} className = "text-faint" />
          <h2 className = "text-[10px] font-semibold tracking-[0.10em] uppercase text-faint">
            Featured Presets
          </h2>
        </div>

        <div className = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_PRESETS.map((p) => (
            <PresetCard key = {`${p.module_type}-${p.algorithm_key}`} preset = {p} onClick = {() => handleLoadPreset(p)} />
          ))}
        </div>
      </section>


      {/* ── Tools ──────────────────────────────────────── */}
      <section className = {`animate-enter ${hasActivity ? 'stagger-4' : 'stagger-3'}`}>
        <h2 className = "text-[10px] font-semibold tracking-[0.10em] uppercase text-faint mb-4">
          Tools
        </h2>

        <div className = "grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TOOLS.map(tool => (
            <Link
              key = {tool.to}
              to = {tool.to}
              className = {[
                'group flex items-start gap-3.5 rounded-xl p-4',
                'bg-surface-translucent border border-hairline',
                'transition-all duration-[150ms]',
                tool.borderHover,
                'hover:bg-hover',
              ].join(' ')}
            >
              <div className = {`p-2 rounded-lg shrink-0 ${tool.iconBg}`}>
                <tool.icon size = {15} strokeWidth = {1.5} className = {tool.iconColor} />
              </div>

              <div className = "min-w-0 flex-1">
                <div className = "flex items-center justify-between gap-1">
                  <h3 className = "text-sm font-semibold text-secondary">{tool.label}</h3>
                  <ArrowRight
                    size = {12}
                    strokeWidth = {1.5}
                    className = "text-faint group-hover:text-muted group-hover:translate-x-0.5 transition-all duration-[100ms] shrink-0"
                  />
                </div>
                <p className = "mt-1 text-xs text-muted leading-relaxed">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
