import { cn } from '../../utils/cn'

export default function Card({ title, headerRight, children, className, bodyClassName, ...props }) {
  return (
    <div className = {cn('panel', className)} {...props}>
      {title && (
        <div className = "panel-header flex items-center justify-between">
          <span>{title}</span>
          {headerRight && <div className = "flex items-center gap-2">{headerRight}</div>}
        </div>
      )}
      <div className = {bodyClassName}>{children}</div>
    </div>
  )
}
