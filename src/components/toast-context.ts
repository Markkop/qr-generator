import { createContext, useContext } from 'react'

export type ToastKind = 'success' | 'error'

export const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}
