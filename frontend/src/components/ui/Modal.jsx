import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, children, size = 'md', className }) {
  useEffect(() => {
    if (!open) return

    const handler = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', handler)

    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className = "fixed inset-0 z-50 flex items-center justify-center p-4"
      role = "dialog"
      aria-modal = "true"
    >

      {/* background */}
      <div
        className = "absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick = {onClose}
      />

      {/* Panel */}
      <div
        className = {cn(
          'relative w-full glass border border-white/[0.10] rounded-xl shadow-2xl animate-enter',
          SIZES[size],
          className,
        )}
      >
        {title && (
          <div className = "panel-header flex items-center justify-between rounded-t-xl">
            <span className = "text-slate-200 font-semibold text-sm">{title}</span>

            <button
              onClick = {onClose}
              className = "p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-fast"
            >
              <X size = {14} strokeWidth = {1.5} />
            </button>
          </div>
        )}
        
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
