import { useEffect } from 'react'
import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from 'lucide-react'
import { cn } from '../../utils/cn'
import { usePlaybackStore } from '../../stores/usePlaybackStore'

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16]
const BASE_DELAY_MS = 700   // ms per step at 1× speed

export const GRID_TIMING_CONFIG = {
  baseDelay: 150,
  eventWeights: {
    INITIALIZE:  2.5,
    PATH_FOUND:  2.5,
    COMPLETE:    2.5,
    DEQUEUE:     1.0,
    POP:         1.0,
    POP_MIN:     1.0,
    ENQUEUE:     0.4,
    PUSH:        0.4,
    RELAX:       0.4,
    NO_RELAX:    0.4,
    BACKTRACK:   0.4,
  },
}

function computeStepDelay(step, timingConfig, speed) {
  if (!timingConfig) return Math.round(BASE_DELAY_MS / speed)
  const weight = timingConfig.eventWeights[step?.event_type] ?? 1.0
  return Math.round((timingConfig.baseDelay / speed) * weight)
}

export default function PlaybackBar() {
  const stepIndex = usePlaybackStore((s) => s.stepIndex)
  const totalSteps = usePlaybackStore((s) => s.totalSteps)
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const speed = usePlaybackStore((s) => s.speed)
  const isScrubbing = usePlaybackStore((s) => s.isScrubbing)
  const timingConfig = usePlaybackStore((s) => s.timingConfig)
  const {play, pause, next, prev, jumpToStart, jumpToEnd, jumpTo, setSpeed, beginScrub, endScrub} = usePlaybackStore()

  const hasSteps = totalSteps > 0
  const atStart = stepIndex === 0
  const atEnd = stepIndex >= totalSteps - 1

  //percent of scrub bar
  const scrubPct = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 0

  //auto play scrub
  useEffect(() => {
    if (!isPlaying || !hasSteps || isScrubbing) return

    let timerId = null

    function scheduleTick() {
      const s = usePlaybackStore.getState()
      const delay = computeStepDelay(s.currentStep, timingConfig, speed)

      timerId = setTimeout(() => {
        const s = usePlaybackStore.getState()
        if (s.stepIndex >= s.totalSteps - 1) {
          s.pause()
          return
        }
        s.next()
        const after = usePlaybackStore.getState()
        if (after.stepIndex >= after.totalSteps - 1) {
          after.pause()
        } else {
          scheduleTick()
        }
      }, delay)
    }

    scheduleTick()

    return () => { if (timerId != null) clearTimeout(timerId) }
  }, [isPlaying, speed, hasSteps, isScrubbing, timingConfig])

  return (
    <div className = "flex items-center gap-4 px-5 rounded-xl border border-white/[0.07] bg-slate-900/80 h-[72px] flex-none">

      {/* Step counter */}
      <span className = "mono-label whitespace-nowrap" style = {{ minWidth: '88px' }}>
        STEP {hasSteps ? stepIndex + 1 : '—'} / {hasSteps ? totalSteps : '—'}
      </span>

      {/* Scrubber */}
      <input
        type = "range"
        aria-label = "Timeline scrubber"
        min = {0}
        max = {Math.max(0, totalSteps - 1)}
        value = {stepIndex}
        disabled = {!hasSteps}
        onPointerDown = {() => hasSteps && beginScrub()}
        onPointerUp = {() => endScrub()}
        onChange = {(e) => jumpTo(Number(e.target.value))}
        className = "scrubber flex-1 min-w-0"
        style = {{'--pct': `${scrubPct}%`}}
      />

      {/* Transport controls */}
      <div className = "flex items-center gap-1">
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

      {/* Speed slider */}
      <SpeedControl speed = {speed} setSpeed = {setSpeed} />

    </div>
  )
}

//speed slider

function SpeedControl({ speed, setSpeed }) {
  const speedIndex = SPEEDS.indexOf(speed)

  const safeIndex  = speedIndex === -1 ? SPEEDS.indexOf(1) : speedIndex

  return (
    <div className = "flex flex-col justify-center gap-1.5 flex-none" style = {{ width: '96px' }}>
      <div className = "flex items-center justify-between">
        <span className = "mono-label">SPEED</span>
        <span className = "font-mono text-[11px] text-brand-400 font-medium leading-none">
          {speed}x
        </span>
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

      {/* tick labels aligned to slider stops */}
      <div className = "flex justify-between">
        {SPEEDS.map((s, i) => {
          const label = s === 0.25 ? '¼×' : s === 1 ? '1×' : s === 4 ? '4×' : s === 16 ? '16×' : null
          return (
            <span key = {i} className = "font-mono text-[8px] text-slate-700 leading-none text-center" style = {{ width: 0, overflow: 'visible' }}>
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

//transport buttons

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
          ? 'bg-brand-500/20 border-brand-500/30 text-brand-400 hover:bg-brand-500/30 hover:border-brand-500/50'
          : 'bg-slate-800/50 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
      )}
    >
      <Icon size = {14} strokeWidth = {1.8} />
    </button>
  )
}
