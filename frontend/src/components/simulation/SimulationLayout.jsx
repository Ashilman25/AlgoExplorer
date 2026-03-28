import { useState } from 'react'
import { Braces } from 'lucide-react'
import { cn } from '../../utils/cn'
import PlaybackBar from './PlaybackBar'
import StepInspector from './StepInspector'
import FloatingCodePanel from './FloatingCodePanel'
import { usePlaybackStore } from '../../stores/usePlaybackStore'
import { algorithmContent } from '../../content/algorithms'

export default function SimulationLayout({ configPanel, children, metrics, className, moduleKey, algorithmKey }) {
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false)
  const currentStep = usePlaybackStore((s) => s.currentStep)

  const contentKey = moduleKey && algorithmKey ? `${moduleKey}/${algorithmKey}` : null
  const content = contentKey ? algorithmContent[contentKey] || null : null
  const activeLines = currentStep?.state_payload?.pseudocode_lines || []

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

        {/* center — canvas (relative for floating panel positioning) */}
        <div className = "flex-1 flex flex-col rounded-xl border border-white/[0.07] bg-slate-800/30 overflow-hidden min-w-0 relative">
          {children}

          {/* Code panel toggle pill */}
          {!isCodePanelOpen && (
            <button
              onClick = {() => setIsCodePanelOpen(true)}
              className = {cn(
                'absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-medium',
                'bg-slate-800/80 backdrop-blur-sm border border-white/[0.10]',
                'text-slate-400 hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10',
                'transition-colors duration-150',
              )}
              title = "Show code panel"
            >
              <Braces size = {14} strokeWidth = {1.5} />
              Code
            </button>
          )}

          <FloatingCodePanel
            open = {isCodePanelOpen}
            onClose = {() => setIsCodePanelOpen(false)}
            content = {content}
            activeLines = {activeLines}
          />
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
