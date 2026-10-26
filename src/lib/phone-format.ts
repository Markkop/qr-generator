import examples from 'libphonenumber-js/mobile/examples'
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export type PhoneCountry = CountryCode

const COUNTRIES = new Set<string>(getCountries())

export function isPhoneCountry(value: string): value is PhoneCountry {
  return COUNTRIES.has(value)
}

export function normalizeCountry(value: string | undefined): PhoneCountry {
  const code = (value || '').toUpperCase()
  return isPhoneCountry(code) ? code : 'BR'
}

/** First supported region in the locale list, otherwise Brazil. */
export function detectPhoneCountry(locales: readonly string[]): PhoneCountry {
  for (const tag of locales) {
    let region: string | undefined
    try {
      region = new Intl.Locale(tag).region
    } catch {
      region = tag.match(/(?:^|[-_])([A-Za-z]{2})(?:$|[-_])/)?.[1]
    }
    if (region && isPhoneCountry(region.toUpperCase())) return region.toUpperCase() as PhoneCountry
  }
  return 'BR'
}

export function detectDefaultCountry(): PhoneCountry {
  if (typeof navigator === 'undefined') return 'BR'
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language]
  return detectPhoneCountry(locales.filter(Boolean))
}

export function phoneCountryOptions(locale: string): { code: PhoneCountry; label: string }[] {
  const names = new Intl.DisplayNames([locale, 'en'], { type: 'region' })
  return getCountries()
    .map((code) => {
      const name = names.of(code) ?? code
      const flag = [...code].map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0))).join('')
      return { code, name, label: `${flag} ${name} (+${getCountryCallingCode(code)})` }
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale))
    .map(({ code, label }) => ({ code, label }))
}

export function phonePlaceholder(country: string): string {
  return getExampleNumber(normalizeCountry(country), examples)?.formatNational() ?? ''
}

export interface ResolvedWhatsapp {
  country: PhoneCountry
  digits: string
  display: string
}

function explicitInternational(input: string) {
  const compact = input.trim().replace(/[\s().-]/g, '')
  if (!compact.startsWith('+') && !compact.startsWith('00')) return undefined
  const parsed = parsePhoneNumberFromString(compact.startsWith('+') ? compact : `+${compact.slice(2)}`)
  if (!parsed?.country || !parsed.nationalNumber) return null
  return parsed
}

/** National digits, plus the selected country's calling code. A pasted +number keeps its own country. */
export function resolveWhatsapp(country: string | undefined, input: string): ResolvedWhatsapp | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const explicit = explicitInternational(trimmed)
  if (explicit === null) return null
  if (explicit?.country) {
    const digits = explicit.number.replace(/^\+/, '')
    if (digits.length < 8 || digits.length > 15) return null
    return { country: explicit.country, digits, display: explicit.formatNational() }
  }

  const selected = normalizeCountry(country)
  const calling = getCountryCallingCode(selected)
  const parsed = parsePhoneNumberFromString(trimmed, selected)
  const recognized = parsed?.isValid() && parsed.countryCallingCode === calling && parsed.nationalNumber ? parsed : null
  const national = recognized ? recognized.nationalNumber : trimmed.replace(/\D/g, '')
  if (!national) return null
  const digits = `${calling}${national}`
  if (digits.length < 8 || digits.length > 15) return null
  const display = recognized ? recognized.formatNational() : new AsYouType(selected).input(national) || national
  return { country: selected, digits, display }
}

export function nationalDigitsForEdit(input: string, country: string): string {
  const explicit = explicitInternational(input)
  if (explicit?.nationalNumber) return explicit.nationalNumber
  const selected = normalizeCountry(country)
  const parsed = parsePhoneNumberFromString(input.trim(), selected)
  if (parsed?.isValid() && parsed.countryCallingCode === getCountryCallingCode(selected) && parsed.nationalNumber) {
    return parsed.nationalNumber
  }
  return input.replace(/\D/g, '')
}

export function formatNationalInput(country: string, nationalDigits: string): string {
  if (!nationalDigits) return ''
  const selected = normalizeCountry(country)
  const parsed = parsePhoneNumberFromString(nationalDigits, selected)
  if (
    parsed?.isValid() &&
    parsed.countryCallingCode === getCountryCallingCode(selected) &&
    parsed.nationalNumber === nationalDigits
  ) {
    return parsed.formatNational()
  }
  return new AsYouType(selected).input(nationalDigits)
}

export function withCountry(
  nextCountry: string,
  currentCountry: string,
  number: string,
): { country: PhoneCountry; number: string } {
  const country = normalizeCountry(nextCountry)
  return { country, number: formatNationalInput(country, nationalDigitsForEdit(number, currentCountry)) }
}

/** A complete pasted +number, rewritten as that country's national format. */
export function internationalEntry(input: string): { country: PhoneCountry; number: string } | null {
  const parsed = explicitInternational(input)
  if (!parsed?.isValid() || !parsed.country) return null
  return { country: parsed.country, number: parsed.formatNational() }
}
