import { cn } from '../../utils/cn'

/**
 *   <ConfigPanel title="Sorting Lab">
 *     <ConfigSection title="Algorithm"> … </ConfigSection>
 *     <ConfigSection title="Input">     … </ConfigSection>
 *   </ConfigPanel>
 */
export default function ConfigPanel({title = 'Configuration', header, children, footer, className}) {
  return (
    <>
      {header ?? <div className = "panel-header shrink-0">{title}</div>}
      <div className = {cn('flex-1 overflow-y-auto min-h-0 p-4 space-y-5', className)}>
        {children}
      </div>
      {footer && (
        <div className = "shrink-0 border-t border-hairline bg-surface p-3">
          {footer}
        </div>
      )}
    </>
  )
}

export function ModeToggle({ mode, onChange }) {
  const isGrid = mode === 'grid'
  return (
    <div className = "shrink-0 flex items-center justify-center px-3 py-2 border-b border-hairline">
      <div className = "relative flex w-full bg-base rounded-lg p-[3px] border border-hairline">
        <div
          className = {cn(
            'absolute top-[3px] h-[calc(100%-6px)] w-[calc(50%-3px)] rounded-md bg-brand-500/15 border border-brand-500/30 transition-[left] duration-200',
            isGrid ? 'left-[calc(50%+1px)]' : 'left-[3px]'
          )}
        />
        <button
          type = "button"
          className = {cn(
            'flex-1 relative z-10 py-[7px] text-xs font-semibold tracking-wide bg-transparent border-none cursor-pointer',
            !isGrid ? 'text-brand-400' : 'text-muted'
          )}
          onClick = {() => onChange('graph')}
        >
          Graph
        </button>
        <button
          type = "button"
          className = {cn(
            'flex-1 relative z-10 py-[7px] text-xs font-semibold tracking-wide bg-transparent border-none cursor-pointer',
            isGrid ? 'text-brand-400' : 'text-muted'
          )}
          onClick = {() => onChange('grid')}
        >
          Grid
        </button>
      </div>
    </div>
  )
}

export function ConfigSection({title, children, className}) {
  return (
    <div className = {cn('space-y-3', className)}>
      {title && (
        <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
