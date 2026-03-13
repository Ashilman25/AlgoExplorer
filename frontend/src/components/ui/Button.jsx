import { cn } from '../../utils/cn'

const VARIANTS = {
  primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold hover:shadow-glow-brand',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium border border-white/[0.08]',
  ghost: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
  danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-medium border border-rose-500/20',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className = {cn(
        'inline-flex items-center justify-center transition-colors duration-fast',
        VARIANTS[variant],
        SIZES[size],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 15} strokeWidth = {1.5} />}
      {children}
      {IconRight && <IconRight size={size === 'sm' ? 13 : 15} strokeWidth = {1.5} />}
    </button>
  )
}
