import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from '../../../src/components/layout/Sidebar'

// Mock useAuthStore — user logged in so Settings item appears
vi.mock('../../../src/stores/useAuthStore', () => ({
  useAuthStore: (selector) => selector({ user: { username: 'testuser' } }),
}))

function renderSidebar(props = {}) {
  const defaultProps = { isCollapsed: false, onToggle: vi.fn() }
  return render(
    <MemoryRouter>
      <Sidebar {...defaultProps} {...props} />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  describe('expanded state (default)', () => {
    it('renders all nav labels', () => {
      renderSidebar()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Graph Lab')).toBeInTheDocument()
      expect(screen.getByText('Sorting Lab')).toBeInTheDocument()
      expect(screen.getByText('DP Lab')).toBeInTheDocument()
      expect(screen.getByText('Compare')).toBeInTheDocument()
      expect(screen.getByText('Benchmark')).toBeInTheDocument()
      expect(screen.getByText('Scenarios')).toBeInTheDocument()
      expect(screen.getByText('Run History')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders section headers as text', () => {
      renderSidebar()
      expect(screen.getByText('Labs')).toBeInTheDocument()
      expect(screen.getByText('Tools')).toBeInTheDocument()
      expect(screen.getByText('Library')).toBeInTheDocument()
    })

    it('renders at 240px width', () => {
      renderSidebar()
      const aside = screen.getByRole('complementary')
      expect(aside.className).toContain('w-[240px]')
    })

    it('renders collapse button with correct aria-label', () => {
      renderSidebar()
      expect(screen.getByLabelText('Collapse sidebar')).toBeInTheDocument()
    })
  })

  describe('collapsed state', () => {
    it('renders at 56px width', () => {
      renderSidebar({ isCollapsed: true })
      const aside = screen.getByRole('complementary')
      expect(aside.className).toContain('w-[56px]')
    })

    it('hides labels with opacity-0', () => {
      renderSidebar({ isCollapsed: true })
      // Find the span containing "Graph Lab" text — it should have opacity-0
      const graphLabText = screen.getByText('Graph Lab')
      const span = graphLabText.closest('span')
      expect(span.className).toContain('opacity-0')
    })

    it('replaces section headers with hr separators', () => {
      renderSidebar({ isCollapsed: true })
      expect(screen.queryByText('Labs')).not.toBeInTheDocument()
      expect(screen.queryByText('Tools')).not.toBeInTheDocument()
      expect(screen.queryByText('Library')).not.toBeInTheDocument()
      const aside = screen.getByRole('complementary')
      const separators = aside.querySelectorAll('hr')
      expect(separators.length).toBe(3)
    })

    it('shows title tooltip on nav links', () => {
      renderSidebar({ isCollapsed: true })
      expect(screen.getByTitle('Graph Lab')).toBeInTheDocument()
      expect(screen.getByTitle('Dashboard')).toBeInTheDocument()
      expect(screen.getByTitle('Settings')).toBeInTheDocument()
    })

    it('renders expand button with correct aria-label', () => {
      renderSidebar({ isCollapsed: true })
      expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
    })
  })

  describe('toggle interaction', () => {
    it('calls onToggle when toggle button is clicked', () => {
      const onToggle = vi.fn()
      renderSidebar({ onToggle })
      fireEvent.click(screen.getByLabelText('Collapse sidebar'))
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('hover-peek', () => {
    // mouseEnter triggers on the inner nav wrapper (not the aside)
    // so hovering the toggle button doesn't accidentally trigger peek
    function getNavWrapper() {
      const aside = screen.getByRole('complementary')
      return aside.querySelector('[class*="overflow-y-auto"]')
    }

    it('expands to 240px on mouse enter when collapsed', () => {
      renderSidebar({ isCollapsed: true })
      const aside = screen.getByRole('complementary')
      expect(aside.className).toContain('w-[56px]')
      fireEvent.mouseEnter(getNavWrapper())
      expect(aside.className).toContain('w-[240px]')
    })

    it('collapses back on mouse leave', () => {
      renderSidebar({ isCollapsed: true })
      const aside = screen.getByRole('complementary')
      fireEvent.mouseEnter(getNavWrapper())
      expect(aside.className).toContain('w-[240px]')
      fireEvent.mouseLeave(aside)
      expect(aside.className).toContain('w-[56px]')
    })

    it('does not hover-peek when not collapsed', () => {
      renderSidebar({ isCollapsed: false })
      const aside = screen.getByRole('complementary')
      expect(aside.className).toContain('w-[240px]')
      fireEvent.mouseEnter(getNavWrapper())
      expect(aside.className).toContain('w-[240px]')
    })

    it('shows labels during peek', () => {
      renderSidebar({ isCollapsed: true })
      fireEvent.mouseEnter(getNavWrapper())
      const graphLabText = screen.getByText('Graph Lab')
      const span = graphLabText.closest('span')
      expect(span.className).toContain('opacity-100')
    })

    it('hides tooltips during peek (labels visible)', () => {
      renderSidebar({ isCollapsed: true })
      fireEvent.mouseEnter(getNavWrapper())
      expect(screen.queryByTitle('Graph Lab')).not.toBeInTheDocument()
    })
  })
})
