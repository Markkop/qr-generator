import { Languages } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { isLocale, LOCALES } from '../i18n/messages'

export function LanguageSelect() {
  const { t, locale, setLocale } = useI18n()
  return (
    <label className="relative inline-flex h-8 items-center rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
      <Languages className="pointer-events-none absolute left-2 size-4" aria-hidden />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value)
        }}
        className="h-8 cursor-pointer appearance-none rounded-lg bg-transparent pr-2.5 pl-8 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
