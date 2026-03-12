export default function LabShell({algorithms = [], canvasLabel, canvasNote}) {
  return (
    <div className = "flex flex-col gap-3 animate-enter stagger-1">

      {/* top row (canvas and inspector) */}
      <div className = "flex gap-3" style = {{minHeight: '480px'}}>

        {/* visualization canvas */}
        <div className = "flex-1 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.10] bg-slate-800/30 text-center p-8">
          <p className = "text-sm font-medium text-slate-500">
            {canvasLabel}
          </p>

          {canvasNote && (
            <p className = "text-xs text-slate-600 max-w-xs leading-relaxed">
              {canvasNote}
            </p>
          )}

          {algorithms.length > 0 && (
            <div className = "flex gap-2 mt-1">
              {algorithms.map(alg => (
                <span
                  key = {alg}
                  className = "text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-white/[0.06]"
                >
                  {alg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* step inspector panel */}
        <div
          className = "flex flex-col rounded-xl border border-white/[0.07] bg-slate-800/50 overflow-hidden"
          style = {{width: '300px'}}
        >

          {/* Panel header */}
          <div className = "panel-header shrink-0">
            Step Inspector
          </div>

          {/* Empty state */}
          <div className = "flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className = "text-xs text-slate-600 leading-relaxed">
              Step details, highlighted entities, and explanation text will appear here during playback.
            </p>
          </div>

          {/* Metrics stub */}
          <div className = "shrink-0 p-3 border-t border-white/[0.07] space-y-2">
            {['Nodes visited', 'Steps total', 'Path length'].map(label => (
              <div key = {label} className = "metric-card flex items-center justify-between py-2 px-3">
                <span className = "mono-label">{label}</span>
                <span className = "mono-value text-sm text-slate-600">-</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* playback controls */}
      <div
        className = "flex items-center gap-4 px-5 rounded-xl border border-white/[0.07] bg-slate-900/80"
        style = {{height: '72px'}}
      >
        {/* Step counter */}
        <span className = "mono-label whitespace-nowrap">
          STEP — / —
        </span>

        {/* Fake scrubber */}
        <div className = "flex-1 h-1 rounded-full bg-slate-700/60" />

        {/* Control button stubs */}
        {['⏮', '⏪', '⏸', '⏩', '⏭'].map(sym => (
          <button
            key = {sym}
            disabled
            className = "w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 text-sm bg-slate-800/50 border border-white/[0.06] cursor-not-allowed"
          >
            {sym}
          </button>
        ))}

        {/* Speed */}
        <span className = "mono-label whitespace-nowrap ml-1">1x</span>
      </div>
    </div>
  )
}