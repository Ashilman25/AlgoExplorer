import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

const ALGO_COLORS = [
  '#06b6d4', // cyan-500
  '#a78bfa', // violet-400
  '#f59e0b', // amber-500
  '#34d399', // emerald-400
  '#fb7185', // rose-400
]

function transformSeries(seriesData) {
  if (!seriesData || seriesData.length === 0) return { rows: [], algoKeys: [] }

  const algoKeys = seriesData.map((s) => s.algorithm_key)
  const sizeMap = {}

  for (const series of seriesData) {
    for (const point of series.points) {
      if (!sizeMap[point.size]) sizeMap[point.size] = { size: point.size }
      sizeMap[point.size][series.algorithm_key] = point.mean
    }
  }

  const rows = Object.values(sizeMap).sort((a, b) => a.size - b.size)
  return { rows, algoKeys }
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2.5 shadow-xl">
      <p className="text-[10px] text-slate-500 font-mono mb-1.5">
        Size: {Number(label).toLocaleString()}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.dataKey}</span>
          <span className="ml-auto font-mono text-slate-200">
            {typeof entry.value === 'number'
              ? entry.value % 1 === 0
                ? entry.value.toLocaleString()
                : entry.value.toFixed(3)
              : entry.value}
            {unit ? ` ${unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function BenchmarkChart({ seriesData, label, unit }) {
  const { rows, algoKeys } = transformSeries(seriesData)

  if (rows.length === 0) return null

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
          <XAxis
            dataKey="size"
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
            stroke="rgba(148,163,184,0.15)"
            tickLine={false}
            label={{
              value: 'Input Size',
              position: 'insideBottomRight',
              offset: -4,
              style: { fill: '#475569', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' },
            }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}
            tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
            stroke="rgba(148,163,184,0.15)"
            tickLine={false}
            width={52}
            label={{
              value: label ?? '',
              angle: -90,
              position: 'insideLeft',
              offset: 4,
              style: { fill: '#475569', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace' },
            }}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', fontFamily: 'IBM Plex Mono, monospace' }}
          />
          {algoKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={ALGO_COLORS[i % ALGO_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: ALGO_COLORS[i % ALGO_COLORS.length] }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#0f172a' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
