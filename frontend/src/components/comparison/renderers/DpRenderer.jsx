import { useRef, useEffect } from 'react'

const CELL_SIZE = 36

const STATE_COLOR = {
  success: 'var(--color-state-success)',
}

const CELL_BASE = 'flex items-center justify-center font-mono text-xs tabular-nums transition-all duration-150'

const CELL_STATE_CLASSES = {
  default:  `${CELL_BASE} border border-white/[0.04] text-slate-600`,
  active:   `${CELL_BASE} border-2 border-state-active   bg-state-active/20   text-state-active`,
  frontier: `${CELL_BASE} border-2 border-state-frontier bg-state-frontier/15 text-state-frontier`,
  visited:  `${CELL_BASE} border border-state-visited/20  bg-state-visited/10  text-state-visited`,
  swap:     `${CELL_BASE} border border-state-swap/30     bg-state-swap/15     text-state-swap`,
  success:  `${CELL_BASE} border border-state-success/30  bg-state-success/15  text-state-success`,
  source:   `${CELL_BASE} border border-state-source/30   bg-state-source/15   text-state-source`,
  target:   `${CELL_BASE} border border-state-target/30   bg-state-target/15   text-state-target`,
}

const GLOW = {
  active:   '0 0 8px rgba(34,211,238,0.35), inset 0 0 6px rgba(34,211,238,0.12)',
  frontier: '0 0 6px rgba(251,191,36,0.3)',
}

const HEADER_CELL = 'flex items-center justify-center bg-slate-800/80 border border-white/[0.06] font-mono text-xs font-semibold text-slate-400 select-none'

// ── Layout Detection ──────────────────────────────────────────────────

function detectLayout(currentStep, inputPayload) {
  const sp = currentStep?.state_payload
  if (!sp) return 'none'

  if (sp.table && Array.isArray(sp.table)) {
    if (inputPayload?.items) return 'table_knapsack'
    return 'table_string'
  }

  if (sp.array && Array.isArray(sp.array)) {
    return 'strip'
  }

  return 'none'
}

// ── Main Component ────────────────────────────────────────────────────

export default function DpRenderer({ currentStep, inputPayload }) {
  const layout = detectLayout(currentStep, inputPayload)

  if (layout === 'table_string')   return <TableStringLayout   currentStep = {currentStep} inputPayload = {inputPayload} />
  if (layout === 'table_knapsack') return <TableKnapsackLayout currentStep = {currentStep} inputPayload = {inputPayload} />
  if (layout === 'strip')          return <StripLayout          currentStep = {currentStep} inputPayload = {inputPayload} />

  return null
}

// ── 2D String Table (LCS, Edit Distance) ──────────────────────────────

function TableStringLayout({ currentStep, inputPayload }) {
  const { string1 = '', string2 = '' } = inputPayload ?? {}
  const rowHeaders = ['\u03b5', ...string1.split('')]
  const colHeaders = ['\u03b5', ...string2.split('')]
  const cornerLabel = <>{`A\u2193 B\u2192`}</>

  return (
    <TableGrid
      currentStep = {currentStep}
      rowHeaders = {rowHeaders}
      colHeaders = {colHeaders}
      cornerLabel = {cornerLabel}
    />
  )
}

// ── 2D Knapsack Table ─────────────────────────────────────────────────

function TableKnapsackLayout({ currentStep, inputPayload }) {
  const items    = inputPayload?.items ?? []
  const capacity = inputPayload?.capacity ?? 0

  const rowHeaders = ['0', ...items.map((_, i) => `Item ${i + 1}`)]
  const colHeaders = Array.from({ length: capacity + 1 }, (_, j) => String(j))
  const cornerLabel = <>{`Item\u2193 Cap\u2192`}</>

  return (
    <TableGrid
      currentStep = {currentStep}
      rowHeaders = {rowHeaders}
      colHeaders = {colHeaders}
      cornerLabel = {cornerLabel}
    />
  )
}

// ── Shared 2D Table Grid ──────────────────────────────────────────────

function TableGrid({ currentStep, rowHeaders, colHeaders, cornerLabel }) {
  const activeCellRef = useRef(null)

  const table         = currentStep?.state_payload?.table ?? null
  const cellStates    = currentStep?.state_payload?.cell_states ?? null
  const currentCell   = currentStep?.state_payload?.current_cell ?? null
  const tracebackPath = currentStep?.state_payload?.traceback_path ?? []

  const activeRow = currentCell?.[0] ?? null
  const activeCol = currentCell?.[1] ?? null

  useEffect(() => {
    activeCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activeRow, activeCol])

  if (!table || table.length === 0) {
    return (
      <div className = "w-full h-full flex items-center justify-center">
        <p className = "text-sm text-slate-500">No table data yet.</p>
      </div>
    )
  }

  const rows = table.length
  const cols = table[0]?.length ?? 0

  const gridWidth  = CELL_SIZE * (cols + 1)
  const gridHeight = CELL_SIZE * (rows + 1)

  return (
    <div className = "w-full h-full overflow-auto min-h-0 p-2">
      <div className = "relative inline-block" style = {{ minWidth: gridWidth, minHeight: gridHeight }}>
        <div
          style = {{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols + 1}, ${CELL_SIZE}px)`,
            gridTemplateRows:    `repeat(${rows + 1}, ${CELL_SIZE}px)`,
          }}
        >
          {/* corner */}
          <div className = {HEADER_CELL} style = {{ fontSize: 9, color: 'var(--color-slate-600, #475569)' }}>
            {cornerLabel}
          </div>

          {/* column headers */}
          {colHeaders.map((ch, j) => (
            <div key = {`ch-${j}`} className = {HEADER_CELL}>{ch}</div>
          ))}

          {/* rows */}
          {table.map((row, i) => [
            <div key = {`rh-${i}`} className = {HEADER_CELL}>{rowHeaders[i]}</div>,
            ...row.map((val, j) => {
              const state    = cellStates?.[i]?.[j] ?? 'default'
              const isActive = state === 'active'
              const isDep    = state === 'frontier'
              const cls      = CELL_STATE_CLASSES[state] ?? CELL_STATE_CLASSES.default
              const glow     = isActive ? GLOW.active : isDep ? GLOW.frontier : undefined

              return (
                <div
                  key = {`c-${i}-${j}`}
                  ref = {isActive ? activeCellRef : undefined}
                  className = {cls}
                  style = {glow ? { boxShadow: glow } : undefined}
                >
                  {val != null ? val : ''}
                </div>
              )
            }),
          ])}
        </div>

        {/* traceback overlay */}
        {tracebackPath.length > 1 && (
          <svg
            className = "absolute top-0 left-0 pointer-events-none"
            width = {gridWidth} height = {gridHeight}
            style = {{ zIndex: 5 }}
          >
            {tracebackPath.map(([ci, cj], idx) => {
              if (idx === 0) return null
              const [pi, pj] = tracebackPath[idx - 1]
              return (
                <line
                  key = {`tl-${idx}`}
                  x1 = {(pj + 1) * CELL_SIZE + CELL_SIZE / 2}
                  y1 = {(pi + 1) * CELL_SIZE + CELL_SIZE / 2}
                  x2 = {(cj + 1) * CELL_SIZE + CELL_SIZE / 2}
                  y2 = {(ci + 1) * CELL_SIZE + CELL_SIZE / 2}
                  stroke = {STATE_COLOR.success} strokeWidth = {2}
                  strokeOpacity = {0.55} strokeLinecap = "round"
                />
              )
            })}
            {tracebackPath.map(([ci, cj], idx) => (
              <circle
                key = {`td-${idx}`}
                cx = {(cj + 1) * CELL_SIZE + CELL_SIZE / 2}
                cy = {(ci + 1) * CELL_SIZE + CELL_SIZE / 2}
                r = {3} fill = {STATE_COLOR.success} fillOpacity = {0.8}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  )
}

// ── 1D Strip (Coin Change, Fibonacci tabulation) ──────────────────────

function StripLayout({ currentStep }) {
  const activeCellRef = useRef(null)

  const array       = currentStep?.state_payload?.array ?? []
  const cellStates  = currentStep?.state_payload?.cell_states ?? []
  const currentIdx  = currentStep?.state_payload?.current_index ?? null
  const coinsUsed   = currentStep?.state_payload?.coins_used ?? null

  useEffect(() => {
    activeCellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [currentIdx])

  if (array.length === 0) {
    return (
      <div className = "w-full h-full flex items-center justify-center">
        <p className = "text-sm text-slate-500">No array data yet.</p>
      </div>
    )
  }

  return (
    <div className = "w-full h-full overflow-x-auto min-h-0 p-2">
      <div className = "inline-flex flex-col gap-0.5">
        {/* index labels */}
        <div className = "flex">
          {array.map((_, i) => (
            <div
              key = {`idx-${i}`}
              className = "font-mono text-[9px] text-slate-600 text-center select-none"
              style = {{ width: CELL_SIZE }}
            >
              {i}
            </div>
          ))}
        </div>

        {/* cells */}
        <div className = "flex">
          {array.map((val, i) => {
            const state    = cellStates[i] ?? 'default'
            const isActive = state === 'active'
            const isDep    = state === 'frontier'
            const cls      = CELL_STATE_CLASSES[state] ?? CELL_STATE_CLASSES.default
            const glow     = isActive ? GLOW.active : isDep ? GLOW.frontier : undefined

            return (
              <div
                key = {`s-${i}`}
                ref = {isActive ? activeCellRef : undefined}
                className = {cls}
                style = {{ width: CELL_SIZE, height: CELL_SIZE, ...(glow ? { boxShadow: glow } : {}) }}
              >
                {val != null ? val : ''}
              </div>
            )
          })}
        </div>

        {/* coin-used labels (Coin Change only) */}
        {coinsUsed && (
          <div className = "flex">
            {coinsUsed.map((coin, i) => (
              <div
                key = {`cu-${i}`}
                className = "font-mono text-[9px] text-state-source/70 text-center select-none"
                style = {{ width: CELL_SIZE }}
              >
                {coin != null ? `+${coin}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
