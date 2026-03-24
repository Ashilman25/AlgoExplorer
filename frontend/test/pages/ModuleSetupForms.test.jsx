import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DpConfig } from '../../src/pages/DpLabPage'
import { GraphConfig } from '../../src/pages/GraphLabPage'
import { SortingConfig } from '../../src/pages/SortingLabPage'

function createHandlers() {
  return {
    onAlgorithmChange: vi.fn(),
    onPresetChange: vi.fn(),
    onSourceChange: vi.fn(),
    onTargetChange: vi.fn(),
    onWeightedChange: vi.fn(),
    onDirectedChange: vi.fn(),
    onExplanationLevelChange: vi.fn(),
    onModeChange: vi.fn(),
    onRun: vi.fn(),
    onReset: vi.fn(),
    onSave: vi.fn(),
    onSizeChange: vi.fn(),
    onDuplicateDensityChange: vi.fn(),
    onManualInputChange: vi.fn(),
    onGenerate: vi.fn(),
    onShuffle: vi.fn(),
    onString1Change: vi.fn(),
    onString2Change: vi.fn(),
  }
}

describe('module setup forms', () => {
  it('renders the graph setup form, summaries, and dispatches configuration changes', () => {
    const handlers = createHandlers()

    render(
      <GraphConfig
        algorithm="bfs"
        onAlgorithmChange={handlers.onAlgorithmChange}
        preset="bfs-demo"
        onPresetChange={handlers.onPresetChange}
        source="A"
        onSourceChange={handlers.onSourceChange}
        target="F"
        onTargetChange={handlers.onTargetChange}
        weighted={false}
        onWeightedChange={handlers.onWeightedChange}
        directed={true}
        onDirectedChange={handlers.onDirectedChange}
        explanationLevel="standard"
        onExplanationLevelChange={handlers.onExplanationLevelChange}
        mode="graph"
        onModeChange={handlers.onModeChange}
        nodeOptions={[
          { value: 'A', label: 'A' },
          { value: 'F', label: 'F' },
        ]}
        edgeCount={7}
        onRun={handlers.onRun}
        onReset={handlers.onReset}
        onSave={handlers.onSave}
        isRunning={false}
        error={null}
      />,
    )

    expect(screen.getByText('Graph Lab')).toBeInTheDocument()
    expect(screen.getByText('2 nodes · 7 edges · directed')).toBeInTheDocument()
    expect(screen.getByText(/source:/i)).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm' }), {
      target: { value: 'dijkstra' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Preset' }), {
      target: { value: 'weighted-diamond' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Source' }), {
      target: { value: 'F' },
    })
    fireEvent.click(screen.getByLabelText('Weighted edges'))
    fireEvent.click(screen.getByLabelText('Directed graph'))
    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }))

    expect(handlers.onAlgorithmChange).toHaveBeenCalledTimes(1)
    expect(handlers.onPresetChange).toHaveBeenCalledTimes(1)
    expect(handlers.onSourceChange).toHaveBeenCalledTimes(1)
    expect(handlers.onWeightedChange).toHaveBeenCalledTimes(1)
    expect(handlers.onDirectedChange).toHaveBeenCalledTimes(1)
    expect(handlers.onRun).toHaveBeenCalledTimes(1)
  })

  it('renders graph errors and disables actions while a simulation is already running', () => {
    const handlers = createHandlers()

    render(
      <GraphConfig
        algorithm="bfs"
        onAlgorithmChange={handlers.onAlgorithmChange}
        preset="custom"
        onPresetChange={handlers.onPresetChange}
        source="A"
        onSourceChange={handlers.onSourceChange}
        target="B"
        onTargetChange={handlers.onTargetChange}
        weighted
        onWeightedChange={handlers.onWeightedChange}
        directed={false}
        onDirectedChange={handlers.onDirectedChange}
        explanationLevel="detailed"
        onExplanationLevelChange={handlers.onExplanationLevelChange}
        mode="graph"
        onModeChange={handlers.onModeChange}
        nodeOptions={[
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
        ]}
        edgeCount={1}
        onRun={handlers.onRun}
        onReset={handlers.onReset}
        onSave={handlers.onSave}
        isRunning
        error="Graph input is invalid."
      />,
    )

    expect(screen.getByText('Graph input is invalid.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Running…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  })

  it('renders sorting controls for generated presets and dispatches form changes', () => {
    const handlers = createHandlers()

    render(
      <SortingConfig
        algorithm="quicksort"
        onAlgorithmChange={handlers.onAlgorithmChange}
        preset="random"
        onPresetChange={handlers.onPresetChange}
        size={20}
        onSizeChange={handlers.onSizeChange}
        duplicateDensity="low"
        onDuplicateDensityChange={handlers.onDuplicateDensityChange}
        explanationLevel="standard"
        onExplanationLevelChange={handlers.onExplanationLevelChange}
        manualInput=""
        onManualInputChange={handlers.onManualInputChange}
        inputError={null}
        array={[4, 1, 3, 2]}
        onGenerate={handlers.onGenerate}
        onShuffle={handlers.onShuffle}
        onRun={handlers.onRun}
        onReset={handlers.onReset}
        onSave={handlers.onSave}
        isRunning={false}
        error={null}
      />,
    )

    expect(screen.getByRole('slider', { name: 'Size' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Shuffle' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Manual Input' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm' }), {
      target: { value: 'mergesort' },
    })
    fireEvent.change(screen.getByRole('slider', { name: 'Size' }), {
      target: { value: '35' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))

    expect(handlers.onAlgorithmChange).toHaveBeenCalledTimes(1)
    expect(handlers.onSizeChange).toHaveBeenCalledWith(35)
    expect(handlers.onGenerate).toHaveBeenCalledTimes(1)
    expect(handlers.onShuffle).toHaveBeenCalledTimes(1)
  })

  it('renders sorting manual input errors and disables invalid run actions', () => {
    const handlers = createHandlers()

    render(
      <SortingConfig
        algorithm="quicksort"
        onAlgorithmChange={handlers.onAlgorithmChange}
        preset="custom"
        onPresetChange={handlers.onPresetChange}
        size={10}
        onSizeChange={handlers.onSizeChange}
        duplicateDensity="none"
        onDuplicateDensityChange={handlers.onDuplicateDensityChange}
        explanationLevel="none"
        onExplanationLevelChange={handlers.onExplanationLevelChange}
        manualInput="oops"
        onManualInputChange={handlers.onManualInputChange}
        inputError={'"oops" is not a valid number'}
        array={[1]}
        onGenerate={handlers.onGenerate}
        onShuffle={handlers.onShuffle}
        onRun={handlers.onRun}
        onReset={handlers.onReset}
        onSave={handlers.onSave}
        isRunning={false}
        error="Backend rejected the run."
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Manual Input' })).toBeInTheDocument()
    expect(screen.getByText('"oops" is not a valid number')).toBeInTheDocument()
    expect(screen.getByText('Backend rejected the run.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Generate' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Manual Input' }), {
      target: { value: '1, 2, 3' },
    })
    expect(handlers.onManualInputChange).toHaveBeenCalledTimes(1)
  })

  it('renders the DP setup form, summaries, and dispatches string and preset changes', () => {
    const handlers = createHandlers()

    render(
      <DpConfig
        algorithm="lcs"
        onAlgorithmChange={handlers.onAlgorithmChange}
        preset="short_match"
        onPresetChange={handlers.onPresetChange}
        string1="ABCDEF"
        onString1Change={handlers.onString1Change}
        string2="ACBDFE"
        onString2Change={handlers.onString2Change}
        explanationLevel="standard"
        onExplanationLevelChange={handlers.onExplanationLevelChange}
        inputError={null}
        onRun={handlers.onRun}
        onReset={handlers.onReset}
        onSave={handlers.onSave}
        isRunning={false}
        error={null}
      />,
    )

    expect(screen.getByText('|A| = 6, |B| = 6 · table 7 × 7 (49 cells)')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm' }), {
      target: { value: 'edit_distance' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Preset' }), {
      target: { value: 'medium' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'String A' }), {
      target: { value: 'HELLO' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'String B' }), {
      target: { value: 'WORLD' },
    })

    expect(handlers.onAlgorithmChange).toHaveBeenCalledTimes(1)
    expect(handlers.onPresetChange).toHaveBeenCalledTimes(1)
    expect(handlers.onString1Change).toHaveBeenCalledTimes(1)
    expect(handlers.onString2Change).toHaveBeenCalledTimes(1)
  })

  it('renders DP validation and backend errors and blocks invalid run actions', () => {
    const handlers = createHandlers()

    render(
      <DpConfig
        algorithm="edit_distance"
        onAlgorithmChange={handlers.onAlgorithmChange}
        preset="custom"
        onPresetChange={handlers.onPresetChange}
        string1=""
        onString1Change={handlers.onString1Change}
        string2=""
        onString2Change={handlers.onString2Change}
        explanationLevel="none"
        onExplanationLevelChange={handlers.onExplanationLevelChange}
        inputError="At least one string must be non-empty"
        onRun={handlers.onRun}
        onReset={handlers.onReset}
        onSave={handlers.onSave}
        isRunning={false}
        error="Server validation failed."
      />,
    )

    expect(screen.getByText('At least one string must be non-empty')).toBeInTheDocument()
    expect(screen.getByText('Server validation failed.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run Simulation' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save Scenario' })).toBeDisabled()
  })
})
