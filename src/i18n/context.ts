import { createContext, useContext } from 'react'
import { en } from './en'
import { ptBR } from './pt-BR'
import {
  DEFAULT_LOCALE,
  interpolate,
  isLocale,
  type Locale,
  type Message,
  type MessageKey,
  type Messages,
  type Params,
  type PluralBase,
} from './messages'

export const DICTIONARIES: Record<Locale, Messages> = { 'pt-BR': ptBR, en }

export const LOCALE_STORAGE_KEY = 'qr-generator:locale'

export function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : DEFAULT_LOCALE
  } catch {
    return DEFAULT_LOCALE
  }
}

export function createTranslator(locale: Locale) {
  const messages = DICTIONARIES[locale]
  const plural = new Intl.PluralRules(locale)
  const t = (key: MessageKey, params?: Params) => interpolate(messages[key], params, locale)
  return {
    t,
    /** Picks `<base>_one` or `<base>_other` for `count`, and passes `count` as a param. */
    tn: (base: PluralBase, count: number, params?: Params) =>
      t(`${base}_${plural.select(count) === 'one' ? 'one' : 'other'}` as MessageKey, { count, ...params }),
    tm: (message: Message) => t(message.key, message.params),
    formatDate: (timestamp: number) =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp),
  }
}

export type I18n = ReturnType<typeof createTranslator> & { locale: Locale; setLocale: (locale: Locale) => void }

export const I18nContext = createContext<I18n>({
  ...createTranslator(DEFAULT_LOCALE),
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
})

export function useI18n() {
  return useContext(I18nContext)
}
