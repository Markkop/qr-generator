import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createTranslator, I18nContext, LOCALE_STORAGE_KEY, readStoredLocale } from './context'
import type { Locale } from './messages'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale)
  const value = useMemo(() => ({ ...createTranslator(locale), locale, setLocale }), [locale])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = value.t('app.documentTitle')
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Private mode or full storage. The choice just won't persist.
    }
  }, [locale, value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
