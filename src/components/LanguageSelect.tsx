import { Languages } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { isLocale, LOCALES } from '../i18n/messages'

export function LanguageSelect() {
  const { t, locale, setLocale } = useI18n()
  return (
    <label className="relative inline-flex h-11 items-center rounded-lg px-3.5 text-zinc-700 hover:bg-zinc-100 sm:px-0 dark:text-zinc-300 dark:hover:bg-zinc-800">
      <Languages className="pointer-events-none size-4 shrink-0 sm:absolute sm:left-2" aria-hidden />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) setLocale(e.target.value)
        }}
        className="h-11 cursor-pointer appearance-none bg-transparent text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 max-sm:absolute max-sm:inset-0 max-sm:w-full max-sm:opacity-0 sm:rounded-lg sm:pr-2.5 sm:pl-8"
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
