import { cn } from '../../utils/cn'

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-surface', className)}
      {...props}
    />
  )
}
