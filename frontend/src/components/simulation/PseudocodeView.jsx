import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function PseudocodeView({ lines, activeLines }) {
  const scrollRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!activeLines?.length || !scrollRef.current) return

    const firstActive = scrollRef.current.querySelector('[data-active="true"]')
    if (firstActive) {
      firstActive.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeLines])

  const handleCopy = async () => {
    const text = lines.join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!lines || lines.length === 0) {
    return (
      <div className = "flex-1 flex items-center justify-center text-slate-500 text-xs">
        No pseudocode available
      </div>
    )
  }

  return (
    <div className = "flex flex-col flex-1 min-h-0">
      <div className = "flex justify-end px-3 pt-2 pb-1">
        <button
          onClick = {handleCopy}
          aria-label = "Copy pseudocode"
          className = "p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors duration-150"
        >
          {copied ? <Check size = {13} /> : <Copy size = {13} />}
        </button>
      </div>

      <div ref = {scrollRef} className = "flex-1 overflow-y-auto min-h-0 px-3 pb-3">
        {lines.map((line, i) => {
          const isActive = activeLines?.includes(i)
          return (
            <div
              key = {i}
              data-active = {isActive || undefined}
              className = {cn(
                'flex items-start font-mono text-[13px] leading-6 transition-colors duration-150 rounded-sm',
                isActive
                  ? 'text-brand-400 bg-cyan-950/30 border-l-2 border-brand-400'
                  : 'text-slate-400 border-l-2 border-transparent',
              )}
            >
              <span className = "w-8 shrink-0 text-right pr-3 text-slate-600 select-none text-[12px]">
                {i + 1}
              </span>
              <span className = "whitespace-pre">{line}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
