import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'
import Sidebar from './Sidebar'
import ErrorBoundary from '../ui/ErrorBoundary'
import ConnectionBanner from '../ui/ConnectionBanner'


export default function AppShell() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ax-theme') || 'dark'
  })


  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    localStorage.setItem('ax-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <>
      <TopNav theme = {theme} onToggleTheme = {toggleTheme} />
      <Sidebar />

      <main className = "pl-[240px] pt-[52px] min-h-screen">
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
