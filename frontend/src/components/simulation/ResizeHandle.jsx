import { cn } from '../../utils/cn'

export default function ResizeHandle({ onPointerDown, onPointerMove, onPointerUp, onDoubleClick, isDragging, side }) {
  return (
    <div
      className = "group relative flex-none select-none"
      style = {{ width: '6px', cursor: 'col-resize' }}
      onPointerDown = {onPointerDown}
      onPointerMove = {onPointerMove}
      onPointerUp = {onPointerUp}
      onDoubleClick = {onDoubleClick}
      role = "separator"
      aria-orientation = "vertical"
      aria-label = {side === 'left' ? 'Resize configuration panel' : 'Resize step inspector'}
    >
      <div
        className = {cn(
          'absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] rounded-full transition-opacity duration-150',
          isDragging
            ? 'bg-brand-400/60'
            : 'bg-brand-400/0 group-hover:bg-brand-400/40'
        )}
      />
    </div>
  )
}
