import { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '../../utils/cn'

const ToastCtx = createContext(null)

const TYPE_CONFIG = {
  success: {Icon: CheckCircle2, iconColor: 'text-emerald-400', accent: 'bg-emerald-400'},
  error: {Icon: AlertCircle,  iconColor: 'text-rose-400', accent: 'bg-rose-400'},
  warning: {Icon: AlertTriangle,iconColor: 'text-amber-400', accent: 'bg-amber-400'},
  info: {Icon: Info, iconColor: 'text-brand-400', accent: 'bg-brand-400'},
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ type = 'info', title, message, duration = 4000 }) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, {id, type, title, message}])
      
      if (duration > 0) setTimeout(() => dismiss(id), duration)
    },
    [dismiss],
  )

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {createPortal(
        <div className = "fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[340px]">
          {toasts.map((t) => {
            const { Icon, iconColor, accent } = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.info

            return (
              <div
                key = {t.id}
                className = "relative flex items-start gap-3 rounded-xl p-3.5 overflow-hidden glass border border-subtle shadow-xl animate-enter"
              >

                <div className = {cn('absolute inset-y-0 left-0 w-0.5', accent)} />

                <div className = {cn('mt-0.5 shrink-0 ml-2', iconColor)}>
                  <Icon size = {15} strokeWidth = {1.5} />
                </div>

                <div className = "flex-1 min-w-0">
                  {t.title && (
                    <p className = "text-sm font-semibold text-primary leading-snug">{t.title}</p>
                  )}
                  {t.message && (
                    <p className = "text-xs text-muted mt-0.5 leading-relaxed">{t.message}</p>
                  )}
                </div>

                <button
                  onClick = {() => dismiss(t.id)}
                  className = "shrink-0 p-0.5 text-faint hover:text-secondary transition-colors duration-fast rounded"
                >
                  <X size = {13} strokeWidth = {1.5} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
