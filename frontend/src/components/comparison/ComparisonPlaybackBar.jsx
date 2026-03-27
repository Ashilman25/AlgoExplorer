// frontend/src/components/comparison/ComparisonPlaybackBar.jsx
import { useEffect } from 'react'
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from 'lucide-react'
import { cn } from '../../utils/cn'
import { useComparisonStore } from '../../stores/useComparisonStore'

const SPEEDS = [0.25, 0.5, 1, 2, 4]
const BASE_DELAY_MS = 700

export default function ComparisonPlaybackBar() {
  const stepIndex   = useComparisonStore((s) => s.stepIndex)
  const maxSteps    = useComparisonStore((s) => s.maxSteps)
  const isPlaying   = useComparisonStore((s) => s.isPlaying)
  const speed       = useComparisonStore((s) => s.speed)
  const isScrubbing = useComparisonStore((s) => s.isScrubbing)
  const { play, pause, next, prev, jumpToStart, jumpToEnd, jumpTo, setSpeed, beginScrub, endScrub } =
    useComparisonStore()

  const hasSteps = maxSteps > 0
  const atStart  = stepIndex === 0
  const atEnd    = stepIndex >= maxSteps - 1

  const scrubPct = maxSteps > 1 ? (stepIndex / (maxSteps - 1)) * 100 : 0

  useEffect(() => {
    if (!isPlaying || !hasSteps || isScrubbing) return
    const delay = Math.round(BASE_DELAY_MS / speed)
    const id = setInterval(() => {
      const s = useComparisonStore.getState()
      if (s.stepIndex >= s.maxSteps - 1) {
        s.pause()
      } else {
        s.next()
      }
    }, delay)
    return () => clearInterval(id)
  }, [isPlaying, speed, hasSteps, isScrubbing])

  return (
    <div className = "flex items-center gap-4 px-5 rounded-xl border border-state-source/20 bg-slate-900/80 h-[72px] flex-none">
      <span className = "mono-label whitespace-nowrap" style = {{ minWidth: '88px' }}>
        STEP {hasSteps ? stepIndex + 1 : '—'} / {hasSteps ? maxSteps : '—'}
      </span>

      <input
        type = "range"
        aria-label = "Timeline scrubber"
        min = {0}
        max = {Math.max(0, maxSteps - 1)}
        value = {stepIndex}
        disabled = {!hasSteps}
        onPointerDown = {() => hasSteps && beginScrub()}
        onPointerUp = {() => endScrub()}
        onChange = {(e) => jumpTo(Number(e.target.value))}
        className = "scrubber flex-1 min-w-0"
        style = {{ '--pct': `${scrubPct}%` }}
      />

      <div className = "flex items-center gap-1">
        <CtrlBtn icon = {SkipBack}     onClick = {jumpToStart} disabled = {!hasSteps || atStart} title = "Jump to start" />
        <CtrlBtn icon = {ChevronLeft}  onClick = {prev}        disabled = {!hasSteps || atStart} title = "Step back" />
        <CtrlBtn
          icon = {isPlaying ? Pause : Play}
          onClick = {isPlaying ? pause : play}
          disabled = {!hasSteps}
          title = {isPlaying ? 'Pause' : 'Play'}
          accent
        />
        <CtrlBtn icon = {ChevronRight} onClick = {next}        disabled = {!hasSteps || atEnd}   title = "Step forward" />
        <CtrlBtn icon = {SkipForward}  onClick = {jumpToEnd}   disabled = {!hasSteps || atEnd}   title = "Jump to end" />
      </div>

      <SpeedControl speed = {speed} setSpeed = {setSpeed} />
    </div>
  )
}

function SpeedControl({ speed, setSpeed }) {
  const speedIndex = SPEEDS.indexOf(speed)
  const safeIndex = speedIndex === -1 ? SPEEDS.indexOf(1) : speedIndex

  return (
    <div className = "flex flex-col justify-center gap-1.5 flex-none" style = {{ width: '76px' }}>
      <div className = "flex items-center justify-between">
        <span className = "mono-label">SPEED</span>
        <span className = "font-mono text-[11px] text-state-source font-medium leading-none">{speed}x</span>
      </div>
      <input
        type = "range"
        aria-label = "Playback speed"
        min = {0}
        max = {SPEEDS.length - 1}
        step = {1}
        value = {safeIndex}
        onChange = {(e) => setSpeed(SPEEDS[Number(e.target.value)])}
        className = "speed-slider"
        title = {`Playback speed: ${speed}×`}
      />
      <div className = "flex justify-between">
        <span className = "font-mono text-[8px] text-slate-700 leading-none">¼×</span>
        <span className = "font-mono text-[8px] text-slate-700 leading-none">1×</span>
        <span className = "font-mono text-[8px] text-slate-700 leading-none">4×</span>
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
      aria-label = {title}
      className = {cn(
        'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors duration-fast',
        'disabled:opacity-30 disabled:cursor-not-allowed',
        accent
          ? 'bg-state-source/20 border-state-source/30 text-state-source hover:bg-state-source/30 hover:border-state-source/50'
          : 'bg-slate-800/50 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
      )}
    >
      <Icon size = {14} strokeWidth = {1.8} />
    </button>
  )
}
