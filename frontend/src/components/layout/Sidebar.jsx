import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  BarChart3,
  Grid3x3,
  Columns2,
  Gauge,
  BookMarked,
  History,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '../../stores/useAuthStore'
import { cn } from '../../utils/cn'

const NAV_SECTIONS = [
  {
    section: 'Labs',
    items: [
      {label: 'Graph Lab', to: '/graph', icon: Network},
      {label: 'Sorting Lab', to: '/sorting', icon: BarChart3},
      {label: 'DP Lab', to: '/dp', icon: Grid3x3},
    ],
  },
  {
    section: 'Tools',
    items: [
      {label: 'Compare', to: '/compare', icon: Columns2},
      {label: 'Benchmark', to: '/benchmarks', icon: Gauge},
    ],
  },
  {
    section: 'Library',
    items: [
      {label: 'Scenarios', to: '/scenarios', icon: BookMarked},
      {label: 'Run History', to: '/runs', icon: History},
    ],
  },
]


function NavItem({to, icon: Icon, label, end = false}) {
  return (
    <NavLink 
      to = {to}
      end = {end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 mx-2 px-3 py-[7px] rounded-lg',
          'text-sm font-medium transition-colors duration-[100ms] select-none',
          isActive
            ? 'bg-brand-500/10 text-brand-400'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
        )
      }
      >
        <Icon size = {15} strokeWidth = {1.5} className = "shrink-0" />
        {label}
      </NavLink>
  )
}

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <aside className="fixed left-0 top-[52px] z-40 w-[240px] h-[calc(100vh-52px)] flex flex-col bg-slate-900 border-r border-white/[0.07] overflow-y-auto">

      {/* dashboard */}
      <div className = "pt-3 pb-1">
        <NavItem to = "/" icon = {LayoutDashboard} label = "Dashboard" end />
      </div>

      {/* nav sections */}
      {NAV_SECTIONS.map(({section, items}) => (
        <div key = {section} className = "pt-5 pb-1">
          <p className = "px-5 pb-2 text-[10px] font-semibold tracking-[0.10em] uppercase text-slate-600 select-none">
            {section}
          </p>

          <div className = "space-y-0.5">
            {items.map(item => (
              <NavItem key = {item.to} {...item} />
            ))}
          </div>
        </div>
      ))}

      <div className = "flex-1" />

      {user && (
        <div className = "pb-3">
          <NavItem to = "/settings" icon = {Settings} label = "Settings" />
        </div>
      )}

    </aside>
  )
}