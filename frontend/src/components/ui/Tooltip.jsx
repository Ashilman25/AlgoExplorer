import { useState } from 'react'
import { cn } from '../../utils/cn'

const POSITION = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export default function Tooltip({ content, children, side = 'top', className }) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className = {cn('relative inline-flex', className)}
      onMouseEnter = {() => setVisible(true)}
      onMouseLeave = {() => setVisible(false)}
    >
      {children}

      {visible && content && (
        <div
          className = {cn(
            'absolute z-50 pointer-events-none whitespace-nowrap',
            'bg-slate-700 border border-white/[0.10]',
            'text-slate-200 text-xs leading-snug',
            'px-2.5 py-1.5 rounded-lg shadow-lg backdrop-blur-sm',
            'max-w-[220px] whitespace-normal',
            POSITION[side],
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
