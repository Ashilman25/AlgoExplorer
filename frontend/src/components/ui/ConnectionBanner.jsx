import { useState, useEffect, useCallback, useRef } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { client } from '../../services/client'

const CHECK_INTERVAL = 15_000
const INITIAL_DELAY = 2_000

export default function ConnectionBanner() {
  const [connected, setConnected] = useState(true)
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef(null)

  const checkHealth = useCallback(async () => {
    setChecking(true)
    try {
      await client.health()
      setConnected(true)
      clearInterval(intervalRef.current)
      intervalRef.current = null
    } catch {
      setConnected(false)
      // start periodic retry if not already running
      if (!intervalRef.current) {
        intervalRef.current = setInterval(async () => {
          try {
            await client.health()
            setConnected(true)
            clearInterval(intervalRef.current)
            intervalRef.current = null
          } catch { /* still down */ }
        }, CHECK_INTERVAL)
      }
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(checkHealth, INITIAL_DELAY)
    return () => {
      clearTimeout(timer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkHealth])

  if (connected) return null

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
      <WifiOff size={14} strokeWidth={1.5} className="text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300">
        Unable to connect to the backend server. Features that require the API will not work.
      </p>
      <button
        onClick={checkHealth}
        disabled={checking}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={11} strokeWidth={1.5} className={checking ? 'animate-spin' : ''} />
        Retry
      </button>
    </div>
  )
}
