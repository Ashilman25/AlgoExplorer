import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookMarked, Search, Trash2, Pencil, ExternalLink, Copy,
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


/* ── helpers ────────────────────────────────────────────────── */

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
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

function collectAllTags(scenarios) {
  const set = new Set()
  for (const s of scenarios) {
    for (const t of s.tags ?? []) set.add(t)
  }
  return [...set].sort()
}


/* ── ScenarioCard (grid view) ──────────────────────────────── */

function ScenarioCard({ scenario, onEdit, onDelete, onLoad, onDuplicate }) {
  const meta = MODULE_META[scenario.module_type] ?? MODULE_META.graph
  const Icon = meta.icon
  const tags = scenario.tags ?? []

  return (
    <div className = "glass border border-hairline rounded-xl p-4 flex flex-col gap-3 group hover:border-subtle transition-colors duration-fast">

      {/* top row */}
      <div className = "flex items-start justify-between gap-2">
        <div className = "flex items-center gap-2.5 min-w-0">
          <div className = "p-1.5 rounded-lg bg-hover border border-hairline shrink-0">
            <Icon size = {14} strokeWidth = {1.5} className = "text-muted" />
          </div>

          <div className = "min-w-0">
            <p className = "text-sm font-medium text-secondary truncate">{scenario.name}</p>
            <p className = "text-[11px] text-muted font-mono">{scenario.algorithm_key}</p>
          </div>
        </div>

        <Badge variant = {meta.badge}>{scenario.module_type}</Badge>
      </div>

      {/* meta row */}
      <div className = "flex items-center gap-3 text-[11px] text-muted">
        <span>{inputSummary(scenario)}</span>
        <span className = "text-faint">·</span>
        <span>{formatDate(scenario.created_at)}</span>
      </div>

      {/* tags */}
      {tags.length > 0 && (
        <div className = "flex items-center gap-1.5 flex-wrap">
          {tags.map((t) => (
            <span key = {t} className = "px-1.5 py-0.5 rounded text-[10px] font-medium bg-elevated text-muted border border-hairline">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* actions */}
      <div className = "flex items-center gap-1.5 pt-1 border-t border-hairline">
        <button
          onClick = {() => onLoad(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-colors duration-fast"
        >
          <ExternalLink size = {11} strokeWidth = {1.5} />
          Load
        </button>

        <button
          onClick = {() => onDuplicate(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted hover:text-primary hover:bg-hover transition-colors duration-fast"
        >
          <Copy size = {11} strokeWidth = {1.5} />
          Duplicate
        </button>

        <button
          onClick = {() => onEdit(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted hover:text-primary hover:bg-hover transition-colors duration-fast"
        >
          <Pencil size = {11} strokeWidth = {1.5} />
          Edit
        </button>

        <button
          onClick = {() => onDelete(scenario)}
          className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-fast ml-auto"
        >
          <Trash2 size = {11} strokeWidth = {1.5} />
        </button>
      </div>
    </div>
  )
}


/* ── ScenarioRow (list view) ───────────────────────────────── */

function ScenarioRow({ scenario, onEdit, onDelete, onLoad, onDuplicate }) {
  const meta = MODULE_META[scenario.module_type] ?? MODULE_META.graph
  const Icon = meta.icon
  const tags = scenario.tags ?? []

  return (
    <div className = "flex items-center gap-4 px-4 py-2.5 glass border border-hairline rounded-lg hover:border-subtle transition-colors duration-fast group">

      {/* icon */}
      <div className = "p-1.5 rounded-lg bg-hover border border-hairline shrink-0">
        <Icon size = {13} strokeWidth = {1.5} className = "text-muted" />
      </div>

      {/* name + algo */}
      <div className = "min-w-0 flex-1">
        <p className = "text-sm font-medium text-secondary truncate">{scenario.name}</p>
        <div className = "flex items-center gap-2 mt-0.5">
          <span className = "text-[11px] text-muted font-mono">{scenario.algorithm_key}</span>
          <span className = "text-faint text-[10px]">·</span>
          <span className = "text-[11px] text-muted">{inputSummary(scenario)}</span>
        </div>
      </div>

      {/* tags */}
      {tags.length > 0 && (
        <div className = "hidden md:flex items-center gap-1 shrink-0">
          {tags.slice(0, 3).map((t) => (
            <span key = {t} className = "px-1.5 py-0.5 rounded text-[10px] font-medium bg-elevated text-muted border border-hairline">
              {t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className = "text-[10px] text-faint">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* badge + date */}
      <Badge variant = {meta.badge} className = "shrink-0">{scenario.module_type}</Badge>
      <span className = "text-[11px] text-muted shrink-0 w-24 text-right hidden sm:block">{formatDate(scenario.created_at)}</span>

      {/* actions */}
      <div className = "flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-fast">
        <button onClick = {() => onLoad(scenario)} className = "p-1.5 rounded-md text-brand-400 hover:bg-brand-500/15 transition-colors duration-fast" title = "Load">
          <ExternalLink size = {13} strokeWidth = {1.5} />
        </button>
        <button onClick = {() => onDuplicate(scenario)} className = "p-1.5 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors duration-fast" title = "Duplicate">
          <Copy size = {13} strokeWidth = {1.5} />
        </button>
        <button onClick = {() => onEdit(scenario)} className = "p-1.5 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors duration-fast" title = "Edit">
          <Pencil size = {13} strokeWidth = {1.5} />
        </button>
        <button onClick = {() => onDelete(scenario)} className = "p-1.5 rounded-md text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors duration-fast" title = "Delete">
          <Trash2 size = {13} strokeWidth = {1.5} />
        </button>
      </div>
    </div>
  )
}


/* ── EditModal ──────────────────────────────────────────────── */

function EditModal({ scenario, open, onClose, onSave, allTags }) {
  const [name, setName] = useState(scenario?.name ?? '')
  const [tags, setTags] = useState(scenario?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  // sync when opening with a different scenario
  const currentId = scenario?.id
  const [lastId, setLastId] = useState(null)
  if (currentId && currentId !== lastId) {
    setLastId(currentId)
    setName(scenario.name)
    setTags(scenario.tags ?? [])
    setTagInput('')
  }

  const addTag = (raw) => {
    const t = raw.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  const removeTag = (t) => setTags(tags.filter((x) => x !== t))

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  // suggestions: existing tags not already applied
  const suggestions = allTags.filter((t) => !tags.includes(t) && t.includes(tagInput.toLowerCase()))

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ ...scenario, name: trimmed, tags })
    onClose()
  }

  return (
    <Modal open = {open} onClose = {onClose} title = "Edit Scenario" size = "sm">
      <form onSubmit = {handleSubmit} className = "flex flex-col gap-4">

        {/* name */}
        <div>
          <label className = "block text-xs font-medium text-muted mb-1.5">Name</label>
          <input
            autoFocus
            value = {name}
            onChange = {(e) => setName(e.target.value)}
            className = "w-full px-3 py-2 rounded-lg text-sm text-secondary bg-surface border border-subtle focus:border-brand-500/50 focus:outline-none transition-colors duration-fast placeholder:text-faint"
            placeholder = "e.g. BFS on cyclic graph"
          />
        </div>

        {/* tags */}
        <div>
          <label className = "block text-xs font-medium text-muted mb-1.5">Tags</label>
          <div className = "flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-surface border border-subtle focus-within:border-brand-500/50 transition-colors duration-fast min-h-[38px]">
            {tags.map((t) => (
              <span key = {t} className = "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-elevated text-secondary border border-hairline">
                {t}
                <button type = "button" onClick = {() => removeTag(t)} className = "text-muted hover:text-primary">
                  <X size = {10} strokeWidth = {2} />
                </button>
              </span>
            ))}
            <input
              value = {tagInput}
              onChange = {(e) => setTagInput(e.target.value)}
              onKeyDown = {handleTagKeyDown}
              className = "flex-1 min-w-[80px] bg-transparent text-sm text-secondary outline-none placeholder:text-faint"
              placeholder = {tags.length ? '' : 'Type a tag and press Enter'}
            />
          </div>

          {/* tag suggestions */}
          {tagInput && suggestions.length > 0 && (
            <div className = "flex items-center gap-1.5 mt-1.5 flex-wrap">
              {suggestions.slice(0, 6).map((t) => (
                <button
                  key = {t}
                  type = "button"
                  onClick = {() => addTag(t)}
                  className = "px-2 py-0.5 rounded text-[10px] font-medium bg-surface text-muted border border-hairline hover:border-brand-500/30 hover:text-brand-400 transition-colors duration-fast"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* submit */}
        <div className = "flex items-center justify-end gap-2">
          <button
            type = "button"
            onClick = {onClose}
            className = "px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-primary hover:bg-hover transition-colors duration-fast"
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
      <p className = "text-sm text-secondary mb-1">
        Are you sure you want to delete <span className = "font-semibold text-primary">"{scenario.name}"</span>?
      </p>
      <p className = "text-xs text-muted mb-5">This action cannot be undone.</p>

      <div className = "flex items-center justify-end gap-2">
        <button
          onClick = {onClose}
          className = "px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-primary hover:bg-hover transition-colors duration-fast"
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


/* ── GroupedSection ─────────────────────────────────────────── */

function GroupedSection({ moduleType, scenarios, view, cardProps }) {
  const meta = MODULE_META[moduleType]
  if (!meta || scenarios.length === 0) return null
  const Icon = meta.icon
  const ItemComponent = view === 'grid' ? ScenarioCard : ScenarioRow

  return (
    <div className = "mb-6 last:mb-0">
      <div className = "flex items-center gap-2 mb-3">
        <Icon size = {14} strokeWidth = {1.5} className = "text-muted" />
        <h2 className = "text-xs font-semibold text-muted uppercase tracking-wider">{meta.label}</h2>
        <span className = "text-[10px] text-faint font-mono">{scenarios.length}</span>
      </div>

      {view === 'grid' ? (
        <div className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((s) => <ItemComponent key = {s.id} scenario = {s} {...cardProps} />)}
        </div>
      ) : (
        <div className = "flex flex-col gap-1.5">
          {scenarios.map((s) => <ItemComponent key = {s.id} scenario = {s} {...cardProps} />)}
        </div>
      )}
    </div>
  )
}


/* ── ScenariosPage ──────────────────────────────────────────── */

export default function ScenariosPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { scenarios, saveScenario, deleteScenario } = useGuestStore()

  // view + filter + search state
  const [view, setView] = useState('grid')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState(null)

  // modal state
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // all tags across every scenario
  const allTags = useMemo(() => collectAllTags(scenarios), [scenarios])

  // filtered + searched scenarios
  const filtered = useMemo(() => {
    let list = scenarios

    if (moduleFilter !== 'all') {
      list = list.filter((s) => s.module_type === moduleFilter)
    }

    if (tagFilter) {
      list = list.filter((s) => (s.tags ?? []).includes(tagFilter))
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (s) =>
          (s.name ?? '').toLowerCase().includes(q) ||
          (s.algorithm_key ?? '').toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.includes(q)),
      )
    }

    return list
  }, [scenarios, moduleFilter, tagFilter, query])

  // group by module (only used when filter is "all")
  const grouped = useMemo(() => {
    if (moduleFilter !== 'all') return null
    const groups = {}
    for (const mod of MODULE_ORDER) {
      const items = filtered.filter((s) => s.module_type === mod)
      if (items.length > 0) groups[mod] = items
    }
    return Object.keys(groups).length > 0 ? groups : null
  }, [filtered, moduleFilter])


  const setScenario = useScenarioStore((s) => s.setScenario)

  // handlers
  const handleLoad = useCallback((scenario) => {
    const meta = MODULE_META[scenario.module_type]
    if (!meta) return
    setScenario(scenario)
    navigate(meta.route)
  }, [navigate, setScenario])

  const handleEditSave = useCallback((updated) => {
    saveScenario(updated)
    toast({ type: 'success', title: 'Scenario updated', message: `"${updated.name}" saved.` })
  }, [saveScenario, toast])

  const handleDelete = useCallback((id) => {
    deleteScenario(id)
    toast({ type: 'success', title: 'Scenario deleted' })
  }, [deleteScenario, toast])

  const handleDuplicate = useCallback((scenario) => {
    const clone = {
      ...scenario,
      id: generateId(),
      name: `${scenario.name} (copy)`,
      created_at: new Date().toISOString(),
    }
    saveScenario(clone)
    toast({ type: 'success', title: 'Scenario duplicated', message: `"${clone.name}" created.` })
  }, [saveScenario, toast])

  const cardProps = {
    onLoad: handleLoad,
    onEdit: setEditTarget,
    onDelete: setDeleteTarget,
    onDuplicate: handleDuplicate,
  }

  const ItemComponent = view === 'grid' ? ScenarioCard : ScenarioRow


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
          <Search size = {13} strokeWidth = {1.5} className = "absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            value = {query}
            onChange = {(e) => setQuery(e.target.value)}
            placeholder = "Search scenarios…"
            className = "pl-8 pr-3 py-1.5 rounded-lg text-xs text-secondary bg-surface-translucent border border-hairline focus:border-brand-500/40 focus:outline-none transition-colors duration-fast w-48 placeholder:text-faint"
          />
        </div>

        {/* module filter */}
        <div className = "flex items-center gap-1 p-0.5 rounded-lg bg-surface-translucent border border-hairline">
          {MODULE_FILTERS.map((f) => (
            <button
              key = {f.value}
              onClick = {() => setModuleFilter(f.value)}
              className = {`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors duration-fast ${
                moduleFilter === f.value
                  ? 'bg-elevated text-secondary shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* view toggle */}
        <div className = "flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-translucent border border-hairline">
          <button
            onClick = {() => setView('grid')}
            className = {`p-1.5 rounded-md transition-colors duration-fast ${
              view === 'grid' ? 'bg-elevated text-secondary' : 'text-muted hover:text-secondary'
            }`}
            title = "Grid view"
          >
            <LayoutGrid size = {13} strokeWidth = {1.5} />
          </button>
          <button
            onClick = {() => setView('list')}
            className = {`p-1.5 rounded-md transition-colors duration-fast ${
              view === 'list' ? 'bg-elevated text-secondary' : 'text-muted hover:text-secondary'
            }`}
            title = "List view"
          >
            <List size = {13} strokeWidth = {1.5} />
          </button>
        </div>
      </PageHeader>

      <GuestPromptBanner />

      {/* tag bar + count */}
      {scenarios.length > 0 && (
        <div className = "flex items-center gap-3 mb-4 flex-wrap">
          <p className = "text-xs text-muted font-mono shrink-0">
            {filtered.length} of {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
            {moduleFilter !== 'all' ? ` in ${moduleFilter}` : ''}
            {query ? ` matching "${query}"` : ''}
          </p>

          {/* active tag filter */}
          {tagFilter && (
            <button
              onClick = {() => setTagFilter(null)}
              className = "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-brand-500/15 text-brand-400 border border-brand-500/20"
            >
              tag: {tagFilter}
              <X size = {10} strokeWidth = {2} />
            </button>
          )}

          {/* tag chips (only show when no tag is active) */}
          {!tagFilter && allTags.length > 0 && (
            <div className = "flex items-center gap-1.5 flex-wrap">
              {allTags.map((t) => (
                <button
                  key = {t}
                  onClick = {() => setTagFilter(t)}
                  className = "px-2 py-0.5 rounded text-[10px] font-medium bg-hover text-muted border border-hairline hover:border-brand-500/20 hover:text-brand-400 transition-colors duration-fast"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── main content ──────────────────────────────────── */}
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
              onClick = {() => { setQuery(''); setModuleFilter('all'); setTagFilter(null) }}
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
              scenarios = {grouped[mod]}
              view = {view}
              cardProps = {cardProps}
            />
          ) : null,
        )

      ) : view === 'grid' ? (
        <div className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => <ItemComponent key = {s.id} scenario = {s} {...cardProps} />)}
        </div>

      ) : (
        <div className = "flex flex-col gap-1.5">
          {filtered.map((s) => <ItemComponent key = {s.id} scenario = {s} {...cardProps} />)}
        </div>
      )}


      {/* ── modals ────────────────────────────────────────── */}
      <EditModal
        key = {editTarget?.id ?? ''}
        scenario = {editTarget}
        open = {!!editTarget}
        onClose = {() => setEditTarget(null)}
        onSave = {handleEditSave}
        allTags = {allTags}
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
