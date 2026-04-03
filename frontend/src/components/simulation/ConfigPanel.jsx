import { cn } from '../../utils/cn'

/**
 *   <ConfigPanel title="Sorting Lab">
 *     <ConfigSection title="Algorithm"> … </ConfigSection>
 *     <ConfigSection title="Input">     … </ConfigSection>
 *   </ConfigPanel>
 */
export default function ConfigPanel({title = 'Configuration', children, footer, className}) {
  return (
    <>
      <div className = "panel-header shrink-0">{title}</div>
      <div className = {cn('flex-1 overflow-y-auto min-h-0 p-4 space-y-5', className)}>
        {children}
      </div>
      {footer && (
        <div className = "shrink-0 border-t border-white/[0.06] bg-slate-800/80 p-3">
          {footer}
        </div>
      )}
    </>
  )
}

export function ConfigSection({title, children, className}) {
  return (
    <div className = {cn('space-y-3', className)}>
      {title && (
        <p className = "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
