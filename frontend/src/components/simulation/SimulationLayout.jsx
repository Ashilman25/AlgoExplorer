import { useState, useEffect } from 'react'
import { Braces } from 'lucide-react'
import { cn } from '../../utils/cn'
import PlaybackBar from './PlaybackBar'
import StepInspector from './StepInspector'
import FloatingCodePanel from './FloatingCodePanel'
import ResizeHandle from './ResizeHandle'
import { usePlaybackStore } from '../../stores/usePlaybackStore'
import { useMetadataStore } from '../../stores/useMetadataStore'
import { metadataService } from '../../services'
import { algorithmContent } from '../../content/algorithms'
import { useResizablePanel } from '../../hooks/useResizablePanel'

export default function SimulationLayout({ configPanel, children, metrics, className, moduleKey, algorithmKey, explanationLevel }) {
  const [isCodePanelOpen, setIsCodePanelOpen] = useState(false)
  const currentStep = usePlaybackStore((s) => s.currentStep)
  const setMetadata = useMetadataStore((s) => s.setMetadata)

  useEffect(() => {
    const { algorithms } = useMetadataStore.getState()
    if (Object.keys(algorithms).length > 0) return

    metadataService.getModules().then((data) => {
      const modules = data.modules || []
      const algsByModule = {}
      const presetsByModule = {}

      for (const mod of modules) {
        algsByModule[mod.key] = mod.algorithms || []
        if (mod.presets) presetsByModule[mod.key] = mod.presets
      }

      setMetadata({ modules, algorithms: algsByModule, presets: presetsByModule })
    }).catch(() => {})
  }, [setMetadata])

  const { leftWidth, rightWidth, containerRef, leftHandleProps, rightHandleProps } = useResizablePanel(moduleKey)

  const contentKey = moduleKey && algorithmKey ? `${moduleKey}/${algorithmKey}` : null
  const content = contentKey ? algorithmContent[contentKey] || null : null
  const activeLines = currentStep?.state_payload?.pseudocode_lines || []

  return (
    <div className = {cn('flex flex-col gap-3 h-[calc(100vh-170px)] min-h-[520px] animate-enter stagger-1', className)}>
      <div className = "flex flex-1 min-h-0" ref = {containerRef}>

        {/* left — configurations */}
        <div
          className = "flex flex-col rounded-xl border border-hairline bg-surface-translucent overflow-hidden flex-none"
          style = {{ width: leftWidth }}
        >
          {configPanel}
        </div>

        <ResizeHandle {...leftHandleProps} side = "left" />

        {/* center — canvas (relative for floating panel positioning) */}
        <div className = "flex-1 flex flex-col rounded-xl border border-hairline bg-surface-dim overflow-hidden min-w-0 relative">
          {children}

          {/* Code panel toggle pill */}
          {!isCodePanelOpen && (
            <button
              onClick = {() => setIsCodePanelOpen(true)}
              className = {cn(
                'absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-medium',
                'bg-surface backdrop-blur-sm border border-subtle',
                'text-muted hover:text-brand-400 hover:border-brand-500/30 hover:bg-brand-500/10',
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

        <ResizeHandle {...rightHandleProps} side = "right" />

        {/* right — step inspector */}
        <div
          className = "flex flex-col rounded-xl border border-hairline bg-surface-translucent overflow-hidden flex-none"
          style = {{ width: rightWidth }}
        >
          <StepInspector metrics = {metrics} moduleKey = {moduleKey} algorithmKey = {algorithmKey} explanationLevel = {explanationLevel} />
        </div>

      </div>

      <PlaybackBar />

    </div>
  )
}
