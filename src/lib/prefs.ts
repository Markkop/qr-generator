import { useCallback, useEffect, useState } from 'react'
import type { ExportFormat } from './qr/render'

export type Theme = 'light' | 'dark'

export interface Preferences {
  theme: Theme
  saveHistory: boolean
  exportFormat: ExportFormat
  exportSize: number
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  saveHistory: true,
  exportFormat: 'png',
  exportSize: 1024,
}

const KEY = 'qr-generator:prefs'

function read(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>
    return { ...DEFAULT_PREFERENCES, ...stored, theme: stored.theme === 'dark' ? 'dark' : 'light' }
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
    const dark = theme === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#f7f4ef')
  }, [theme])
}
