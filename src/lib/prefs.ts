import { useCallback, useEffect, useState } from 'react'
import type { ExportFormat } from './qr/render'

export type Theme = 'system' | 'light' | 'dark'

export interface Preferences {
  theme: Theme
  saveHistory: boolean
  exportFormat: ExportFormat
  exportSize: number
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  saveHistory: true,
  exportFormat: 'png',
  exportSize: 1024,
}

const KEY = 'qr-generator:prefs'

function read(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>
    return { ...DEFAULT_PREFERENCES, ...stored }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs))
    } catch {
      // Private mode or full storage. Preferences just won't persist.
    }
  }, [prefs])

  const update = useCallback((patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch })), [])
  return [prefs, update] as const
}

export function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#ffffff')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
