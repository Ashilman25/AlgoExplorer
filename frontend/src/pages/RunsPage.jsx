import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  History, Search, Trash2, ExternalLink, RotateCcw, BookMarked,
  Network, BarChart3, Grid3x3, Inbox, LayoutGrid, List, X,
} from 'lucide-react'

import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useGuestStore } from '../stores/useGuestStore'
import { useScenarioStore } from '../stores/useScenarioStore'
import { generateId } from '../services/guestService'
import GuestPromptBanner from '../components/guest/GuestPromptBanner'


/* ── constants ──────────────────────────────────────────────── */

const MODULE_FILTERS = [
  { value: 'all',     label: 'All' },
  { value: 'graph',   label: 'Graph' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'dp',      label: 'DP' },
]

const MODULE_META = {
  graph:   { icon: Network,   badge: 'info',    route: '/graph',   label: 'Graph' },
  sorting: { icon: BarChart3, badge: 'warning',  route: '/sorting', label: 'Sorting' },
  dp:      { icon: Grid3x3,   badge: 'violet',   route: '/dp',      label: 'DP' },
}

const MODULE_ORDER = ['graph', 'sorting', 'dp']

const ALGO_LABELS = {
  // graph
  bfs: 'BFS',
  dfs: 'DFS',
  dijkstra: 'Dijkstra',
  astar: 'A*',
  bellman_ford: 'Bellman-Ford',
  prims: "Prim's",
  kruskals: "Kruskal's",
  topological_sort: 'Topological Sort',
  bfs_grid: 'BFS (Grid)',
  dfs_grid: 'DFS (Grid)',
  dijkstra_grid: 'Dijkstra (Grid)',
  astar_grid: 'A* (Grid)',
  // sorting
  quicksort: 'Quick Sort',
  mergesort: 'Merge Sort',
  bubble_sort: 'Bubble Sort',
  insertion_sort: 'Insertion Sort',
  selection_sort: 'Selection Sort',
  heap_sort: 'Heap Sort',
  linear_search: 'Linear Search',
  binary_search: 'Binary Search',
  // dp
  lcs: 'LCS',
  edit_distance: 'Edit Distance',
  fibonacci: 'Fibonacci',
  coin_change: 'Coin Change',
  knapsack_01: '0/1 Knapsack',
}


/* ── helpers ────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function algoLabel(key) {
  return ALGO_LABELS[key] ?? key
}

function inputSummary(run) {
  const p = run.config?.input_payload
  if (!p) return ''

  switch (run.module_type) {
    case 'graph':
      return `${p.nodes?.length ?? 0} nodes, ${p.edges?.length ?? 0} edges`
    case 'sorting':
      return `${p.array?.length ?? 0} elements`
    case 'dp':
      return `"${truncate(p.string1, 12)}" vs "${truncate(p.string2, 12)}"`
    default:
      return ''
  }
}

function truncate(str, max) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function metricEntries(run) {
  const s = run.summary
  if (!s) return []

  const entries = []

  switch (run.module_type) {
    case 'graph':
      if (s.nodes_visited != null) entries.push({ label: 'Visited', value: s.nodes_visited })
      if (s.edges_explored != null) entries.push({ label: 'Edges', value: s.edges_explored })
      if (s.path_found != null) entries.push({ label: 'Path', value: s.path_found ? 'Found' : 'None' })
      if (s.path_cost != null && s.path_cost !== 'N/A') entries.push({ label: 'Cost', value: s.path_cost })
      break
    case 'sorting':
      if (s.comparisons != null) entries.push({ label: 'Compares', value: s.comparisons })
      if (s.swaps != null) entries.push({ label: 'Swaps', value: s.swaps })
      if (s.writes != null && s.swaps == null) entries.push({ label: 'Writes', value: s.writes })
      if (s.max_recursion_depth != null) entries.push({ label: 'Depth', value: s.max_recursion_depth })
      break
    case 'dp':
      if (s.cells_computed != null) entries.push({ label: 'Cells', value: s.cells_computed })
      if (s.lcs_length != null) entries.push({ label: 'LCS len', value: s.lcs_length })
      if (s.edit_distance != null) entries.push({ label: 'Distance', value: s.edit_distance })
      if (s.traceback_length != null) entries.push({ label: 'Traceback', value: s.traceback_length })
      break
  }

  return entries.slice(0, 4)
}


/* ── RunCard (grid view) ─────────────────────────────────────── */

function RunCard({ run, onReopen, onRerun, onSaveScenario, onDelete }) {
  const meta = MODULE_META[run.module_type] ?? MODULE_META.graph
  const Icon = meta.icon
  const metrics = metricEntries(run)

  return (
    <div className = "glass border border-white/[0.07] rounded-xl p-4 flex flex-col gap-3 group hover:border-white/[0.12] transition-colors duration-fast">

      {/* top row */}
      <div className = "flex items-start justify-between gap-2">
        <div className = "flex items-center gap-2.5 min-w-0">
          <div className = "p-1.5 rounded-lg bg-slate-800/70 border border-white/[0.06] shrink-0">
            <Icon size = {14} strokeWidth = {1.5} className = "text-slate-400" />
          </div>

          <div className = "min-w-0">
            <p className = "text-sm font-medium text-slate-200 truncate">{algoLabel(run.algorithm_key)}</p>
            <p className = "text-[11px] text-slate-500 font-mono">{run.algorithm_key}</p>
          </div>
        </div>

        <Badge variant = {meta.badge}>{run.module_type}</Badge>
      </div>

      {/* meta row */}
      <div className = "flex items-center gap-3 text-[11px] text-slate-500">
        <span>{inputSummary(run)}</span>
        <span className = "text-slate-700">·</span>
        <span>{formatDate(run.created_at)}</span>
        <span className = "text-slate-700">·</span>
        <span>{formatTime(run.created_at)}</span>
      </div>

      {/* metrics */}
      {metrics.length > 0 && (
        <div className = "flex items-center gap-3 flex-wrap">
          {metrics.map((m) => (
            <div key = {m.label} className = "flex items-center gap-1.5">
              <span className = "text-[10px] text-slate-600 uppercase tracking-wide">{m.label}</span>
              <span className = "font-mono text-[11px] text-slate-300 font-medium">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* actions */}
      <div className = "flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
        <button
          onClick = {() => onReopen(run)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-colors duration-fast"
        >
          <ExternalLink size = {11} strokeWidth = {1.5} />
          Reopen
        </button>

        <button
          onClick = {() => onRerun(run)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
        >
          <RotateCcw size = {11} strokeWidth = {1.5} />
          Rerun
        </button>

        <button
          onClick = {() => onSaveScenario(run)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
        >
          <BookMarked size = {11} strokeWidth = {1.5} />
          Save Scenario
        </button>

        <button
          onClick = {() => onDelete(run)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-fast ml-auto"
        >
          <Trash2 size = {11} strokeWidth = {1.5} />
        </button>
      </div>
    </div>
  )
}


/* ── RunRow (list view) ──────────────────────────────────────── */

function RunRow({ run, onReopen, onRerun, onSaveScenario, onDelete }) {
  const meta = MODULE_META[run.module_type] ?? MODULE_META.graph
  const Icon = meta.icon
  const metrics = metricEntries(run)

  return (
    <div className = "flex items-center gap-4 px-4 py-2.5 glass border border-white/[0.07] rounded-lg hover:border-white/[0.12] transition-colors duration-fast group">

      {/* icon */}
      <div className = "p-1.5 rounded-lg bg-slate-800/70 border border-white/[0.06] shrink-0">
        <Icon size = {13} strokeWidth = {1.5} className = "text-slate-400" />
      </div>

      {/* name + algo */}
      <div className = "min-w-0 w-36 shrink-0">
        <p className = "text-sm font-medium text-slate-200 truncate">{algoLabel(run.algorithm_key)}</p>
        <div className = "flex items-center gap-2 mt-0.5">
          <span className = "text-[11px] text-slate-500 font-mono">{run.algorithm_key}</span>
          <span className = "text-slate-700 text-[10px]">·</span>
          <span className = "text-[11px] text-slate-500">{inputSummary(run)}</span>
        </div>
      </div>

      {/* metrics */}
      <div className = "hidden lg:flex items-center gap-4 flex-1 min-w-0">
        {metrics.map((m) => (
          <div key = {m.label} className = "flex items-center gap-1.5 shrink-0">
            <span className = "text-[10px] text-slate-600 uppercase tracking-wide">{m.label}</span>
            <span className = "font-mono text-[11px] text-slate-300 font-medium">{m.value}</span>
          </div>
        ))}
      </div>

      {/* badge + date */}
      <Badge variant = {meta.badge} className = "shrink-0">{run.module_type}</Badge>
      <span className = "text-[11px] text-slate-500 shrink-0 w-24 text-right hidden sm:block">{formatDate(run.created_at)}</span>
      <span className = "text-[11px] text-slate-500 shrink-0 w-16 text-right hidden md:block">{formatTime(run.created_at)}</span>

      {/* actions */}
      <div className = "flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
        <button onClick = {() => onReopen(run)} className = "p-1.5 rounded-md text-brand-400 hover:bg-brand-500/15 transition-colors duration-fast" title = "Reopen run">
          <ExternalLink size = {13} strokeWidth = {1.5} />
        </button>
        <button onClick = {() => onRerun(run)} className = "p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast" title = "Rerun with same config">
          <RotateCcw size = {13} strokeWidth = {1.5} />
        </button>
        <button onClick = {() => onSaveScenario(run)} className = "p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast" title = "Save as scenario">
          <BookMarked size = {13} strokeWidth = {1.5} />
        </button>
        <button onClick = {() => onDelete(run)} className = "p-1.5 rounded-md text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-fast" title = "Delete">
          <Trash2 size = {13} strokeWidth = {1.5} />
        </button>
      </div>
    </div>
  )
}


/* ── DeleteModal ────────────────────────────────────────────── */

function DeleteRunModal({ run, open, onClose, onConfirm }) {
  if (!run) return null

  return (
    <Modal open = {open} onClose = {onClose} title = "Delete Run" size = "sm">
      <p className = "text-sm text-slate-300 mb-1">
        Delete this <span className = "font-semibold text-slate-100">{algoLabel(run.algorithm_key)}</span> run from {formatDate(run.created_at)}?
      </p>
      <p className = "text-xs text-slate-500 mb-5">This action cannot be undone.</p>

      <div className = "flex items-center justify-end gap-2">
        <button
          onClick = {onClose}
          className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
        >
          Cancel
        </button>

        <button
          onClick = {() => { onConfirm(run.id); onClose() }}
          className = "px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors duration-fast"
        >
          Delete
        </button>
      </div>
    </Modal>
  )
}


/* ── ClearAllModal ──────────────────────────────────────────── */

function ClearAllModal({ count, open, onClose, onConfirm }) {
  return (
    <Modal open = {open} onClose = {onClose} title = "Clear Run History" size = "sm">
      <p className = "text-sm text-slate-300 mb-1">
        Delete all <span className = "font-semibold text-slate-100">{count}</span> run{count !== 1 ? 's' : ''} from history?
      </p>
      <p className = "text-xs text-slate-500 mb-5">This action cannot be undone.</p>

      <div className = "flex items-center justify-end gap-2">
        <button
          onClick = {onClose}
          className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
        >
          Cancel
        </button>

        <button
          onClick = {() => { onConfirm(); onClose() }}
          className = "px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors duration-fast"
        >
          Clear All
        </button>
      </div>
    </Modal>
  )
}


/* ── GroupedSection ─────────────────────────────────────────── */

function GroupedSection({ moduleType, runs, view, rowProps }) {
  const meta = MODULE_META[moduleType]
  if (!meta || runs.length === 0) return null
  const Icon = meta.icon
  const ItemComponent = view === 'grid' ? RunCard : RunRow

  return (
    <div className = "mb-6 last:mb-0">
      <div className = "flex items-center gap-2 mb-3">
        <Icon size = {14} strokeWidth = {1.5} className = "text-slate-500" />
        <h2 className = "text-xs font-semibold text-slate-400 uppercase tracking-wider">{meta.label}</h2>
        <span className = "text-[10px] text-slate-600 font-mono">{runs.length}</span>
      </div>

      {view === 'grid' ? (
        <div className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {runs.map((r) => <ItemComponent key = {r.id} run = {r} {...rowProps} />)}
        </div>
      ) : (
        <div className = "flex flex-col gap-1.5">
          {runs.map((r) => <ItemComponent key = {r.id} run = {r} {...rowProps} />)}
        </div>
      )}
    </div>
  )
}


/* ── RunsPage ──────────────────────────────────────────────── */

export default function RunsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { runs, deleteRun, clearRuns, saveScenario } = useGuestStore()
  const setScenario = useScenarioStore((s) => s.setScenario)

  // view + filter + search state
  const [view, setView] = useState('list')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [query, setQuery] = useState('')

  // modal state
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showClearAll, setShowClearAll] = useState(false)

  // filtered + searched runs
  const filtered = useMemo(() => {
    let list = runs

    if (moduleFilter !== 'all') {
      list = list.filter((r) => r.module_type === moduleFilter)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.algorithm_key.toLowerCase().includes(q) ||
          (ALGO_LABELS[r.algorithm_key] ?? '').toLowerCase().includes(q) ||
          r.module_type.toLowerCase().includes(q),
      )
    }

    return list
  }, [runs, moduleFilter, query])

  // group by module (only used when filter is "all")
  const grouped = useMemo(() => {
    if (moduleFilter !== 'all') return null
    const groups = {}
    for (const mod of MODULE_ORDER) {
      const items = filtered.filter((r) => r.module_type === mod)
      if (items.length > 0) groups[mod] = items
    }
    return Object.keys(groups).length > 0 ? groups : null
  }, [filtered, moduleFilter])


  // ── handlers ─────────────────────────────────────────────

  const handleReopen = useCallback((run) => {
    const meta = MODULE_META[run.module_type]
    if (!meta || !run.config?.input_payload) {
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

  const handleRerun = useCallback((run) => {
    const meta = MODULE_META[run.module_type]
    if (!meta || !run.config?.input_payload) {
      toast({ type: 'error', title: 'Cannot rerun', message: 'Run configuration is no longer available.' })
      return
    }

    setScenario({
      module_type: run.module_type,
      algorithm_key: run.algorithm_key,
      input_payload: run.config.input_payload,
    })
    navigate(meta.route)
  }, [navigate, setScenario, toast])

  const handleSaveScenario = useCallback((run) => {
    if (!run.config) {
      toast({ type: 'error', title: 'Cannot save', message: 'Run config not available.' })
      return
    }

    const name = `${algoLabel(run.algorithm_key)} — ${formatDate(run.created_at)}`
    const scenario = {
      id: generateId(),
      name,
      module_type: run.module_type,
      algorithm_key: run.algorithm_key,
      input_payload: run.config.input_payload,
      tags: [],
      created_at: new Date().toISOString(),
    }
    saveScenario(scenario)
    toast({ type: 'success', title: 'Scenario saved', message: `"${name}" added to library.` })
  }, [saveScenario, toast])

  const handleDelete = useCallback((id) => {
    deleteRun(id)
    toast({ type: 'success', title: 'Run deleted' })
  }, [deleteRun, toast])

  const handleClearAll = useCallback(() => {
    const count = runs.length
    clearRuns()
    toast({ type: 'success', title: 'History cleared', message: `${count} run${count !== 1 ? 's' : ''} removed.` })
  }, [runs.length, clearRuns, toast])

  const rowProps = {
    onReopen: handleReopen,
    onRerun: handleRerun,
    onSaveScenario: handleSaveScenario,
    onDelete: setDeleteTarget,
  }

  const ItemComponent = view === 'grid' ? RunCard : RunRow


  return (
    <>
      <PageHeader
        icon = {History}
        title = "Run History"
        description = "Browse every simulation you have run and reopen or re-execute any previous run."
        accent = "sky"
      >
        {/* search */}
        <div className = "relative">
          <Search size = {13} strokeWidth = {1.5} className = "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value = {query}
            onChange = {(e) => setQuery(e.target.value)}
            placeholder = "Search runs…"
            className = "pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-200 bg-slate-800/60 border border-white/[0.07] focus:border-brand-500/40 focus:outline-none transition-colors duration-fast w-48 placeholder:text-slate-600"
          />
        </div>

        {/* module filter */}
        <div className = "flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/50 border border-white/[0.06]">
          {MODULE_FILTERS.map((f) => (
            <button
              key = {f.value}
              onClick = {() => setModuleFilter(f.value)}
              className = {`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-fast ${
                moduleFilter === f.value
                  ? 'bg-slate-700 text-slate-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* view toggle */}
        <div className = "flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-800/50 border border-white/[0.06]">
          <button
            onClick = {() => setView('grid')}
            className = {`p-1.5 rounded-md transition-colors duration-fast ${
              view === 'grid' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
            title = "Grid view"
          >
            <LayoutGrid size = {13} strokeWidth = {1.5} />
          </button>
          <button
            onClick = {() => setView('list')}
            className = {`p-1.5 rounded-md transition-colors duration-fast ${
              view === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
            title = "List view"
          >
            <List size = {13} strokeWidth = {1.5} />
          </button>
        </div>
      </PageHeader>

      <GuestPromptBanner />

      {/* count + clear all */}
      {runs.length > 0 && (
        <div className = "flex items-center gap-3 mb-4 flex-wrap">
          <p className = "text-xs text-slate-500 font-mono shrink-0">
            {filtered.length} of {runs.length} run{runs.length !== 1 ? 's' : ''}
            {moduleFilter !== 'all' ? ` in ${moduleFilter}` : ''}
            {query ? ` matching "${query}"` : ''}
          </p>

          <button
            onClick = {() => setShowClearAll(true)}
            className = "ml-auto text-[11px] font-medium text-slate-600 hover:text-rose-400 transition-colors duration-fast"
          >
            Clear all
          </button>
        </div>
      )}


      {/* ── main content ──────────────────────────────────── */}
      {runs.length === 0 ? (
        <EmptyState
          icon = {Inbox}
          title = "No runs yet"
          description = "Run a simulation in any lab and it will appear here automatically."
        />

      ) : filtered.length === 0 ? (
        <EmptyState
          icon = {Search}
          title = "No matching runs"
          description = "Try adjusting your search or filter."
          action = {
            <button
              onClick = {() => { setQuery(''); setModuleFilter('all') }}
              className = "px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors duration-fast"
            >
              Clear filters
            </button>
          }
        />

      ) : grouped ? (
        /* grouped by module when "All" is selected */
        MODULE_ORDER.map((mod) =>
          grouped[mod] ? (
            <GroupedSection
              key = {mod}
              moduleType = {mod}
              runs = {grouped[mod]}
              view = {view}
              rowProps = {rowProps}
            />
          ) : null,
        )

      ) : view === 'grid' ? (
        <div className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => <ItemComponent key = {r.id} run = {r} {...rowProps} />)}
        </div>

      ) : (
        <div className = "flex flex-col gap-1.5">
          {filtered.map((r) => <ItemComponent key = {r.id} run = {r} {...rowProps} />)}
        </div>
      )}


      {/* ── modals ────────────────────────────────────────── */}
      <DeleteRunModal
        run = {deleteTarget}
        open = {!!deleteTarget}
        onClose = {() => setDeleteTarget(null)}
        onConfirm = {handleDelete}
      />

      <ClearAllModal
        count = {runs.length}
        open = {showClearAll}
        onClose = {() => setShowClearAll(false)}
        onConfirm = {handleClearAll}
      />
    </>
  )
}
