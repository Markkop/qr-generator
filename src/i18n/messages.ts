import { ptBR } from './pt-BR'

export type MessageKey = keyof typeof ptBR
export type Messages = Record<MessageKey, string>
export type Params = Record<string, string | number>

/** A translatable message. Library code returns these instead of display strings. */
export interface Message {
  key: MessageKey
  params?: Params
}

export type PluralBase = { [K in MessageKey]: K extends `${infer B}_one` ? B : never }[MessageKey]

export const LOCALES = [
  { code: 'pt-BR', label: 'Português' },
  { code: 'en', label: 'English' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

export const DEFAULT_LOCALE: Locale = 'pt-BR'

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.code === value)
}

export function interpolate(template: string, params: Params | undefined, locale: Locale): string {
  if (!params) return template
  const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    if (value === undefined) return match
    return typeof value === 'number' ? numbers.format(value) : value
  })
}
