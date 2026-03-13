import { cn } from '../../utils/cn'
import PlaybackBar from './PlaybackBar'
import StepInspector from './StepInspector'

export default function SimulationLayout({ configPanel, children, metrics, className }) {
  return (
    <div className = {cn('flex flex-col gap-3 animate-enter stagger-1', className)}>
      <div className = "flex gap-3" style={{ minHeight: '520px' }}>

        {/* left — configurations */}
        <div
          className = "flex flex-col rounded-xl border border-white/[0.07] bg-slate-800/50 overflow-hidden flex-none"
          style = {{width: '260px'}}
        >
          {configPanel}
        </div>

        {/* center — canvas */}
        <div className = "flex-1 flex flex-col rounded-xl border border-white/[0.07] bg-slate-800/30 overflow-hidden min-w-0">
          {children}
        </div>

        {/* right — step inspector */}
        <div
          className = "flex flex-col rounded-xl border border-white/[0.07] bg-slate-800/50 overflow-hidden flex-none"
          style = {{ width: '300px' }}
        >
          <StepInspector metrics = {metrics} />
        </div>

      </div>

      <PlaybackBar />

    </div>
  )
}
