import { useRef, useEffect } from 'react'
import { usePlaybackStore } from '../../stores/usePlaybackStore'

const CELL_SIZE = 48
const CELL_BASE = 'flex flex-col items-center justify-center font-mono text-xs tabular-nums transition-all duration-150'

const CELL_STATE_CLASSES = {
  default:  `${CELL_BASE} border border-hairline text-faint`,
  active:   `${CELL_BASE} border-2 border-state-active   bg-state-active/20   text-state-active`,
  frontier: `${CELL_BASE} border-2 border-state-frontier bg-state-frontier/15 text-state-frontier`,
  visited:  `${CELL_BASE} border border-state-visited/20  bg-state-visited/10  text-state-visited`,
  success:  `${CELL_BASE} border border-state-success/30  bg-state-success/15  text-state-success`,
  source:   `${CELL_BASE} border border-state-source/30   bg-state-source/15   text-state-source`,
  target:   `${CELL_BASE} border border-state-target/30   bg-state-target/15   text-state-target`,
}

const GLOW = {
  active:   '0 0 8px rgba(34,211,238,0.35), inset 0 0 6px rgba(34,211,238,0.12)',
  frontier: '0 0 6px rgba(251,191,36,0.3)',
}


export default function DpStripCanvas({ showCoinUsed = false, previewLength = 0 }) {
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const isLoading   = usePlaybackStore((s) => s.isLoading)

  const activeCellRef = useRef(null)

  const timelineArray   = currentStep?.state_payload?.array ?? null
  const cellStates      = currentStep?.state_payload?.cell_states ?? null
  const currentIndex    = currentStep?.state_payload?.current_index ?? null
  const dependencyIdx   = currentStep?.state_payload?.dependency_indices ?? []
  const coinsUsed       = currentStep?.state_payload?.coins_used ?? []
  const tracebackPath   = currentStep?.state_payload?.traceback_path ?? []
  const rawExp           = currentStep?.explanation ?? null
  const explanation      = typeof rawExp === 'string' ? rawExp : rawExp?.body ?? rawExp?.text ?? rawExp?.title ?? null
  const eventType        = currentStep?.event_type ?? null

  const array = timelineArray ?? (previewLength > 0 ? Array(previewLength).fill(null) : null)

  useEffect(() => {
    activeCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [currentIndex])

  if (!array || array.length === 0) {
    return (
      <div className = "flex-1 flex items-center justify-center">
        <p className = "text-sm text-muted">No array data.</p>
      </div>
    )
  }

  const len = array.length
  const tracebackSet = new Set(tracebackPath)
  const gridWidth = CELL_SIZE * len

  return (
    <div className = "flex-1 flex flex-col min-h-0 relative">

      {isLoading && (
        <div className = "absolute inset-0 flex items-center justify-center bg-base z-10">
          <div className = "flex flex-col items-center gap-3">
            <div className = "w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <p className = "text-xs text-muted font-mono">Running simulation...</p>
          </div>
        </div>
      )}

      <div className = "flex-1 overflow-auto min-h-0 p-4">
        <div className = "inline-block" style = {{ minWidth: gridWidth }}>

          {/* index labels */}
          <div className = "flex" style = {{ gap: 0 }}>
            {array.map((_, idx) => (
              <div
                key = {`idx-${idx}`}
                className = "flex items-center justify-center font-mono text-[10px] text-faint"
                style = {{ width: CELL_SIZE, height: 20 }}
              >
                {idx}
              </div>
            ))}
          </div>

          {/* cells */}
          <div className = "flex" style = {{ gap: 0 }}>
            {array.map((val, idx) => {
              const state    = cellStates?.[idx] ?? 'default'
              const isActive = idx === currentIndex
              const isDep    = dependencyIdx.includes(idx)
              const effectiveState = isActive ? 'active' : isDep ? 'frontier' : state
              const cls      = CELL_STATE_CLASSES[effectiveState] ?? CELL_STATE_CLASSES.default
              const glow     = isActive ? GLOW.active : isDep ? GLOW.frontier : undefined

              return (
                <div
                  key = {`cell-${idx}`}
                  ref = {isActive ? activeCellRef : undefined}
                  className = {cls}
                  style = {{ width: CELL_SIZE, height: CELL_SIZE, boxShadow: glow }}
                >
                  {val != null ? val : ''}
                </div>
              )
            })}
          </div>

          {/* coin used labels (for Coin Change) */}
          {showCoinUsed && (
            <div className = "flex" style = {{ gap: 0 }}>
              {coinsUsed.map((coin, idx) => (
                <div
                  key = {`coin-${idx}`}
                  className = {`flex items-center justify-center font-mono text-[10px] ${
                    tracebackSet.has(idx) ? 'text-state-success font-semibold' : 'text-faint'
                  }`}
                  style = {{ width: CELL_SIZE, height: 20 }}
                >
                  {coin != null ? `+${coin}` : ''}
                </div>
              ))}
            </div>
          )}

          {/* dependency arrows SVG overlay */}
          {currentIndex != null && dependencyIdx.length > 0 && (
            <svg
              className = "pointer-events-none"
              width = {gridWidth}
              height = {30}
              style = {{ marginTop: 4 }}
            >
              {dependencyIdx.map((depIdx) => {
                const fromX = depIdx * CELL_SIZE + CELL_SIZE / 2
                const toX   = currentIndex * CELL_SIZE + CELL_SIZE / 2
                const midY  = 15
                return (
                  <path
                    key = {`arr-${depIdx}`}
                    d = {`M ${fromX} 2 Q ${(fromX + toX) / 2} ${midY + 10} ${toX} 2`}
                    fill = "none"
                    stroke = "var(--color-state-frontier)"
                    strokeWidth = {1.5}
                    strokeOpacity = {0.5}
                    strokeDasharray = "4 2"
                  />
                )
              })}
            </svg>
          )}

        </div>
      </div>

      {/* explanation panel */}
      <div className = "shrink-0 border-t border-hairline px-4 py-3 space-y-2 overflow-x-auto min-h-[40px]">
        {currentIndex != null && (
          <div className = "flex items-center gap-2">
            <span className = "mono-label shrink-0">Index</span>
            <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-active bg-state-active/10 border-state-active/30">
              {currentIndex}
            </span>
            {eventType && (
              <span className = "font-mono text-[10px] px-1.5 py-0.5 rounded border text-state-source bg-state-source/10 border-state-source/30">
                {eventType}
              </span>
            )}
          </div>
        )}
        {explanation && (
          <p className = "text-xs text-muted leading-relaxed">{explanation}</p>
        )}
      </div>

    </div>
  )
}
