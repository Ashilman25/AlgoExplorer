import { cn } from '../../utils/cn'

export default function SectionHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 mb-4', className)}>
      <div>
        <h2 className="text-[10px] font-semibold tracking-widest uppercase text-slate-600">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
