import { cn } from '../../utils/cn'

export default function EmptyState({icon: Icon, title, description, action, className}) {
  return (
    <div className = {cn('flex flex-col items-center justify-center py-14 text-center', className)}>
      {Icon && (
        <div className = "p-3.5 rounded-2xl bg-slate-800/70 border border-white/[0.07] mb-5">
          <Icon size = {22} strokeWidth = {1} className = "text-slate-600" />
        </div>
      )}

      <p className = "text-sm font-semibold text-slate-400 mb-1">{title}</p>

      {description && (
        <p className = "text-xs text-slate-600 max-w-xs leading-relaxed mb-5">{description}</p>
      )}

      {action}
    </div>
  )
}
