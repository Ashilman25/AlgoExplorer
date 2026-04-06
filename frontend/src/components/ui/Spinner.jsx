import { cn } from '../../utils/cn'

const SIZES = {
  sm: 'w-3.5 h-3.5 border-[1.5px]',
  md: 'w-5 h-5 border-2',
  lg: 'w-7 h-7 border-2',
}

export default function Spinner({ size = 'md', className }) {
  return (
    <div
      className = {cn(
        'rounded-full border-default border-t-brand-400 animate-spin',
        SIZES[size],
        className,
      )}
    />
  )
}
