import { useCallback, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cx } from '../lib/cx'
import { ToastContext, type ToastKind } from './toast-context'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++nextId.current
    setToasts((current) => [...current.slice(-2), { id, kind, message }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg motion-safe:animate-[toast-in_150ms_ease-out]',
              toast.kind === 'success'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-red-600 text-white',
            )}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="size-4 shrink-0" aria-hidden />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
