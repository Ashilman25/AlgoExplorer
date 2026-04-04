import { useState } from 'react'
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
  ChevronLeft,
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


function NavItem({to, icon: Icon, label, end = false, showExpanded = true}) {
  return (
    <NavLink
      to = {to}
      end = {end}
      title = {showExpanded ? undefined : label}
      className={({ isActive }) =>
        cn(
          'flex items-center transition-colors duration-[100ms] select-none rounded-lg',
          'text-sm font-medium',
          showExpanded
            ? 'gap-3 mx-2 px-3 py-[7px]'
            : 'justify-center mx-auto w-9 h-8',
          isActive
            ? 'bg-brand-500/10 text-brand-400'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200',
        )
      }
      >
        <Icon size = {15} strokeWidth = {1.5} className = "shrink-0" />
        <span
          className = {cn(
            'overflow-hidden whitespace-nowrap',
            showExpanded ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0',
          )}
          style = {{ transition: 'opacity 150ms ease-out, max-width 200ms ease-out' }}
        >
          {label}
        </span>
      </NavLink>
  )
}

export default function Sidebar({ isCollapsed = false, onToggle }) {
  const user = useAuthStore((s) => s.user)
  const [isHovering, setIsHovering] = useState(false)

  const showExpanded = !isCollapsed || isHovering

  return (
    <aside
      className = {cn(
        'fixed left-0 top-[52px] z-40 h-[calc(100vh-52px)]',
        'bg-slate-900 border-r border-white/[0.07]',
        'transition-[width] duration-200 ease-out',
        showExpanded ? 'w-[240px]' : 'w-[56px]',
      )}
      onMouseLeave = {() => { if (isCollapsed) setIsHovering(false) }}
    >

      {/* toggle button — outside scroll wrapper so it isn't clipped */}
      <button
        type = "button"
        onClick = {onToggle}
        aria-label = {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className = {cn(
          'absolute right-[-14px] top-[50px] z-10',
          'w-4 h-8 rounded-r-lg',
          'bg-slate-900 border border-white/[0.12] border-l-0',
          'flex items-center justify-center',
          'text-slate-400 hover:text-brand-400 hover:bg-slate-700 hover:border-brand-500/30',
          'transition-colors duration-[100ms]',
          'shadow-md',
        )}
      >
        <ChevronLeft
          size = {14}
          strokeWidth = {2}
          className = {cn(
            'transition-transform duration-200 ease-out',
            isCollapsed && !isHovering ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>

      {/* scrollable nav content — hover here triggers peek, not on the toggle button */}
      <div
        className = "flex flex-col h-full overflow-y-auto overflow-x-hidden"
        onMouseEnter = {() => { if (isCollapsed) setIsHovering(true) }}
      >

        {/* dashboard */}
        <div className = "pt-3 pb-1">
          <NavItem to = "/" icon = {LayoutDashboard} label = "Dashboard" end showExpanded = {showExpanded} />
        </div>

        {/* nav sections */}
        {NAV_SECTIONS.map(({section, items}) => (
          <div key = {section} className = {cn('pb-1', showExpanded ? 'pt-5' : 'pt-2')}>
            {showExpanded ? (
              <p className = "px-5 pb-2 text-[10px] font-semibold tracking-[0.10em] uppercase text-slate-600 select-none">
                {section}
              </p>
            ) : (
              <hr className = "mx-auto w-6 border-white/[0.06] mb-2" />
            )}

            <div className = {showExpanded ? 'space-y-0.5' : 'flex flex-col items-center gap-0.5'}>
              {items.map(item => (
                <NavItem key = {item.to} {...item} showExpanded = {showExpanded} />
              ))}
            </div>
          </div>
        ))}

        <div className = "flex-1" />

        {user && (
          <div className = "pb-3">
            <NavItem to = "/settings" icon = {Settings} label = "Settings" showExpanded = {showExpanded} />
          </div>
        )}

      </div>
    </aside>
  )
}
