import { Sun, Moon, LogIn, UserPlus, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import { useAuthStore } from '../../stores/useAuthStore'
import { useLogout } from '../../hooks/useLogout'

export default function TopNav({theme, onToggleTheme}) {
  const user = useAuthStore((s) => s.user)
  const isInitialized = useAuthStore((s) => s.isInitialized)
  const handleLogout = useLogout()

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

    {isInitialized && user ? (
      <div className="flex items-center gap-2">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-slate-100 bg-slate-800/70 hover:bg-slate-800 transition-colors duration-fast border border-white/[0.06]"
        >
          <UserRound size={13} strokeWidth={1.75} className="text-brand-400" />
          <span className="hidden sm:inline">{user.username}</span>
        </Link>

        <Button variant="ghost" size="sm" icon={LogOut} onClick={handleLogout}>
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    ) : isInitialized ? (
      <div className="flex items-center gap-2">
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors duration-fast"
        >
          <LogIn size={13} strokeWidth={1.5} />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-slate-200 bg-slate-700 hover:bg-slate-600 border border-white/[0.08] transition-colors duration-fast"
        >
          <UserPlus size={13} strokeWidth={1.5} />
          <span className="hidden sm:inline">Register</span>
        </Link>
      </div>
    ) : null}

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
