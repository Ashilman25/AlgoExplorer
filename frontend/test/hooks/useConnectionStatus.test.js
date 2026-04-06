import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the client module
vi.mock('../../src/services/client', () => ({
  client: {
    health: vi.fn(),
  },
}))

import { client } from '../../src/services/client'
import { useConnectionStatus } from '../../src/hooks/useConnectionStatus'

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    client.health.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in CONNECTING state', () => {
    client.health.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useConnectionStatus())
    expect(result.current.status).toBe('CONNECTING')
  })

  it('transitions to CONNECTED then HEALTHY on immediate success', async () => {
    client.health.mockResolvedValueOnce({ ok: true })
    const { result } = renderHook(() => useConnectionStatus())

    // Wait for the health check to resolve
    await waitFor(() => {
      expect(result.current.status).toBe('CONNECTED')
    })

    // Advance past SUCCESS_FLASH_DURATION (2s)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.status).toBe('HEALTHY')
  })

  it('transitions to WAKING_UP after BANNER_THRESHOLD (10s)', async () => {
    client.health.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useConnectionStatus())

    expect(result.current.status).toBe('CONNECTING')

    // Advance past BANNER_THRESHOLD (10s)
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(result.current.status).toBe('WAKING_UP')
  })

  it('transitions to UNREACHABLE after GRACE_PERIOD (60s)', async () => {
    client.health.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useConnectionStatus())

    // Advance past GRACE_PERIOD (60s)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(result.current.status).toBe('UNREACHABLE')
  })

  it('transitions from WAKING_UP to CONNECTED on success', async () => {
    // First calls fail, then succeed
    client.health
      .mockRejectedValueOnce(new Error('down'))  // initial
      .mockRejectedValueOnce(new Error('down'))  // 5s retry
      .mockResolvedValueOnce({ ok: true })        // 10s retry

    const { result } = renderHook(() => useConnectionStatus())

    // Advance to WAKING_UP
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(result.current.status).toBe('WAKING_UP')

    // Next retry succeeds (at 10s the banner threshold timer fires AND next retry)
    act(() => { vi.advanceTimersByTime(5000) })
    await waitFor(() => {
      expect(result.current.status).toBe('CONNECTED')
    })
  })

  it('transitions from UNREACHABLE to CONNECTED on retry()', async () => {
    client.health.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useConnectionStatus())

    // Get to UNREACHABLE
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(result.current.status).toBe('UNREACHABLE')

    // Manual retry succeeds
    client.health.mockResolvedValueOnce({ ok: true })
    await act(async () => { result.current.retry() })

    await waitFor(() => {
      expect(result.current.status).toBe('CONNECTED')
    })
  })

  it('transitions from HEALTHY to UNREACHABLE on background check failure', async () => {
    client.health.mockResolvedValueOnce({ ok: true })
    const { result } = renderHook(() => useConnectionStatus())

    // Get to HEALTHY
    await waitFor(() => { expect(result.current.status).toBe('CONNECTED') })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.status).toBe('HEALTHY')

    // Background check fails at HEALTHY_POLL (30s)
    client.health.mockRejectedValueOnce(new Error('down'))
    act(() => { vi.advanceTimersByTime(30_000) })

    await waitFor(() => {
      expect(result.current.status).toBe('UNREACHABLE')
    })
  })

  it('retries every RETRY_DURING_GRACE (5s) during connecting phase', async () => {
    client.health.mockRejectedValue(new Error('down'))
    renderHook(() => useConnectionStatus())

    // Initial call
    expect(client.health).toHaveBeenCalledTimes(1)

    // After 5s — first retry
    act(() => { vi.advanceTimersByTime(5000) })
    expect(client.health).toHaveBeenCalledTimes(2)

    // After 10s — second retry
    act(() => { vi.advanceTimersByTime(5000) })
    expect(client.health).toHaveBeenCalledTimes(3)
  })

  it('exposes a retry function', () => {
    client.health.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useConnectionStatus())
    expect(typeof result.current.retry).toBe('function')
  })
})
