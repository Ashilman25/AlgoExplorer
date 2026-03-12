import { Sun, Moon } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TopNav({theme, onToggleTheme}) {
  return (
  <header className = "fixed top-0 left-0 right-0 z-50 h-[52px] flex items-center px-4 gap-3 bg-slate-900/95 backdrop-blur-md border-b border-white/[0.07]">

    {/* logo */}
    <Link
      to = "/"
      className = "flex items-center gap-2.5 shrink-0 group"
      aria-label = "Algorithm Explorer Home"
    >
      <span className = "font-mono font-bold text-[17px] text-brand-400 leading-none select-none" style = {{ textShadow: '0 0 16px rgba(6,182,212,0.45)' }}>AX</span>

      <span className="hidden sm:block text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors duration-[100ms]">
        Algorithm Explorer
      </span>
    </Link>

    <div className = "flex-1" />


    {/* theme toggle */}
    <button 
      onClick = {onToggleTheme}
      className = "p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors duration-[100ms]"
      aria-label = {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size = {15} strokeWidth = {1.5} /> : <Moon size = {15} strokeWidth = {1.5} />}
    </button>

  </header>
  )
}