import { useEffect, useRef, useState } from 'react'

export type ActionState = 'idle' | 'pending' | 'success' | 'error'
export type ButtonAction = () => void | boolean | Promise<void | boolean>

export function useActionFeedback() {
  const [state, setState] = useState<ActionState>('idle')
  const busy = useRef(false)
  const mounted = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      clearTimeout(timer.current)
    }
  }, [])

  const run = async (action: ButtonAction) => {
    if (busy.current) return
    busy.current = true
    clearTimeout(timer.current)
    setState('pending')
    let next: ActionState
    try {
      // Invoke immediately: clipboard and share APIs need the original user gesture.
      next = (await action()) === false ? 'idle' : 'success'
    } catch {
      next = 'error'
    } finally {
      busy.current = false
    }
    if (!mounted.current) return
    setState(next)
    if (next !== 'idle') timer.current = setTimeout(() => setState('idle'), next === 'error' ? 3500 : 2000)
  }

  return { state, run }
}
