import { useRef, useState, useEffect } from 'react'

const STATE_COLOR = {
  default:  'var(--color-state-default)',
  active:   'var(--color-state-active)',
  frontier: 'var(--color-state-frontier)',
  visited:  'var(--color-state-visited)',
  swap:     'var(--color-state-swap)',
  success:  'var(--color-state-success)',
  source:   'var(--color-state-source)',
  target:   'var(--color-state-target)',
}

function stateColor(s) { return STATE_COLOR[s] ?? STATE_COLOR.default }

export default function SortingRenderer({ currentStep, inputPayload }) {
  const { array: initialArray = [] } = inputPayload ?? {}

  const containerRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setCanvasSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const displayArray = currentStep?.state_payload?.array ?? initialArray
  const elementStates = currentStep?.state_payload?.element_states ?? displayArray.map(() => 'default')
  const comparing = currentStep?.state_payload?.comparing ?? []
  const swapping = currentStep?.state_payload?.swapping ?? []
  const pivotIndex = currentStep?.state_payload?.pivot_index ?? null

  const n = displayArray.length
  if (n === 0) {
    return (
      <div className = "w-full h-full flex items-center justify-center">
        <p className = "text-sm text-slate-500">No array data.</p>
      </div>
    )
  }

  let maxVal = displayArray[0]
  for (let i = 1; i < n; i++) { if (displayArray[i] > maxVal) maxVal = displayArray[i] }
  if (maxVal <= 0) maxVal = 1

  const pad = { top: 28, bottom: 32, left: 16, right: 16 }
  const chartW = canvasSize.w - pad.left - pad.right
  const chartH = canvasSize.h - pad.top - pad.bottom
  const totalGapRatio = 0.15
  const gapSize = n > 1 ? Math.max(1, (chartW * totalGapRatio) / (n - 1)) : 0
  const barW = n > 1 ? (chartW - gapSize * (n - 1)) / n : chartW * 0.3

  const showValues = barW >= 14
  const showIndices = barW >= 10

  const comparingSet = new Set(comparing)
  const swappingSet = new Set(swapping)

  return (
    <div ref = {containerRef} className = "w-full h-full min-h-0 overflow-hidden">
      <svg viewBox = {`0 0 ${canvasSize.w} ${canvasSize.h}`} className = "w-full h-full" style = {{ userSelect: 'none' }}>
        {displayArray.map((val, i) => {
          const state = elementStates[i] ?? 'default'
          const color = stateColor(state)
          const barH = Math.max(2, (val / maxVal) * chartH)
          const x = pad.left + i * (barW + gapSize)
          const y = pad.top + chartH - barH

          const isComparing = comparingSet.has(i)
          const isSwapping = swappingSet.has(i)
          const isPivot = pivotIndex === i

          return (
            <g key = {i}>
              {(isComparing || isSwapping || isPivot) && (
                <rect
                  x = {x - 2} y = {y - 2} width = {barW + 4} height = {barH + 4} rx = {3}
                  fill = {isPivot ? 'var(--color-state-source)' : color} opacity = {0.15}
                />
              )}

              <rect
                x = {x} y = {y} width = {Math.max(1, barW)} height = {barH}
                rx = {Math.min(2, barW / 4)} fill = {color}
                style = {{ transition: 'y 0.15s ease, height 0.15s ease, fill 0.2s ease' }}
              />

              {showValues && (
                <text
                  x = {x + barW / 2} y = {y - 5} textAnchor = "middle"
                  fill = {color} fontSize = {Math.min(10, barW * 0.6)}
                  fontFamily = "'IBM Plex Mono', monospace" fontWeight = "500"
                  style = {{ transition: 'fill 0.2s ease', pointerEvents: 'none' }}
                >
                  {val}
                </text>
              )}

              {showIndices && (
                <text
                  x = {x + barW / 2} y = {pad.top + chartH + 14} textAnchor = "middle"
                  fill = "rgba(100,116,139,0.5)" fontSize = {Math.min(8, barW * 0.5)}
                  fontFamily = "'IBM Plex Mono', monospace" fontWeight = "400"
                  style = {{ pointerEvents: 'none' }}
                >
                  {i}
                </text>
              )}

              {isPivot && (
                <polygon
                  points = {`${x + barW / 2 - 4},${pad.top + chartH + 24} ${x + barW / 2 + 4},${pad.top + chartH + 24} ${x + barW / 2},${pad.top + chartH + 18}`}
                  fill = "var(--color-state-source)" opacity = {0.8}
                  style = {{ pointerEvents: 'none' }}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
