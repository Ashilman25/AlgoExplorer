import { useState, useEffect, useRef, useCallback } from 'react'
import { client } from '../services/client'

const RETRY_DURING_GRACE = 5_000
const BANNER_THRESHOLD = 10_000
const GRACE_PERIOD = 60_000
const SUCCESS_FLASH_DURATION = 2_000
const HEALTHY_POLL = 30_000
const UNHEALTHY_POLL = 15_000

export function useConnectionStatus() {
  const [status, setStatus] = useState('CONNECTING')
  const retryRef = useRef(null)
  const timers = useRef({ retry: null, banner: null, grace: null, flash: null })

  useEffect(() => {
    let cancelled = false
    const t = timers.current

    function clearAll() {
      clearInterval(t.retry)
      clearTimeout(t.banner)
      clearTimeout(t.grace)
      clearTimeout(t.flash)
      t.retry = null
      t.banner = null
      t.grace = null
      t.flash = null
    }

    function startHealthyPolling() {
      t.retry = setInterval(async () => {
        try {
          await client.health()
        } catch {
          if (cancelled) return
          clearInterval(t.retry)
          t.retry = null
          setStatus('UNREACHABLE')
          startUnhealthyPolling()
        }
      }, HEALTHY_POLL)
    }

    function startUnhealthyPolling() {
      t.retry = setInterval(async () => {
        try {
          await client.health()
          if (!cancelled) transitionToConnected()
        } catch { /* still down */ }
      }, UNHEALTHY_POLL)
    }

    function transitionToConnected() {
      clearAll()
      setStatus('CONNECTED')
      t.flash = setTimeout(() => {
        if (!cancelled) {
          setStatus('HEALTHY')
          startHealthyPolling()
        }
      }, SUCCESS_FLASH_DURATION)
    }

    retryRef.current = async () => {
      try {
        await client.health()
        transitionToConnected()
      } catch { /* stays in current state */ }
    }

    function startGracePeriod() {
      // Retry every RETRY_DURING_GRACE during the grace window
      t.retry = setInterval(async () => {
        try {
          await client.health()
          if (!cancelled) transitionToConnected()
        } catch { /* keep retrying */ }
      }, RETRY_DURING_GRACE)

      // Show banner after BANNER_THRESHOLD
      t.banner = setTimeout(() => {
        if (!cancelled) setStatus('WAKING_UP')
      }, BANNER_THRESHOLD)

      // Move to UNREACHABLE after GRACE_PERIOD
      t.grace = setTimeout(() => {
        if (cancelled) return
        clearInterval(t.retry)
        t.retry = null
        setStatus('UNREACHABLE')
        startUnhealthyPolling()
      }, GRACE_PERIOD)
    }

    // Schedule all grace-period timers immediately, before the async health check.
    // This ensures timers are in place before any vi.advanceTimersByTime() calls in tests.
    startGracePeriod()

    // Run initial health check — on success, cancel the grace timers and transition
    client.health().then(() => {
      if (!cancelled) transitionToConnected()
    }).catch(() => {
      // Grace timers are already running — nothing to do on failure
    })

    return () => {
      cancelled = true
      clearAll()
    }
  }, [])

  const retry = useCallback(() => retryRef.current?.(), [])

  return { status, retry }
}
