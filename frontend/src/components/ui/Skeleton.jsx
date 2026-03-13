import { cn } from '../../utils/cn'

export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-800/80', className)}
      {...props}
    />
  )
}
