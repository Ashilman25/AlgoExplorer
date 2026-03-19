import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookMarked, Search, Trash2, Pencil, ExternalLink,
  Network, BarChart3, Grid3x3, Inbox,
} from 'lucide-react'

import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useGuestStore } from '../stores/useGuestStore'


/* ── constants ──────────────────────────────────────────────── */

const MODULE_FILTERS = [
  { value: 'all',     label: 'All modules' },
  { value: 'graph',   label: 'Graph' },
  { value: 'sorting', label: 'Sorting' },
  { value: 'dp',      label: 'DP' },
]

const MODULE_META = {
  graph:   { icon: Network,   badge: 'info',   route: '/graph' },
  sorting: { icon: BarChart3, badge: 'warning', route: '/sorting' },
  dp:      { icon: Grid3x3,   badge: 'violet',  route: '/dp' },
}


/* ── helpers ────────────────────────────────────────────────── */

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function inputSummary(scenario) {
  const p = scenario.input_payload
  if (!p) return ''

  switch (scenario.module_type) {
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


/* ── ScenarioCard ───────────────────────────────────────────── */

function ScenarioCard({ scenario, onEdit, onDelete, onLoad }) {
  const meta = MODULE_META[scenario.module_type] ?? MODULE_META.graph
  const Icon = meta.icon

  return (
    <div className = "glass border border-white/[0.07] rounded-xl p-4 flex flex-col gap-3 group hover:border-white/[0.12] transition-colors duration-fast">

      {/* top row */}
      <div className = "flex items-start justify-between gap-2">
        <div className = "flex items-center gap-2.5 min-w-0">
          <div className = "p-1.5 rounded-lg bg-slate-800/70 border border-white/[0.06] shrink-0">
            <Icon size = {14} strokeWidth = {1.5} className = "text-slate-400" />
          </div>

          <div className = "min-w-0">
            <p className = "text-sm font-medium text-slate-200 truncate">{scenario.name}</p>
            <p className = "text-[11px] text-slate-500 font-mono">{scenario.algorithm_key}</p>
          </div>
        </div>

        <Badge variant = {meta.badge}>{scenario.module_type}</Badge>
      </div>

      {/* meta row */}
      <div className = "flex items-center gap-3 text-[11px] text-slate-500">
        <span>{inputSummary(scenario)}</span>
        <span className = "text-slate-700">·</span>
        <span>{formatDate(scenario.created_at)}</span>
      </div>

      {/* actions */}
      <div className = "flex items-center gap-1.5 pt-1 border-t border-white/[0.05]">
        <button
          onClick = {() => onLoad(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-colors duration-fast"
        >
          <ExternalLink size = {11} strokeWidth = {1.5} />
          Load
        </button>

        <button
          onClick = {() => onEdit(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
        >
          <Pencil size = {11} strokeWidth = {1.5} />
          Edit
        </button>

        <button
          onClick = {() => onDelete(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-fast ml-auto"
        >
          <Trash2 size = {11} strokeWidth = {1.5} />
          Delete
        </button>
      </div>
    </div>
  )
}


/* ── EditModal ──────────────────────────────────────────────── */

function EditModal({ scenario, open, onClose, onSave }) {
  const [name, setName] = useState(scenario?.name ?? '')

  // sync when opening with a different scenario
  const currentId = scenario?.id
  const [lastId, setLastId] = useState(null)
  if (currentId && currentId !== lastId) {
    setLastId(currentId)
    setName(scenario.name)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ ...scenario, name: trimmed })
    onClose()
  }

  return (
    <Modal open = {open} onClose = {onClose} title = "Edit Scenario" size = "sm">
      <form onSubmit = {handleSubmit} className = "flex flex-col gap-4">
        <div>
          <label className = "block text-xs font-medium text-slate-400 mb-1.5">Scenario name</label>
          <input
            autoFocus
            value = {name}
            onChange = {(e) => setName(e.target.value)}
            className = "w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-slate-800/80 border border-white/[0.08] focus:border-brand-500/50 focus:outline-none transition-colors duration-fast placeholder:text-slate-600"
            placeholder = "e.g. BFS on cyclic graph"
          />
        </div>

        <div className = "flex items-center justify-end gap-2">
          <button
            type = "button"
            onClick = {onClose}
            className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
          >
            Cancel
          </button>

          <button
            type = "submit"
            disabled = {!name.trim()}
            className = "px-4 py-1.5 rounded-lg text-xs font-medium text-slate-950 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-fast"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}


/* ── DeleteModal ────────────────────────────────────────────── */

function DeleteModal({ scenario, open, onClose, onConfirm }) {
  if (!scenario) return null

  return (
    <Modal open = {open} onClose = {onClose} title = "Delete Scenario" size = "sm">
      <p className = "text-sm text-slate-300 mb-1">
        Are you sure you want to delete <span className = "font-semibold text-slate-100">"{scenario.name}"</span>?
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
          onClick = {() => { onConfirm(scenario.id); onClose() }}
          className = "px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors duration-fast"
        >
          Delete
        </button>
      </div>
    </Modal>
  )
}


/* ── ScenariosPage ──────────────────────────────────────────── */

export default function ScenariosPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { scenarios, saveScenario, deleteScenario } = useGuestStore()

  // filter + search state
  const [moduleFilter, setModuleFilter] = useState('all')
  const [query, setQuery] = useState('')

  // modal state
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // filtered + searched scenarios
  const filtered = useMemo(() => {
    let list = scenarios

    if (moduleFilter !== 'all') {
      list = list.filter((s) => s.module_type === moduleFilter)
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.algorithm_key.toLowerCase().includes(q),
      )
    }

    return list
  }, [scenarios, moduleFilter, query])


  // handlers
  const handleLoad = useCallback((scenario) => {
    const meta = MODULE_META[scenario.module_type]
    if (meta) navigate(meta.route)
  }, [navigate])

  const handleEditSave = useCallback((updated) => {
    saveScenario(updated)
    toast({ type: 'success', title: 'Scenario updated', message: `"${updated.name}" saved.` })
  }, [saveScenario, toast])

  const handleDelete = useCallback((id) => {
    deleteScenario(id)
    toast({ type: 'success', title: 'Scenario deleted' })
  }, [deleteScenario, toast])


  return (
    <>
      <PageHeader
        icon = {BookMarked}
        title = "Scenario Library"
        description = "Browse, search, and manage your saved algorithm scenarios."
        accent = "sky"
      >
        {/* search */}
        <div className = "relative">
          <Search size = {13} strokeWidth = {1.5} className = "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value = {query}
            onChange = {(e) => setQuery(e.target.value)}
            placeholder = "Search scenarios…"
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
      </PageHeader>

      {/* scenario count */}
      {scenarios.length > 0 && (
        <p className = "text-xs text-slate-500 mb-4 font-mono">
          {filtered.length} of {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
          {moduleFilter !== 'all' ? ` in ${moduleFilter}` : ''}
          {query ? ` matching "${query}"` : ''}
        </p>
      )}

      {/* main content */}
      {scenarios.length === 0 ? (
        <EmptyState
          icon = {Inbox}
          title = "No saved scenarios yet"
          description = "Run a simulation in any lab and press 'Save Scenario' to add it here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon = {Search}
          title = "No matching scenarios"
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
      ) : (
        <div className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => (
            <ScenarioCard
              key = {s.id}
              scenario = {s}
              onLoad = {handleLoad}
              onEdit = {setEditTarget}
              onDelete = {setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* modals */}
      <EditModal
        scenario = {editTarget}
        open = {!!editTarget}
        onClose = {() => setEditTarget(null)}
        onSave = {handleEditSave}
      />

      <DeleteModal
        scenario = {deleteTarget}
        open = {!!deleteTarget}
        onClose = {() => setDeleteTarget(null)}
        onConfirm = {handleDelete}
      />
    </>
  )
}
