import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import GuestPromptBanner from '../../../src/components/guest/GuestPromptBanner'

// Mock stores to bypass persist middleware
const mockAuthState = { user: null }
const mockGuestState = { runs: [], scenarios: [] }

vi.mock('../../../src/stores/useAuthStore', () => ({
  useAuthStore: (selector) => selector(mockAuthState),
}))

vi.mock('../../../src/stores/useGuestStore', () => ({
  useGuestStore: (selector) => selector(mockGuestState),
}))


function renderBanner() {
  return render(
    <MemoryRouter>
      <GuestPromptBanner />
    </MemoryRouter>,
  )
}

describe('GuestPromptBanner', () => {
  beforeEach(() => {
    mockAuthState.user = null
    mockGuestState.runs = []
    mockGuestState.scenarios = []
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders nothing when guest has no data', () => {
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when user is authenticated', () => {
    mockAuthState.user = { id: 1, username: 'test' }
    mockGuestState.runs = [{ id: 'r1', run_id: 1 }]

    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('renders when guest has runs', () => {
    mockGuestState.runs = [{ id: 'r1', run_id: 1 }]

    renderBanner()
    expect(screen.getByText(/1 run stored locally/)).toBeTruthy()
    expect(screen.getByText('Create an account')).toBeTruthy()
  })

  it('renders when guest has scenarios', () => {
    mockGuestState.scenarios = [
      { id: 's1', name: 'Test' },
      { id: 's2', name: 'Test 2' },
    ]

    renderBanner()
    expect(screen.getByText(/2 scenarios stored locally/)).toBeTruthy()
  })

  it('renders when guest has both runs and scenarios', () => {
    mockGuestState.runs = [{ id: 'r1', run_id: 1 }]
    mockGuestState.scenarios = [{ id: 's1', name: 'Test' }]

    renderBanner()
    expect(screen.getByText(/1 run and 1 scenario/)).toBeTruthy()
  })

  it('can be dismissed', () => {
    mockGuestState.runs = [{ id: 'r1', run_id: 1 }]

    const { container } = renderBanner()
    expect(screen.getByText(/1 run stored locally/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(container.innerHTML).toBe('')
  })

  it('stays dismissed within session after re-render', () => {
    mockGuestState.runs = [{ id: 'r1', run_id: 1 }]

    const { unmount } = renderBanner()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    unmount()
    const { container } = renderBanner()
    expect(container.innerHTML).toBe('')
  })

  it('links to the register page', () => {
    mockGuestState.runs = [{ id: 'r1', run_id: 1 }]

    renderBanner()
    const link = screen.getByText('Create an account')
    expect(link.closest('a').getAttribute('href')).toBe('/register')
  })

  it('pluralizes correctly for multiple runs', () => {
    mockGuestState.runs = [
      { id: 'r1', run_id: 1 },
      { id: 'r2', run_id: 2 },
      { id: 'r3', run_id: 3 },
    ]

    renderBanner()
    expect(screen.getByText(/3 runs stored locally/)).toBeTruthy()
  })
})
