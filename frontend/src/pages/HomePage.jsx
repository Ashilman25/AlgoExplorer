import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Network,
  BarChart3,
  Grid3x3,
  BookMarked,
  Gauge,
  ArrowRight,
  Activity,
  Columns2,
} from 'lucide-react'
import { api } from '../services/api'


const LABS = [
  {
    label: 'Graph Lab',
    to: '/graph',
    icon: Network,
    iconColor: 'text-brand-400',
    iconBg: 'bg-brand-500/10',
    borderHover: 'hover:border-brand-500/25',
    phase: 'Phase 5',
    description:
      'Visualize graph and pathfinding algorithms step by step on an interactive node/edge canvas.',
    algorithms: ['BFS', 'Dijkstra'],
  },
  {
    label: 'Sorting Lab',
    to: '/sorting',
    icon: BarChart3,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    borderHover: 'hover:border-amber-500/25',
    phase: 'Phase 6',
    description:
      'Watch sorting algorithms work through arrays in real time with comparison and swap tracking.',
    algorithms: ['Quick Sort', 'Merge Sort'],
  },
  {
    label: 'DP Lab',
    to: '/dp',
    icon: Grid3x3,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/25',
    phase: 'Phase 7',
    description:
      'Explore dynamic programming through cell-by-cell table construction with traceback overlays.',
    algorithms: ['LCS', 'Edit Distance'],
  },
]

const TOOLS = [
  {
    label: 'Scenario Library',
    to: '/scenarios',
    icon: BookMarked,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    borderHover: 'hover:border-sky-500/25',
    description: 'Save, browse, and reload your custom algorithm inputs and configurations.',
  },
  {
    label: 'Benchmark Lab',
    to: '/benchmarks',
    icon: Gauge,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    borderHover: 'hover:border-emerald-500/25',
    description: 'Measure algorithm performance across input sizes and visualize runtime curves.',
  },
  {
    label: 'Compare',
    to: '/compare',
    icon: Columns2,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    borderHover: 'hover:border-violet-500/25',
    description: 'Run two algorithms side by side on identical inputs and compare their execution.',
  },
]

const STATUS_COLOR = {
  connected: 'text-emerald-400',
  unreachable: 'text-rose-400',
  checking: 'text-amber-400',
}


export default function HomePage() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    api.health()
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('unreachable'))
  }, [])

  return (
    <div className = "max-w-5xl">

      <div className = "mb-10 animate-enter">
        <p className = "text-[11px] font-semibold tracking-[0.12em] uppercase text-brand-400 mb-2">
          Algorithm Explorer
        </p>

        <h1 className = "text-2xl font-semibold text-slate-100 tracking-tight mb-2">
          Dashboard
        </h1>

        <p className = "text-sm text-slate-400 max-w-md leading-relaxed">
          A browser-based simulation lab for visualizing, comparing, and benchmarking algorithms.
          Pick a lab below to begin exploring.
        </p>

        {/* backend connection indicator */}
        <div className = "mt-4 inline-flex items-center gap-1.5">
          <Activity size = {12} strokeWidth = {1.5} className = {STATUS_COLOR[backendStatus]} />
          <span className = "text-xs text-slate-600">
            API <span className = {STATUS_COLOR[backendStatus]}>{backendStatus}</span>
          </span>
        </div>
      </div>


      <section className = "mb-9 animate-enter stagger-1">
        <h2 className = "text-[10px] font-semibold tracking-[0.10em] uppercase text-slate-600 mb-4">
          Algorithm Labs
        </h2>

        <div className = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LABS.map(lab => (
            <Link
              key = {lab.to}
              to = {lab.to}
              className = {[
                'group flex flex-col gap-5 rounded-xl p-5',
                'bg-slate-800/50 border border-white/[0.07]',
                'transition-all duration-[150ms]',
                lab.borderHover,
                'hover:bg-slate-800/80',
              ].join(' ')}
            >
              {/* Icon + phase badge */}
              <div className = "flex items-start justify-between">
                <div className = {`p-2.5 rounded-xl ${lab.iconBg}`}>
                  <lab.icon size = {17} strokeWidth = {1.5} className = {lab.iconColor} />
                </div>

                <span className = "text-[10px] font-mono font-medium text-slate-600 uppercase tracking-wide">
                  {lab.phase}
                </span>
              </div>

              {/* Title + description */}
              <div className = "flex-1 space-y-1.5">
                <h3 className = "text-sm font-semibold text-slate-100">{lab.label}</h3>
                <p className = "text-xs text-slate-400 leading-relaxed">{lab.description}</p>
              </div>

              {/* Algorithms + arrow */}
              <div className = "flex items-center justify-between gap-2">
                <div className = "flex gap-1.5 flex-wrap">
                  {lab.algorithms.map(alg => (
                    <span
                      key = {alg}
                      className = "text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-500 border border-white/[0.05]"
                    >
                      {alg}
                    </span>
                  ))}
                </div>

                <ArrowRight
                  size = {13}
                  strokeWidth = {1.5}
                  className = "text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-[100ms] shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className = "animate-enter stagger-2">
        <h2 className = "text-[10px] font-semibold tracking-[0.10em] uppercase text-slate-600 mb-4">
          Tools
        </h2>

        <div className = "grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TOOLS.map(tool => (
            <Link
              key = {tool.to}
              to = {tool.to}
              className = {[
                'group flex items-start gap-3.5 rounded-xl p-4',
                'bg-slate-800/50 border border-white/[0.07]',
                'transition-all duration-[150ms]',
                tool.borderHover,
                'hover:bg-slate-800/80',
              ].join(' ')}
            >
              <div className = {`p-2 rounded-lg shrink-0 ${tool.iconBg}`}>
                <tool.icon size = {15} strokeWidth = {1.5} className = {tool.iconColor} />
              </div>

              <div className = "min-w-0 flex-1">
                <div className = "flex items-center justify-between gap-1">
                  <h3 className = "text-sm font-semibold text-slate-200">{tool.label}</h3>
                  <ArrowRight
                    size = {12}
                    strokeWidth = {1.5}
                    className = "text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-[100ms] shrink-0"
                  /> 
                </div>
                <p className = "mt-1 text-xs text-slate-500 leading-relaxed">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
