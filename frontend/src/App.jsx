import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider, useToast } from './components/ui'
import AppShell from './components/layout/AppShell'
import HomePage from './pages/HomePage'
import GraphLabPage from './pages/GraphLabPage'
import SortingLabPage from './pages/SortingLabPage'
import DpLabPage from './pages/DpLabPage'
import ScenariosPage from './pages/ScenariosPage'
import RunsPage from './pages/RunsPage'
import BenchmarksPage from './pages/BenchmarksPage'
import ComparePage from './pages/ComparePage'
import NotFoundPage from './pages/NotFoundPage'

function GlobalListeners() {
  const toast = useToast()

  useEffect(() => {
    const handleStorageError = (e) => {
      const { type, message } = e.detail
      toast({
        type: 'warning',
        title: type === 'quota' ? 'Storage full' : 'Storage unavailable',
        message,
        duration: 8000,
      })
    }

    const handleAuthExpired = () => {
      toast({
        type: 'warning',
        title: 'Session expired',
        message: 'Please sign in again to continue.',
        duration: 0, // persistent until dismissed
      })
    }

    window.addEventListener('guest:storage-error', handleStorageError)
    window.addEventListener('auth:expired', handleAuthExpired)
    return () => {
      window.removeEventListener('guest:storage-error', handleStorageError)
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [toast])

  return null
}

export default function App() {
  return (
    <ToastProvider>
      <GlobalListeners />
      <BrowserRouter>
        <Routes>

          <Route element = {<AppShell />}>
            <Route index element = {<HomePage />} />
            <Route path = "graph" element = {<GraphLabPage />} />
            <Route path = "sorting" element = {<SortingLabPage />} />
            <Route path = "dp" element = {<DpLabPage />} />
            <Route path = "scenarios" element = {<ScenariosPage />} />
            <Route path = "runs" element = {<RunsPage />} />
            <Route path = "benchmarks" element = {<BenchmarksPage />} />
            <Route path = "compare" element = {<ComparePage />} />
            <Route path = "*" element = {<NotFoundPage />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
