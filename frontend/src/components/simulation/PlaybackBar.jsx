import { useEffect } from 'react'
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from 'lucide-react'
import { cn } from '../../utils/cn'
import { usePlaybackStore } from '../../stores/usePlaybackStore'

const SPEEDS = [0.25, 0.5, 1, 2, 4]
const BASE_DELAY_MS = 700   // ms per step at 1× speed

export default function PlaybackBar() {
  const stepIndex = usePlaybackStore((s) => s.stepIndex)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const speed = usePlaybackStore((s) => s.speed)
  const {play, pause, next, prev, jumpToStart, jumpToEnd, jumpTo, setSpeed} = usePlaybackStore()

  const hasSteps = totalSteps > 0
  const atStart = stepIndex === 0
  const atEnd = stepIndex >= totalSteps - 1

  // Auto-advance when playing 
  useEffect(() => {
    if (!isPlaying || !hasSteps) return

    const delay = Math.round(BASE_DELAY_MS / speed)
    const id = setInterval(() => {
      const s = usePlaybackStore.getState()

      if (s.stepIndex >= s.totalSteps - 1) {
        s.pause()
      } else {
        s.next()
      }

    }, delay)

    return () => clearInterval(id)
  }, [isPlaying, speed, hasSteps])

  return (
    <div className = "flex items-center gap-4 px-5 rounded-xl border border-white/[0.07] bg-slate-900/80 h-[72px] flex-none">

      {/* Step counter */}
      <span className = "mono-label whitespace-nowrap" style = {{ minWidth: '88px' }}>
        STEP {hasSteps ? stepIndex + 1 : '—'} / {hasSteps ? totalSteps : '—'}
      </span>

      {/* Scrubber */}
      <input
        type = "range"
        min = {0}
        max = {Math.max(0, totalSteps - 1)}
        value = {stepIndex}
        disabled = {!hasSteps}
        onChange = {(e) => jumpTo(Number(e.target.value))}
        className = "flex-1 h-1 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      />

      {/* Transport controls */}
      <div className="flex items-center gap-1">
        <CtrlBtn icon = {SkipBack} onClick = {jumpToStart} disabled = {!hasSteps || atStart} title = "Jump to start" />
        <CtrlBtn icon = {ChevronLeft} onClick = {prev} disabled = {!hasSteps || atStart} title = "Step back" />
        <CtrlBtn
          icon = {isPlaying ? Pause : Play}
          onClick = {isPlaying ? pause : play}
          disabled = {!hasSteps}
          title = {isPlaying ? 'Pause' : 'Play'}
          accent
        />
        <CtrlBtn icon = {ChevronRight} onClick = {next} disabled = {!hasSteps || atEnd} title = "Step forward" />
        <CtrlBtn icon = {SkipForward} onClick = {jumpToEnd} disabled = {!hasSteps || atEnd} title = "Jump to end" />
      </div>

      {/* Speed selector */}
      <div className = "flex items-center gap-0.5 ml-1">
        {SPEEDS.map((s) => (
          <button
            key = {s}
            onClick = {() => setSpeed(s)}
            title = {`${s}x speed`}
            className = {cn(
              'font-mono text-[10px] px-1.5 py-0.5 rounded transition-colors duration-fast',
              speed === s
                ? 'text-brand-400 bg-brand-500/15'
                : 'text-slate-600 hover:text-slate-400',
            )}
          >
            {s}x
          </button>
        ))}
      </div>

    </div>
  )
}

function CtrlBtn({ icon: Icon, onClick, disabled, title, accent }) {
  return (
    <button
      onClick = {onClick}
      disabled = {disabled}
      title = {title}
      className = {cn(
        'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors duration-fast',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        accent
          ? 'bg-brand-500/20 border-brand-500/30 text-brand-400 hover:bg-brand-500/30 hover:border-brand-500/50'
          : 'bg-slate-800/50 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
      )}
    >
      <Icon size = {14} strokeWidth = {1.8} />
    </button>
  )
}
