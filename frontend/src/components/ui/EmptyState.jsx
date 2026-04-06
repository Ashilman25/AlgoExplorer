import { cn } from '../../utils/cn'

export default function EmptyState({icon: Icon, title, description, action, className}) {
  return (
    <div className = {cn('flex flex-col items-center justify-center py-14 text-center', className)}>
      {Icon && (
        <div className = "p-3.5 rounded-2xl bg-hover border border-hairline mb-5">
          <Icon size = {22} strokeWidth = {1} className = "text-faint" />
        </div>
      )}

      <p className = "text-sm font-semibold text-muted mb-1">{title}</p>

      {description && (
        <p className = "text-xs text-faint max-w-xs leading-relaxed mb-5">{description}</p>
      )}

      {action}
    </div>
  )
}
