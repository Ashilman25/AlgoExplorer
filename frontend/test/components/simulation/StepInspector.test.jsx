import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import StepInspector from '../../../src/components/simulation/StepInspector'
import { useMetadataStore } from '../../../src/stores/useMetadataStore'
import { usePlaybackStore } from '../../../src/stores/usePlaybackStore'
import { useRunStore } from '../../../src/stores/useRunStore'

const DEFAULT_PLAYBACK_STATE = {
  steps: [],
  isLoading: false,
  error: null,
  stepIndex: 0,
  totalSteps: 0,
  isPlaying: false,
  speed: 1,
  isScrubbing: false,
  currentStep: null,
}

const DEFAULT_RUN_STATE = {
  runId: null,
  summary: null,
  isLoading: false,
  error: null,
}

const MOCK_LEARNING_INFO = {
  complexity: {
    time: { best: 'O(V + E)', average: 'O(V + E)', worst: 'O(V + E)' },
    space: 'O(V)',
  },
  properties: ['complete', 'optimal-unweighted'],
  insights: ['Guarantees shortest path in unweighted graphs'],
  use_cases: {
    use_when: ['Finding shortest path in unweighted graphs'],
    avoid_when: ['Graph is weighted'],
  },
  scenarios: {
    best_case: 'Target is adjacent to source',
    worst_case: 'Target is the last node explored',
  },
}

const DEFAULT_METADATA_STATE = {
  modules: [],
  algorithms: {},
  presets: {},
  isLoading: false,
  error: null,
}

function resetStores() {
  usePlaybackStore.setState(DEFAULT_PLAYBACK_STATE)
  useRunStore.setState(DEFAULT_RUN_STATE)
  useMetadataStore.setState(DEFAULT_METADATA_STATE)
}

describe('StepInspector', () => {
  beforeEach(() => {
    resetStores()
  })

  it('renders loading skeletons while timeline data is being fetched', () => {
    usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, isLoading: true })

    const { container } = render(<StepInspector />)

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4)
    expect(
      screen.queryByText(/step details, changed entities, and explanations will appear here/i),
    ).not.toBeInTheDocument()
  })

  it('renders the empty state and default metrics when no timeline exists', () => {
    render(<StepInspector />)

    expect(
      screen.getByText(/step details, changed entities, and explanations will appear here/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Steps total')).toBeInTheDocument()
    expect(screen.getByText('Current step')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the active step details, entities, and summary metrics', () => {
    usePlaybackStore.setState({
      ...DEFAULT_PLAYBACK_STATE,
      steps: [{}, {}],
      totalSteps: 2,
      stepIndex: 1,
      currentStep: {
        eventType: 'RELAX',
        explanation: { text: 'Relaxed the frontier edge.' },
        highlightedEntities: [
          { id: 'A', state: 'active' },
          { label: 'Node B', state: 'frontier' },
        ],
        metricsSnapshot: {
          frontier_size: 2,
          path_cost: 5,
        },
      },
    })
    useRunStore.setState({
      ...DEFAULT_RUN_STATE,
      runId: 42,
      summary: {
        algorithm_key: 'dijkstra',
        module_type: 'graph',
        summary: {
          nodes_visited: 5,
          path_cost: 5,
        },
      },
    })

    render(<StepInspector />)

    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('RELAX')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getByText("Dijkstra's")).toBeInTheDocument()
    expect(screen.getByText('Explanation')).toBeInTheDocument()
    expect(screen.getByText('Relaxed the frontier edge.')).toBeInTheDocument()
    expect(screen.getByText('Changed Entities')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Node B')).toBeInTheDocument()
    expect(screen.getByText('Step Snapshot')).toBeInTheDocument()
    expect(screen.getByText('frontier size')).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('nodes visited')).toBeInTheDocument()
    expect(screen.getAllByText('path cost')).toHaveLength(2)
  })

  it('prefers explicit metrics props over the run summary footer metrics', () => {
    usePlaybackStore.setState({
      ...DEFAULT_PLAYBACK_STATE,
      steps: [{ step_index: 0 }],
      totalSteps: 1,
      currentStep: {
        event_type: 'COMPARE',
        explanation: 'Compared two indices.',
        highlighted_entities: [],
        metrics_snapshot: {},
      },
    })
    useRunStore.setState({
      ...DEFAULT_RUN_STATE,
      summary: {
        algorithm_key: 'quicksort',
        module_type: 'sorting',
        summary: {
          comparisons: 99,
        },
      },
    })

    render(<StepInspector metrics={[{ label: 'Custom Metric', value: '12' }]} />)

    expect(screen.getByText('Custom Metric')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.queryByText('comparisons')).not.toBeInTheDocument()
  })

  it('renders Algorithm Info section when learning_info is available', () => {
    useMetadataStore.setState({
      ...DEFAULT_METADATA_STATE,
      algorithms: {
        graph: [{ key: 'bfs', learning_info: MOCK_LEARNING_INFO }],
      },
    })

    render(<StepInspector moduleKey = "graph" algorithmKey = "bfs" />)

    expect(screen.getByText('Algorithm Info')).toBeInTheDocument()
    expect(screen.getAllByText('O(V + E)').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('complete')).toBeInTheDocument()
    expect(screen.getByText('Guarantees shortest path in unweighted graphs')).toBeInTheDocument()
  })

  it('does not render Algorithm Info when no learning_info is available', () => {
    render(<StepInspector />)

    expect(screen.queryByText('Algorithm Info')).not.toBeInTheDocument()
  })

  it('expands Algorithm Info by default when no timeline is active', () => {
    useMetadataStore.setState({
      ...DEFAULT_METADATA_STATE,
      algorithms: {
        graph: [{ key: 'bfs', learning_info: MOCK_LEARNING_INFO }],
      },
    })

    render(<StepInspector moduleKey = "graph" algorithmKey = "bfs" />)

    expect(screen.getByText('Complexity')).toBeInTheDocument()
    expect(screen.getByText('BEST')).toBeInTheDocument()
    expect(screen.getByText('WORST')).toBeInTheDocument()
  })
})
