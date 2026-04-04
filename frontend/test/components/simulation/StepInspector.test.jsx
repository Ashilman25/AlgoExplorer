import { render, screen, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'

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

  describe('idle mode (no playback)', () => {
    it('renders loading skeletons while timeline data is being fetched', () => {
      usePlaybackStore.setState({ ...DEFAULT_PLAYBACK_STATE, isLoading: true })

      const { container } = render(<StepInspector />)

      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4)
    })

    it('shows "Step Inspector" header when no timeline exists', () => {
      render(<StepInspector />)

      expect(screen.getByText('Step Inspector')).toBeInTheDocument()
    })

    it('renders Algorithm Info content directly when learning_info is available', () => {
      useMetadataStore.setState({
        ...DEFAULT_METADATA_STATE,
        algorithms: {
          graph: [{ key: 'bfs', learning_info: MOCK_LEARNING_INFO }],
        },
      })

      render(<StepInspector moduleKey = "graph" algorithmKey = "bfs" />)

      expect(screen.getByText('Complexity')).toBeInTheDocument()
      expect(screen.getAllByText('O(V + E)').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('complete')).toBeInTheDocument()
      expect(screen.getByText('Guarantees shortest path in unweighted graphs')).toBeInTheDocument()
      expect(screen.getByText('BEST')).toBeInTheDocument()
      expect(screen.getByText('WORST')).toBeInTheDocument()
    })

    it('renders the empty state message when no timeline exists', () => {
      render(<StepInspector />)

      expect(
        screen.getByText(/run a simulation to see step-by-step details here/i),
      ).toBeInTheDocument()
    })

    it('renders footer metrics with placeholder dashes when no timeline exists', () => {
      render(<StepInspector />)

      expect(screen.getByText('Steps total')).toBeInTheDocument()
      expect(screen.getByText('Current step')).toBeInTheDocument()
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
    })

    it('does not render Algorithm Info when no learning_info is available', () => {
      render(<StepInspector />)

      expect(screen.queryByText('Complexity')).not.toBeInTheDocument()
    })
  })

  describe('playback mode', () => {
    const PLAYBACK_STEP = {
      event_type: 'RELAX',
      explanation: { text: 'Relaxed the frontier edge.' },
      highlighted_entities: [
        { id: 'A', state: 'active' },
        { label: 'Node B', state: 'frontier' },
      ],
      metrics_snapshot: {
        frontier_size: 2,
        path_cost: 5,
      },
    }

    function enterPlayback() {
      usePlaybackStore.setState({
        ...DEFAULT_PLAYBACK_STATE,
        steps: [{}, {}],
        totalSteps: 2,
        stepIndex: 1,
        currentStep: PLAYBACK_STEP,
      })
      useRunStore.setState({
        ...DEFAULT_RUN_STATE,
        runId: 42,
        summary: {
          algorithm_key: 'dijkstra',
          module_type: 'graph',
          summary: { nodes_visited: 5, path_cost: 5 },
        },
      })
    }

    it('shows event badge and step counter in the header', () => {
      enterPlayback()
      render(<StepInspector />)

      expect(screen.getByText('RELAX')).toBeInTheDocument()
      expect(screen.getByText('#2 of 2')).toBeInTheDocument()
      expect(screen.getByText('#42')).toBeInTheDocument()
    })

    it('renders explanation text in the step detail body', () => {
      enterPlayback()
      render(<StepInspector />)

      expect(screen.getByText('Explanation')).toBeInTheDocument()
      expect(screen.getByText('Relaxed the frontier edge.')).toBeInTheDocument()
    })

    it('renders entity pills with correct labels', () => {
      enterPlayback()
      render(<StepInspector />)

      expect(screen.getByText('Entities')).toBeInTheDocument()
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('Node B')).toBeInTheDocument()
    })

    it('renders snapshot metrics in a 2-column grid', () => {
      enterPlayback()
      render(<StepInspector />)

      expect(screen.getByText('Snapshot')).toBeInTheDocument()
      expect(screen.getByText('frontier size')).toBeInTheDocument()
      expect(screen.getByText('path cost')).toBeInTheDocument()
    })

    it('shows collapsed Info & Metrics drawer', () => {
      enterPlayback()
      render(<StepInspector />)

      expect(screen.getByText('Info & Metrics')).toBeInTheDocument()
      expect(screen.getByText(/Dijkstra/)).toBeInTheDocument()
    })

    it('does not show "Step Inspector" header during playback', () => {
      enterPlayback()
      render(<StepInspector />)

      expect(screen.queryByText('Step Inspector')).not.toBeInTheDocument()
    })

    it('prefers explicit metrics props for drawer metrics', async () => {
      enterPlayback()
      render(<StepInspector metrics = {[{ label: 'Custom Metric', value: '12' }]} />)

      const drawerToggle = screen.getByText('Info & Metrics')
      await act(async () => { drawerToggle.closest('button').click() })

      expect(screen.getByText('Custom Metric')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
    })

    describe('drawer interaction', () => {
      it('expands drawer on click to show algorithm info and run metrics', async () => {
        const user = userEvent.setup()

        enterPlayback()
        useMetadataStore.setState({
          ...DEFAULT_METADATA_STATE,
          algorithms: {
            graph: [{ key: 'dijkstra', learning_info: MOCK_LEARNING_INFO }],
          },
        })

        render(<StepInspector moduleKey = "graph" algorithmKey = "dijkstra" />)

        expect(screen.queryByText('Run Metrics')).not.toBeInTheDocument()

        const toggle = screen.getByText('Info & Metrics').closest('button')
        await user.click(toggle)

        expect(screen.getByText('Run Metrics')).toBeInTheDocument()
        expect(screen.getAllByText('O(V + E)').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('complete')).toBeInTheDocument()
      })

      it('collapses drawer on second click', async () => {
        const user = userEvent.setup()

        enterPlayback()
        useMetadataStore.setState({
          ...DEFAULT_METADATA_STATE,
          algorithms: {
            graph: [{ key: 'dijkstra', learning_info: MOCK_LEARNING_INFO }],
          },
        })

        render(<StepInspector moduleKey = "graph" algorithmKey = "dijkstra" />)

        const toggle = screen.getByText('Info & Metrics').closest('button')

        await user.click(toggle)
        expect(screen.getByText('Run Metrics')).toBeInTheDocument()

        await user.click(toggle)
        expect(screen.queryByText('Run Metrics')).not.toBeInTheDocument()
      })

      it('shows drawer hint with algorithm name and complexity', () => {
        enterPlayback()
        useMetadataStore.setState({
          ...DEFAULT_METADATA_STATE,
          algorithms: {
            graph: [{ key: 'dijkstra', learning_info: MOCK_LEARNING_INFO }],
          },
        })

        render(<StepInspector moduleKey = "graph" algorithmKey = "dijkstra" />)

        expect(screen.getByText("Dijkstra's · O(V + E)")).toBeInTheDocument()
      })
    })
  })
})
