import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider, useToast } from './components/ui'
import AppShell from './components/layout/AppShell'
import AuthBootstrap from './components/auth/AuthBootstrap'
import RequireAuth from './components/auth/RequireAuth'
import PublicOnlyRoute from './components/auth/PublicOnlyRoute'
import HomePage from './pages/HomePage'
import GraphLabPage from './pages/GraphLabPage'
import SortingLabPage from './pages/SortingLabPage'
import DpLabPage from './pages/DpLabPage'
import ScenariosPage from './pages/ScenariosPage'
import RunsPage from './pages/RunsPage'
import BenchmarksPage from './pages/BenchmarksPage'
import ComparePage from './pages/ComparePage'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import { useAuthStore } from './stores/useAuthStore'

function GlobalListeners() {
  const toast = useToast()
  const clearSession = useAuthStore((s) => s.clearSession)

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
      clearSession()
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
  }, [clearSession, toast])

  return null
}

export default function App() {
  return (
    <ToastProvider>
      <GlobalListeners />
      <BrowserRouter>
        <AuthBootstrap />
        <Routes>
          <Route
            path = "login"
            element = {
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path = "register"
            element = {
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          <Route element = {<AppShell />}>
            <Route index element = {<HomePage />} />
            <Route path = "graph" element = {<GraphLabPage />} />
            <Route path = "sorting" element = {<SortingLabPage />} />
            <Route path = "dp" element = {<DpLabPage />} />
            <Route path = "scenarios" element = {<ScenariosPage />} />
            <Route path = "runs" element = {<RunsPage />} />
            <Route path = "benchmarks" element = {<BenchmarksPage />} />
            <Route path = "compare" element = {<ComparePage />} />
            <Route
              path = "account"
              element = {
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route path = "*" element = {<NotFoundPage />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
