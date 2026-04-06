import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConnectionDot, ConnectionBanner } from '../../../src/components/ui/ConnectionIndicator'

describe('ConnectionDot', () => {
  it('renders spinner and "Connecting…" text for CONNECTING', () => {
    render(<ConnectionDot status="CONNECTING" />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
    expect(screen.getByLabelText('Checking server connection')).toBeInTheDocument()
  })

  it('renders spinner and "Connecting…" text for WAKING_UP', () => {
    render(<ConnectionDot status="WAKING_UP" />)
    expect(screen.getByText('Connecting…')).toBeInTheDocument()
  })

  it('renders green dot for CONNECTED', () => {
    render(<ConnectionDot status="CONNECTED" />)
    const dot = screen.getByLabelText('Server connected')
    expect(dot).toBeInTheDocument()
    expect(screen.queryByText('Connecting…')).not.toBeInTheDocument()
  })

  it('renders green dot with tooltip for HEALTHY', () => {
    render(<ConnectionDot status="HEALTHY" />)
    const dot = screen.getByLabelText('Server connected')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveAttribute('title', 'Server connected')
  })

  it('renders amber pulsing dot for UNREACHABLE', () => {
    render(<ConnectionDot status="UNREACHABLE" />)
    const dot = screen.getByLabelText('Server unreachable')
    expect(dot).toBeInTheDocument()
    expect(dot.className).toContain('animate-pulse')
  })
})

describe('ConnectionBanner', () => {
  it('renders nothing for CONNECTING', () => {
    const { container } = render(<ConnectionBanner status="CONNECTING" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for HEALTHY', () => {
    const { container } = render(<ConnectionBanner status="HEALTHY" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders waking-up message for WAKING_UP', () => {
    render(<ConnectionBanner status="WAKING_UP" />)
    expect(screen.getByText(/server is waking up/i)).toBeInTheDocument()
  })

  it('renders success flash for CONNECTED', () => {
    render(<ConnectionBanner status="CONNECTED" />)
    expect(screen.getByText('Connected!')).toBeInTheDocument()
  })

  it('renders warning with retry button for UNREACHABLE', () => {
    const onRetry = vi.fn()
    render(<ConnectionBanner status="UNREACHABLE" onRetry={onRetry} />)
    expect(screen.getByText(/can't reach the server/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button for non-UNREACHABLE states', () => {
    render(<ConnectionBanner status="WAKING_UP" />)
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })
})
