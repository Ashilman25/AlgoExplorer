const GRAPH_SUBCATEGORY_METRICS = {
  pathfinding: [
    { key: 'nodes_visited',  label: 'Nodes Visited',  polarity: 'lower' },
    { key: 'edges_explored', label: 'Edges Explored', polarity: 'lower' },
  ],
  mst: [
    { key: 'edges_added',      label: 'Edges Added',      polarity: 'lower' },
    { key: 'mst_total_weight', label: 'MST Total Weight', polarity: 'lower' },
  ],
  ordering: [],
}

const SORTING_SUBCATEGORY_METRICS = {
  sorting: [
    { key: 'comparisons',     label: 'Comparisons',         polarity: 'lower' },
    { key: 'swaps',           label: 'Swaps',               polarity: 'lower' },
  ],
  searching: [
    { key: 'comparisons',     label: 'Comparisons',         polarity: 'lower' },
    { key: 'array_accesses',  label: 'Array Accesses',      polarity: 'lower' },
  ],
}

const DOMAIN_METRICS = {
  dp: [
    { key: 'cells_computed',      label: 'Cells Computed',      polarity: 'lower' },
    { key: 'subproblems_avoided', label: 'Subproblems Avoided', polarity: 'higher' },
  ],
}

export function getDomainMetrics(moduleType, graphSubCategory, sortingSubCategory) {
  if (moduleType === 'graph') {
    return GRAPH_SUBCATEGORY_METRICS[graphSubCategory] ?? GRAPH_SUBCATEGORY_METRICS.pathfinding
  }
  if (moduleType === 'sorting') {
    return SORTING_SUBCATEGORY_METRICS[sortingSubCategory] ?? SORTING_SUBCATEGORY_METRICS.sorting
  }
  return DOMAIN_METRICS[moduleType] ?? []
}

export function computeDeltaMetrics(slots, stepIndex, moduleType, graphSubCategory, sortingSubCategory) {
  const metricDefs = getDomainMetrics(moduleType, graphSubCategory, sortingSubCategory)
  if (metricDefs.length === 0) return { metrics: [] }

  const readySlots = slots.filter((s) => s.status === 'ready')
  if (readySlots.length === 0) return { metrics: [] }

  const metrics = metricDefs.map((def) => {
    const values = {}
    for (const slot of readySlots) {
      const idx = Math.min(stepIndex, slot.timeline.length - 1)
      const step = slot.timeline[idx]
      const snapshot = step?.metrics_snapshot ?? step?.metricsSnapshot ?? {}
      values[slot.id] = snapshot[def.key] ?? null
    }

    const numericEntries = Object.entries(values).filter(
      ([, v]) => v != null && typeof v === 'number'
    )

    let best = null
    if (numericEntries.length > 0) {
      best = numericEntries.reduce((a, b) => {
        if (def.polarity === 'lower') return a[1] <= b[1] ? a : b
        return a[1] >= b[1] ? a : b
      })[0]
    }

    const deltas = {}
    for (const [slotId, value] of Object.entries(values)) {
      if (value == null || best == null || values[best] == null) {
        deltas[slotId] = null
      } else {
        deltas[slotId] = Math.abs(value - values[best])
      }
    }

    return { key: def.key, label: def.label, polarity: def.polarity, values, best, deltas }
  })

  return { metrics }
}

// ── Algorithm Name Formatting ──────────────────────────────────────────

const ALGO_LABELS = {
  bfs: 'BFS',
  dfs: 'DFS',
  dijkstra: "Dijkstra's",
  astar: 'A*',
  bellman_ford: 'Bellman-Ford',
  prims: "Prim's",
  kruskals: "Kruskal's",
  topological_sort: 'Topo Sort',
  quicksort: 'QuickSort',
  mergesort: 'MergeSort',
  bubble_sort: 'Bubble Sort',
  insertion_sort: 'Insertion Sort',
  selection_sort: 'Selection Sort',
  heap_sort: 'Heap Sort',
  binary_search: 'Binary Search',
  linear_search: 'Linear Search',
  lcs: 'LCS',
  edit_distance: 'Edit Distance',
}

export function fmtAlgorithmName(key) {
  return (
    ALGO_LABELS[key] ??
    key?.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ??
    'Unknown'
  )
}

// ── Divergence Detection ───────────────────────────────────────────────

export function findDivergences(slots) {
  const readySlots = slots.filter((s) => s.status === 'ready')
  if (readySlots.length < 2) return []

  const maxLen = Math.max(...readySlots.map((s) => s.timeline.length))
  const divergences = []

  for (let i = 0; i < maxLen; i++) {
    const events = {}
    const entitySets = {}

    for (const slot of readySlots) {
      if (i >= slot.timeline.length) continue
      const step = slot.timeline[i]
      events[slot.id] = step.event_type ?? step.eventType ?? null

      const entities = step.highlighted_entities ?? step.highlightedEntities ?? []
      entitySets[slot.id] = entities
        .map((e) => `${e.id}`)
        .sort()
        .join(',')
    }

    const activeIds = Object.keys(events)
    if (activeIds.length < 2) continue

    const uniqueEvents = new Set(Object.values(events))
    const uniqueEntities = new Set(Object.values(entitySets))

    if (uniqueEvents.size > 1 || uniqueEntities.size > 1) {
      const parts = activeIds.map((id) => {
        const slot = readySlots.find((s) => s.id === id)
        const alg = fmtAlgorithmName(slot.algorithmKey)
        const ents = (slot.timeline[i].highlighted_entities ?? slot.timeline[i].highlightedEntities ?? [])
          .map((e) => e.id)
          .join(', ')
        const detail = ents ? ` on ${ents}` : ''
        return `${alg}: ${events[id]}${detail}`
      })

      divergences.push({
        stepIndex: i,
        description: parts.join(' | '),
        slotIds: activeIds,
        eventTypes: events,
      })
    }
  }

  return divergences
}

// ── Commentary Generation ──────────────────────────────────────────────

export function generateCommentary(slots, deltaMetrics) {
  const readySlots = slots.filter((s) => s.status === 'ready')
  if (readySlots.length < 2 || !deltaMetrics?.metrics?.length) return ''

  const sentences = []

  for (const metric of deltaMetrics.metrics) {
    const { best, values, polarity } = metric
    if (!best) continue

    const bestSlot = readySlots.find((s) => s.id === best)
    if (!bestSlot) continue
    const bestAlg = fmtAlgorithmName(bestSlot.algorithmKey)
    const bestVal = values[best]

    const others = readySlots.filter((s) => s.id !== best && values[s.id] != null)
    if (others.length === 0) continue

    const worstSlot = others.reduce((a, b) => {
      const aVal = values[a.id] ?? 0
      const bVal = values[b.id] ?? 0
      return polarity === 'lower' ? (aVal >= bVal ? a : b) : (aVal <= bVal ? a : b)
    })
    const worstVal = values[worstSlot.id]
    const worstAlg = fmtAlgorithmName(worstSlot.algorithmKey)

    if (bestVal === worstVal) {
      sentences.push(
        `Both algorithms had equal ${metric.label.toLowerCase()} (${bestVal}).`
      )
    } else {
      const diff = Math.abs(worstVal - bestVal)
      const pct = worstVal !== 0 ? Math.round((diff / Math.abs(worstVal)) * 100) : 0
      const direction = polarity === 'lower' ? 'fewer' : 'more'
      sentences.push(
        `${bestAlg} had ${pct}% ${direction} ${metric.label.toLowerCase()} than ${worstAlg} (${bestVal} vs ${worstVal}).`
      )
    }
  }

  // Overall winner
  const wins = {}
  for (const slot of readySlots) wins[slot.id] = 0
  for (const metric of deltaMetrics.metrics) {
    if (metric.best) wins[metric.best] = (wins[metric.best] ?? 0) + 1
  }
  const [winnerId, winCount] = Object.entries(wins).sort((a, b) => b[1] - a[1])[0]
  if (winCount > deltaMetrics.metrics.length / 2) {
    const winnerAlg = fmtAlgorithmName(readySlots.find((s) => s.id === winnerId)?.algorithmKey)
    sentences.push(
      `Overall, ${winnerAlg} performed better on ${winCount} of ${deltaMetrics.metrics.length} metrics.`
    )
  }

  return sentences.join(' ')
}
