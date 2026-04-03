import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Sidebar from './Sidebar'
import ErrorBoundary from '../ui/ErrorBoundary'
import ConnectionBanner from '../ui/ConnectionBanner'


export default function AppShell() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ax-theme') || 'dark'
  })
  const [isCollapsed, setIsCollapsed] = useState(false)


  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    localStorage.setItem('ax-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }

  const toggleSidebar = useCallback(() => setIsCollapsed(c => !c), [])

  return (
    <>
      <TopNav theme = {theme} onToggleTheme = {toggleTheme} />
      <Sidebar isCollapsed = {isCollapsed} onToggle = {toggleSidebar} />

      <main className = "pt-[52px] min-h-screen transition-[padding-left] duration-200 ease-out" style = {{ paddingLeft: isCollapsed ? '56px' : '240px' }}>
        <ConnectionBanner />
        <div className = "px-6 py-7">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </>
  )
}
