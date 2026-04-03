import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResizeHandle from '../../../src/components/simulation/ResizeHandle'

const noop = () => {}

const defaultProps = {
  onPointerDown: noop,
  onPointerMove: noop,
  onPointerUp: noop,
  onDoubleClick: noop,
  isDragging: false,
  side: 'left',
}

describe('ResizeHandle', () => {
  it('renders a separator with col-resize cursor', () => {
    render(<ResizeHandle {...defaultProps} />)
    const handle = screen.getByRole('separator')
    expect(handle).toBeInTheDocument()
    expect(handle.style.cursor).toBe('col-resize')
  })

  it('has correct aria-label for left side', () => {
    render(<ResizeHandle {...defaultProps} side = "left" />)
    expect(screen.getByLabelText('Resize configuration panel')).toBeInTheDocument()
  })

  it('has correct aria-label for right side', () => {
    render(<ResizeHandle {...defaultProps} side = "right" />)
    expect(screen.getByLabelText('Resize step inspector')).toBeInTheDocument()
  })

  it('renders inner line with opacity-0 when not dragging', () => {
    render(<ResizeHandle {...defaultProps} isDragging = {false} />)
    const handle = screen.getByRole('separator')
    const line = handle.firstChild
    expect(line.className).toContain('bg-brand-400/0')
    expect(line.className).not.toContain('bg-brand-400/60')
  })

  it('renders inner line with visible opacity when dragging', () => {
    render(<ResizeHandle {...defaultProps} isDragging = {true} />)
    const handle = screen.getByRole('separator')
    const line = handle.firstChild
    expect(line.className).toContain('bg-brand-400/60')
    expect(line.className).not.toContain('bg-brand-400/0')
  })

  it('forwards onPointerDown event', () => {
    const onPointerDown = vi.fn()
    render(<ResizeHandle {...defaultProps} onPointerDown = {onPointerDown} />)
    fireEvent.pointerDown(screen.getByRole('separator'))
    expect(onPointerDown).toHaveBeenCalledTimes(1)
  })

  it('forwards onDoubleClick event', () => {
    const onDoubleClick = vi.fn()
    render(<ResizeHandle {...defaultProps} onDoubleClick = {onDoubleClick} />)
    fireEvent.doubleClick(screen.getByRole('separator'))
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it('has 6px width', () => {
    render(<ResizeHandle {...defaultProps} />)
    const handle = screen.getByRole('separator')
    expect(handle.style.width).toBe('6px')
  })
})
