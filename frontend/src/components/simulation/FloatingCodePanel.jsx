import { useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useDrag } from '../../hooks/useDrag'
import PseudocodeView from './PseudocodeView'
import CodeView from './CodeView'

const MIN_WIDTH = 280
const MIN_HEIGHT = 200

export default function FloatingCodePanel({ open, onClose, content, activeLines }) {
  const [activeTab, setActiveTab] = useState('pseudocode')
  const [size, setSize] = useState({ width: 420, height: 360 })
  const sizeRef = useRef({ width: 420, height: 360 })
  const { position, isDragging, handlePointerDown } = useDrag({
    defaultPosition: { x: 0, y: 0 },
  })

  const handleResizePointerDown = useCallback((edge) => (e) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const originW = sizeRef.current.width
    const originH = sizeRef.current.height

    const onMove = (moveEvent) => {
      let nextW = originW
      let nextH = originH

      if (edge === 'right' || edge === 'corner') {
        nextW = Math.max(MIN_WIDTH, originW + (moveEvent.clientX - startX))
      }
      if (edge === 'bottom' || edge === 'corner') {
        nextH = Math.max(MIN_HEIGHT, originH + (moveEvent.clientY - startY))
      }

      const next = { width: nextW, height: nextH }
      sizeRef.current = next
      setSize(next)
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [])

  if (!open) return null

  return (
    <div
      className = {cn(
        'absolute z-30 flex flex-col rounded-xl border border-white/[0.10] shadow-lg',
        'bg-slate-800/90 backdrop-blur-md',
      )}
      style = {{
        width: size.width,
        height: size.height,
        top: 16 + position.y,
        right: 16 - position.x,
        cursor: isDragging ? 'grabbing' : undefined,
      }}
    >
      {/* Title bar — draggable */}
      <div
        onPointerDown = {handlePointerDown}
        className = "flex items-center justify-between px-3 h-10 shrink-0 border-b border-white/[0.07] select-none"
        style = {{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className = "flex items-center gap-1">
          {['pseudocode', 'code'].map((tab) => (
            <button
              key = {tab}
              onClick = {() => setActiveTab(tab)}
              className = {cn(
                'px-2.5 py-1 text-xs font-medium rounded transition-colors duration-150',
                activeTab === tab
                  ? 'text-brand-400 bg-brand-500/15'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {tab === 'pseudocode' ? 'Pseudocode' : 'Code'}
            </button>
          ))}
        </div>

        <button
          onClick = {onClose}
          aria-label = "Close code panel"
          className = "p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors duration-150"
        >
          <X size = {14} strokeWidth = {1.5} />
        </button>
      </div>

      <div className = "flex-1 min-h-0 flex flex-col">
        {activeTab === 'pseudocode' ? (
          <PseudocodeView
            lines = {content?.pseudocode || []}
            activeLines = {activeLines || []}
          />
        ) : (
          <CodeView code = {content?.code || null} />
        )}
      </div>

      {/* Resize handles */}
      <div
        onPointerDown = {handleResizePointerDown('right')}
        className = "absolute top-0 right-0 w-2 h-full cursor-e-resize"
        style = {{ transform: 'translateX(50%)' }}
      />
      <div
        onPointerDown = {handleResizePointerDown('bottom')}
        className = "absolute bottom-0 left-0 h-2 w-full cursor-s-resize"
        style = {{ transform: 'translateY(50%)' }}
      />
      <div
        onPointerDown = {handleResizePointerDown('corner')}
        className = "absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
        style = {{ transform: 'translate(50%, 50%)' }}
      />
    </div>
  )
}
