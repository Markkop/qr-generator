import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createTranslator, I18nContext, LOCALE_STORAGE_KEY, readStoredLocale } from './context'
import type { Locale } from './messages'

function setMeta(selector: string, content: string) {
  document.head.querySelector(selector)?.setAttribute('content', content)
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readStoredLocale)
  const value = useMemo(() => ({ ...createTranslator(locale), locale, setLocale }), [locale])

  useEffect(() => {
    document.documentElement.lang = locale
    const title = value.t('app.documentTitle')
    const description = value.t('app.metaDescription')
    document.title = title
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[property="og:locale"]', locale === 'pt-BR' ? 'pt_BR' : 'en_US')
    setMeta('meta[property="og:locale:alternate"]', locale === 'pt-BR' ? 'en_US' : 'pt_BR')
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Private mode or full storage. The choice just won't persist.
    }
  }, [locale, value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
