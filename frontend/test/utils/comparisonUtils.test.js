import { describe, expect, it } from 'vitest'
import {
  getDomainMetrics,
  computeDeltaMetrics,
  findDivergences,
  generateCommentary,
  fmtAlgorithmName,
} from '../../src/utils/comparisonUtils'

const GRAPH_SLOT_A = {
  id: 'slot-0',
  algorithmKey: 'bfs',
  status: 'ready',
  timeline: [
    { step_index: 0, event_type: 'INITIALIZE', metrics_snapshot: { nodes_visited: 0, path_cost: 0 } },
    { step_index: 1, event_type: 'VISIT_NODE', metrics_snapshot: { nodes_visited: 3, path_cost: 0 } },
    { step_index: 2, event_type: 'COMPLETE',   metrics_snapshot: { nodes_visited: 8, path_cost: 5 } },
  ],
}

const GRAPH_SLOT_B = {
  id: 'slot-1',
  algorithmKey: 'dijkstra',
  status: 'ready',
  timeline: [
    { step_index: 0, event_type: 'INITIALIZE', metrics_snapshot: { nodes_visited: 0, path_cost: 0 } },
    { step_index: 1, event_type: 'VISIT_NODE', metrics_snapshot: { nodes_visited: 2, path_cost: 0 } },
    { step_index: 2, event_type: 'COMPLETE',   metrics_snapshot: { nodes_visited: 5, path_cost: 4 } },
    { step_index: 3, event_type: 'COMPLETE',   metrics_snapshot: { nodes_visited: 5, path_cost: 4 } },
  ],
}

describe('getDomainMetrics', () => {
  it('returns metric definitions for graph domain', () => {
    const metrics = getDomainMetrics('graph')
    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics[0]).toHaveProperty('key')
    expect(metrics[0]).toHaveProperty('label')
    expect(metrics[0]).toHaveProperty('polarity')
  })

  it('returns metric definitions for sorting domain', () => {
    const metrics = getDomainMetrics('sorting')
    expect(metrics.some(m => m.key === 'comparisons')).toBe(true)
    expect(metrics.some(m => m.key === 'swaps')).toBe(true)
  })

  it('returns metric definitions for dp domain', () => {
    const metrics = getDomainMetrics('dp')
    expect(metrics.some(m => m.key === 'cells_computed')).toBe(true)
  })

  it('returns empty array for unknown domain', () => {
    expect(getDomainMetrics('unknown')).toEqual([])
  })
})

describe('computeDeltaMetrics', () => {
  it('computes deltas between two graph slots at a given step', () => {
    const result = computeDeltaMetrics([GRAPH_SLOT_A, GRAPH_SLOT_B], 2, 'graph')

    const nodesMetric = result.metrics.find(m => m.key === 'nodes_visited')
    expect(nodesMetric).toBeDefined()
    expect(nodesMetric.values['slot-0']).toBe(8)
    expect(nodesMetric.values['slot-1']).toBe(5)
    expect(nodesMetric.best).toBe('slot-1')
    expect(nodesMetric.deltas['slot-0']).toBe(3)
    expect(nodesMetric.deltas['slot-1']).toBe(0)
  })

  it('uses final step when stepIndex exceeds a slot timeline length', () => {
    const result = computeDeltaMetrics([GRAPH_SLOT_A, GRAPH_SLOT_B], 3, 'graph')

    const nodesMetric = result.metrics.find(m => m.key === 'nodes_visited')
    expect(nodesMetric.values['slot-0']).toBe(8)
    expect(nodesMetric.values['slot-1']).toBe(5)
  })

  it('returns empty metrics for no ready slots', () => {
    const idle = [{ ...GRAPH_SLOT_A, status: 'idle' }]
    const result = computeDeltaMetrics(idle, 0, 'graph')
    expect(result.metrics).toEqual([])
  })

  it('handles higher-is-better polarity', () => {
    const dpSlotA = {
      id: 'slot-0', algorithmKey: 'lcs', status: 'ready',
      timeline: [{ step_index: 0, metrics_snapshot: { cells_computed: 20, subproblems_avoided: 5 } }],
    }
    const dpSlotB = {
      id: 'slot-1', algorithmKey: 'edit_distance', status: 'ready',
      timeline: [{ step_index: 0, metrics_snapshot: { cells_computed: 15, subproblems_avoided: 10 } }],
    }

    const result = computeDeltaMetrics([dpSlotA, dpSlotB], 0, 'dp')
    const avoided = result.metrics.find(m => m.key === 'subproblems_avoided')
    expect(avoided.best).toBe('slot-1')
  })

  it('handles equal values — best is first slot with that value', () => {
    const slotA = {
      id: 'slot-0', algorithmKey: 'bfs', status: 'ready',
      timeline: [{ step_index: 0, metrics_snapshot: { nodes_visited: 5, path_cost: 3 } }],
    }
    const slotB = {
      id: 'slot-1', algorithmKey: 'dijkstra', status: 'ready',
      timeline: [{ step_index: 0, metrics_snapshot: { nodes_visited: 5, path_cost: 3 } }],
    }

    const result = computeDeltaMetrics([slotA, slotB], 0, 'graph')
    const nodesMetric = result.metrics.find(m => m.key === 'nodes_visited')
    expect(nodesMetric.deltas['slot-0']).toBe(0)
    expect(nodesMetric.deltas['slot-1']).toBe(0)
  })
})

// ── Divergence fixtures ────────────────────────────────────────────────

const DIVERGENT_SLOT_A = {
  id: 'slot-0',
  algorithmKey: 'bfs',
  status: 'ready',
  timeline: [
    { step_index: 0, event_type: 'INITIALIZE', highlighted_entities: [] },
    { step_index: 1, event_type: 'VISIT_NODE', highlighted_entities: [{ id: 'D', state: 'active' }] },
    { step_index: 2, event_type: 'COMPLETE',   highlighted_entities: [] },
  ],
}

const DIVERGENT_SLOT_B = {
  id: 'slot-1',
  algorithmKey: 'dijkstra',
  status: 'ready',
  timeline: [
    { step_index: 0, event_type: 'INITIALIZE', highlighted_entities: [] },
    { step_index: 1, event_type: 'VISIT_NODE', highlighted_entities: [{ id: 'F', state: 'active' }] },
    { step_index: 2, event_type: 'RELAX_EDGE', highlighted_entities: [{ id: 'F-G', state: 'active' }] },
    { step_index: 3, event_type: 'COMPLETE',   highlighted_entities: [] },
  ],
}

describe('findDivergences', () => {
  it('detects entity divergence at step 1', () => {
    const divs = findDivergences([DIVERGENT_SLOT_A, DIVERGENT_SLOT_B])
    const step1 = divs.find((d) => d.stepIndex === 1)
    expect(step1).toBeDefined()
    expect(step1.slotIds).toContain('slot-0')
    expect(step1.slotIds).toContain('slot-1')
    expect(step1.description).toBeTruthy()
  })

  it('detects event type divergence', () => {
    const divs = findDivergences([DIVERGENT_SLOT_A, DIVERGENT_SLOT_B])
    const step2 = divs.find((d) => d.stepIndex === 2)
    expect(step2).toBeDefined()
    expect(step2.eventTypes['slot-0']).toBe('COMPLETE')
    expect(step2.eventTypes['slot-1']).toBe('RELAX_EDGE')
  })

  it('does not flag identical steps as divergences', () => {
    const divs = findDivergences([DIVERGENT_SLOT_A, DIVERGENT_SLOT_B])
    const step0 = divs.find((d) => d.stepIndex === 0)
    expect(step0).toBeUndefined()
  })

  it('returns empty array for fewer than 2 ready slots', () => {
    expect(findDivergences([DIVERGENT_SLOT_A])).toEqual([])
    expect(findDivergences([])).toEqual([])
  })
})

describe('generateCommentary', () => {
  it('generates a non-empty summary when slots have different metrics', () => {
    const slots = [GRAPH_SLOT_A, GRAPH_SLOT_B]
    const delta = computeDeltaMetrics(slots, 2, 'graph')
    const summary = generateCommentary(slots, delta)
    expect(typeof summary).toBe('string')
    expect(summary.length).toBeGreaterThan(0)
    expect(summary).toContain('BFS')
    expect(summary).toContain("Dijkstra's")
  })

  it('handles equal metrics gracefully', () => {
    const slotA = {
      id: 'slot-0', algorithmKey: 'bfs', status: 'ready',
      timeline: [{ step_index: 0, metrics_snapshot: { nodes_visited: 5, path_cost: 3 } }],
    }
    const slotB = {
      id: 'slot-1', algorithmKey: 'dijkstra', status: 'ready',
      timeline: [{ step_index: 0, metrics_snapshot: { nodes_visited: 5, path_cost: 3 } }],
    }
    const delta = computeDeltaMetrics([slotA, slotB], 0, 'graph')
    const summary = generateCommentary([slotA, slotB], delta)
    expect(summary).toContain('equal')
  })

  it('returns empty string for no ready slots', () => {
    expect(generateCommentary([], { metrics: [] })).toBe('')
  })
})

describe('fmtAlgorithmName', () => {
  it('maps known algorithm keys to labels', () => {
    expect(fmtAlgorithmName('bfs')).toBe('BFS')
    expect(fmtAlgorithmName('dijkstra')).toBe("Dijkstra's")
    expect(fmtAlgorithmName('quicksort')).toBe('QuickSort')
    expect(fmtAlgorithmName('mergesort')).toBe('MergeSort')
  })

  it('title-cases unknown keys', () => {
    expect(fmtAlgorithmName('a_star')).toBe('A Star')
  })
})
