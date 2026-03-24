import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import BenchmarkChart, {
  CustomTooltip,
  transformSeries,
} from '../../../src/components/benchmark/BenchmarkChart'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ data, children }) => (
    <div data-testid="line-chart">
      <pre data-testid="line-chart-data">{JSON.stringify(data)}</pre>
      {children}
    </div>
  ),
  Line: ({ dataKey, name, stroke }) => (
    <div data-testid="chart-line" data-key={dataKey} data-stroke={stroke}>
      {name}
    </div>
  ),
  XAxis: ({ label }) => <div data-testid="x-axis">{label?.value}</div>,
  YAxis: ({ label }) => <div data-testid="y-axis">{label?.value}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }) => <div data-testid="tooltip">{content}</div>,
  Legend: () => <div data-testid="legend" />,
}))

const SERIES_DATA = [
  {
    algorithm_key: 'quicksort',
    points: [
      { size: 500, mean: 2.5 },
      { size: 100, mean: 0.5 },
    ],
  },
  {
    algorithm_key: 'mergesort',
    points: [
      { size: 100, mean: 0.8 },
      { size: 500, mean: 3.1 },
    ],
  },
]

describe('BenchmarkChart', () => {
  it('returns no rows for empty input series', () => {
    expect(transformSeries([])).toEqual({ rows: [], algoKeys: [] })
    const { container } = render(<BenchmarkChart seriesData={[]} label="Runtime" unit="ms" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('transforms algorithm series into size-sorted chart rows', () => {
    expect(transformSeries(SERIES_DATA)).toEqual({
      algoKeys: ['quicksort', 'mergesort'],
      rows: [
        { size: 100, quicksort: 0.5, mergesort: 0.8 },
        { size: 500, quicksort: 2.5, mergesort: 3.1 },
      ],
    })
  })

  it('renders chart axes and one line per algorithm with merged data', () => {
    render(<BenchmarkChart seriesData={SERIES_DATA} label="Runtime (ms)" unit="ms" />)

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('x-axis')).toHaveTextContent('Input Size')
    expect(screen.getByTestId('y-axis')).toHaveTextContent('Runtime (ms)')
    expect(screen.getAllByTestId('chart-line')).toHaveLength(2)
    expect(screen.getByText('quicksort')).toBeInTheDocument()
    expect(screen.getByText('mergesort')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart-data')).toHaveTextContent(
      JSON.stringify([
        { size: 100, quicksort: 0.5, mergesort: 0.8 },
        { size: 500, quicksort: 2.5, mergesort: 3.1 },
      ]),
    )
  })

  it('formats tooltip values and suppresses the tooltip when inactive', () => {
    const { container, rerender } = render(
      <CustomTooltip active={false} payload={[]} label={0} unit="ms" />,
    )

    expect(container).toBeEmptyDOMElement()

    rerender(
      <CustomTooltip
        active
        label={1000}
        unit="ms"
        payload={[
          { dataKey: 'quicksort', color: '#06b6d4', value: 1.2345 },
          { dataKey: 'mergesort', color: '#a78bfa', value: 2 },
        ]}
      />,
    )

    expect(screen.getByText('Size: 1,000')).toBeInTheDocument()
    expect(screen.getByText('quicksort')).toBeInTheDocument()
    expect(screen.getByText('1.234 ms')).toBeInTheDocument()
    expect(screen.getByText('2 ms')).toBeInTheDocument()
  })
})
