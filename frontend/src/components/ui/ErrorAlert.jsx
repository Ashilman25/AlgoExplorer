import { AlertCircle, X } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * Inline error display for config panels and forms.
 *
 * Props:
 *  - message: string — primary error text
 *  - title: string (optional) — bold heading above the message
 *  - fields: { [fieldName]: string[] } (optional) — field-level validation errors
 *  - onDismiss: () => void (optional) — shows close button when provided
 *  - className: string (optional)
 */
export default function ErrorAlert({ message, title, fields, onDismiss, className }) {
  if (!message && !fields) return null

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg bg-rose-500/8 border border-rose-500/20 px-3 py-2.5 relative',
        className,
      )}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-0.5 text-slate-600 hover:text-slate-300 transition-colors rounded"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      )}

      <div className="flex gap-2">
        <AlertCircle size={14} strokeWidth={1.5} className="text-rose-400 shrink-0 mt-0.5" />

        <div className="min-w-0 space-y-1">
          {title && (
            <p className="text-xs font-semibold text-rose-300">{title}</p>
          )}

          {message && (
            <p className="text-[11px] font-mono text-rose-400/80 leading-relaxed">{message}</p>
          )}

          {fields && Object.keys(fields).length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {Object.entries(fields).map(([field, msgs]) => (
                <li key={field} className="text-[10px] font-mono text-rose-400/70 leading-relaxed">
                  {field !== '_root' && (
                    <span className="text-rose-300 font-semibold">{field}: </span>
                  )}
                  {msgs.join('; ')}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
