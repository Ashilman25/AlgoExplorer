import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../utils/cn'

const CATEGORY_ORDER = ['pathfinding', 'mst', 'ordering']
const CATEGORY_LABELS = {
  pathfinding: 'Pathfinding',
  mst: 'Minimum Spanning Tree',
  ordering: 'Ordering',
}

const ALGO_DISPLAY = {
  bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra', astar: 'A*',
  bellman_ford: 'B-Ford', prims: "Prim's", kruskals: "Kruskal's",
  topological_sort: 'Topo Sort',
}

export default function PresetSelect({
  presets, value, onChange, algorithm, categoryMap, onAlgorithmSwitch,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const [focusIndex, setFocusIndex] = useState(-1)

  // Group presets by category
  const grouped = useMemo(() => {
    const groups = {}
    for (const preset of presets) {
      const cat = categoryMap[preset.designed_for[0]] ?? 'pathfinding'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(preset)
    }
    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: groups[cat] }))
  }, [presets, categoryMap])

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  const selectedPreset = presets.find((p) => p.key === value)

  const isMatch = useCallback(
    (preset) => preset.designed_for.includes(algorithm),
    [algorithm],
  )

  // Click-outside close
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  // Reset focus index when opening
  useEffect(() => {
    if (open) setFocusIndex(-1)
  }, [open])

  function handleSelect(preset) {
    setOpen(false)
    if (!isMatch(preset)) {
      onAlgorithmSwitch(preset.designed_for[0])
    }
    onChange(preset.key)
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusIndex >= 0 && focusIndex < flatItems.length) {
          handleSelect(flatItems[focusIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusIndex < 0) return
    const list = listRef.current
    if (!list) return
    const items = list.querySelectorAll('[data-preset-item]')
    items[focusIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusIndex, open])

  let itemIndex = -1

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="button"
        aria-label="Preset"
        aria-expanded={open}
        className={cn(
          'w-full appearance-none cursor-pointer',
          'bg-base border',
          open ? 'border-brand-500 ring-1 ring-brand-500/40' : 'border-default',
          'rounded-lg px-3 py-2',
          'text-sm text-left',
          'transition-colors duration-fast outline-none',
          'flex items-center gap-2',
        )}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className={cn('flex-1 truncate', selectedPreset ? 'text-secondary' : 'text-faint')}>
          {selectedPreset ? selectedPreset.label : 'Select a preset\u2026'}
        </span>

        {selectedPreset && (
          <span className="flex gap-1 flex-shrink-0 overflow-hidden">
            {selectedPreset.designed_for.map((algo) => (
              <span
                key={algo}
                className={cn(
                  'font-mono text-[9.5px] font-medium px-1.5 py-0.5 rounded',
                  algo === algorithm
                    ? 'bg-cyan-500/18 text-cyan-400'
                    : 'bg-slate-500/10 text-slate-500',
                )}
              >
                {ALGO_DISPLAY[algo] ?? algo}
              </span>
            ))}
          </span>
        )}

        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={cn(
            'text-muted flex-shrink-0 transition-transform duration-fast',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full',
            'bg-surface border border-default rounded-lg',
            'shadow-lg shadow-black/40',
            'overflow-hidden',
          )}
        >
          <div ref={listRef} className="max-h-[340px] overflow-y-auto py-1">
            {grouped.map((group) => (
              <div key={group.category}>
                <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                    {group.label}
                  </span>
                  <span className="flex-1 h-px bg-hairline" />
                </div>

                {group.items.map((preset) => {
                  itemIndex++
                  const match = isMatch(preset)
                  const selected = preset.key === value
                  const focused = itemIndex === focusIndex

                  return (
                    <PresetItem
                      key={preset.key}
                      preset={preset}
                      match={match}
                      selected={selected}
                      focused={focused}
                      algorithm={algorithm}
                      onClick={() => handleSelect(preset)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PresetItem({ preset, match, selected, focused, algorithm, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      data-preset-item
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors duration-fast',
        'border-l-2',
        match ? 'border-l-cyan-500' : 'border-l-transparent',
        match ? (selected ? 'bg-cyan-500/10' : 'hover:bg-cyan-500/8') : 'hover:bg-elevated',
        !match && 'opacity-45 hover:opacity-70',
        focused && (match ? 'bg-cyan-500/8' : 'bg-elevated opacity-70'),
      )}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className={cn('text-[13px] flex-1 truncate', match ? 'text-primary' : 'text-muted')}>
        {preset.label}
      </span>

      {!match && hovered ? (
        <span className="text-[10px] text-faint italic whitespace-nowrap">
          → switches to {ALGO_DISPLAY[preset.designed_for[0]] ?? preset.designed_for[0]}
        </span>
      ) : (
        <span className="flex gap-1 flex-wrap justify-end">
          {preset.designed_for.map((algo) => (
            <span
              key={algo}
              className={cn(
                'font-mono text-[9.5px] font-medium px-1.5 py-0.5 rounded',
                algo === algorithm
                  ? 'bg-cyan-500/18 text-cyan-400'
                  : 'bg-slate-500/10 text-slate-500',
              )}
            >
              {ALGO_DISPLAY[algo] ?? algo}
            </span>
          ))}
        </span>
      )}

      {selected && (
        <Check size={14} className="text-cyan-400 flex-shrink-0" />
      )}
    </div>
  )
}
