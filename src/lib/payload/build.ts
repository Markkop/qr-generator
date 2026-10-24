import type { Message, MessageKey } from '../../i18n/messages'
import type { ContentType, FieldsByType } from './types'

export interface BuildResult {
  /** Null while required fields are missing or a field is invalid. */
  payload: string | null
  errors: Record<string, Message>
  warnings: Message[]
  /** Shown in the preview while there is nothing to encode yet. */
  hint?: Message
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Escapes `\ ; , : "` for the WIFI: and MECARD-style formats. One pass, so backslashes are never doubled twice. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

/** RFC 6350 text escaping for vCard values. */
export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  return SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function normalizePhone(input: string): string {
  return input.trim().replace(/[^\d+*#]/g, '')
}

/** Shortest plain decimal (never exponent notation, which geo: parsers reject). */
export function formatCoordinate(value: number): string {
  return value.toFixed(7).replace(/\.?0+$/, '')
}

const msg = (key: MessageKey): Message => ({ key })

function result(payload: string | null, extra: Partial<BuildResult> = {}): BuildResult {
  return { payload, errors: {}, warnings: [], ...extra }
}

function buildUrl({ url }: FieldsByType['url']): BuildResult {
  const normalized = normalizeUrl(url)
  if (!normalized) return result(null, { hint: msg('hint.url') })
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return result(null, { errors: { url: msg('error.url') } })
  }
  const warnings: Message[] = []
  if (parsed.protocol === 'http:') {
    warnings.push(msg('warn.http'))
  }
  if (
    (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
    !parsed.hostname.includes('.') &&
    parsed.hostname !== 'localhost'
  ) {
    warnings.push(msg('warn.noDot'))
  }
  return result(normalized, { warnings })
}

function buildText({ text }: FieldsByType['text']): BuildResult {
  if (!text) return result(null, { hint: msg('hint.text') })
  return result(text)
}

function buildWifi({ ssid, password, encryption, hidden }: FieldsByType['wifi']): BuildResult {
  if (!ssid) return result(null, { hint: msg('hint.wifiSsid') })
  const errors: Record<string, Message> = {}
  if (encryption !== 'nopass' && !password) {
    return result(null, { hint: msg('hint.wifiPassword') })
  }
  if (encryption === 'WPA' && password.length > 0 && (password.length < 8 || password.length > 63)) {
    errors.password = msg('error.wpaLength')
  }
  if (Object.keys(errors).length) return result(null, { errors })
  const parts = [`T:${encryption}`, `S:${escapeWifi(ssid)}`]
  if (encryption !== 'nopass') parts.push(`P:${escapeWifi(password)}`)
  if (hidden) parts.push('H:true')
  return result(`WIFI:${parts.join(';')};;`)
}

function buildEmail({ to, subject, body }: FieldsByType['email']): BuildResult {
  const address = to.trim()
  if (!address) return result(null, { hint: msg('hint.email') })
  if (!EMAIL_RE.test(address)) {
    return result(null, { errors: { to: msg('error.email') } })
  }
  const query = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean)
  return result(`mailto:${address}${query.length ? `?${query.join('&')}` : ''}`)
}

function phoneWarnings(number: string): Message[] {
  return number.startsWith('+') ? [] : [msg('warn.countryCode')]
}

function buildPhone({ number }: FieldsByType['phone']): BuildResult {
  const normalized = normalizePhone(number)
  if (!normalized) return result(null, { hint: msg('hint.phone') })
  if (normalized.replace(/\D/g, '').length < 3) {
    return result(null, { errors: { number: msg('error.phoneShort') } })
  }
  return result(`tel:${normalized}`, { warnings: phoneWarnings(normalized) })
}

function buildSms({ number, message }: FieldsByType['sms']): BuildResult {
  const normalized = normalizePhone(number)
  if (!normalized) return result(null, { hint: msg('hint.sms') })
  if (normalized.replace(/\D/g, '').length < 3) {
    return result(null, { errors: { number: msg('error.phoneShort') } })
  }
  return result(`SMSTO:${normalized}:${message}`, { warnings: phoneWarnings(normalized) })
}

function buildContact(f: FieldsByType['contact']): BuildResult {
  const first = f.firstName.trim()
  const last = f.lastName.trim()
  const org = f.organization.trim()
  const fullName = [first, last].filter(Boolean).join(' ') || org
  if (!fullName) return result(null, { hint: msg('hint.contact') })

  const errors: Record<string, Message> = {}
  if (f.email.trim() && !EMAIL_RE.test(f.email.trim())) errors.email = msg('error.email')
  if (Object.keys(errors).length) return result(null, { errors })

  const e = escapeVCard
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${e(last)};${e(first)};;;`, `FN:${e(fullName)}`]
  if (org) lines.push(`ORG:${e(org)}`)
  if (f.title.trim()) lines.push(`TITLE:${e(f.title.trim())}`)
  if (f.phone.trim()) lines.push(`TEL;TYPE=CELL:${e(f.phone.trim())}`)
  if (f.email.trim()) lines.push(`EMAIL:${e(f.email.trim())}`)
  if (f.website.trim()) lines.push(`URL:${e(normalizeUrl(f.website))}`)
  const address = [f.street, f.city, f.region, f.postcode, f.country].map((part) => e(part.trim()))
  if (address.some(Boolean)) lines.push(`ADR:;;${address.join(';')}`)
  if (f.note.trim()) lines.push(`NOTE:${e(f.note.trim())}`)
  lines.push('END:VCARD')
  return result(lines.join('\r\n'))
}

function buildLocation({ latitude, longitude }: FieldsByType['location']): BuildResult {
  if (!latitude.trim() || !longitude.trim()) {
    return result(null, { hint: msg('hint.location') })
  }
  const lat = Number(latitude.replace(',', '.'))
  const lon = Number(longitude.replace(',', '.'))
  const errors: Record<string, Message> = {}
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.latitude = msg('error.latitude')
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.longitude = msg('error.longitude')
  if (errors.latitude && Number.isFinite(lat) && Math.abs(lat) <= 180 && Math.abs(lon) <= 90) {
    errors.latitude = msg('error.latitudeSwapped')
  }
  if (Object.keys(errors).length) return result(null, { errors })
  return result(`geo:${formatCoordinate(lat)},${formatCoordinate(lon)}`)
}

export function buildPayload<T extends ContentType>(type: T, fields: FieldsByType[T]): BuildResult {
  switch (type) {
    case 'url':
      return buildUrl(fields as FieldsByType['url'])
    case 'text':
      return buildText(fields as FieldsByType['text'])
    case 'wifi':
      return buildWifi(fields as FieldsByType['wifi'])
    case 'email':
      return buildEmail(fields as FieldsByType['email'])
    case 'phone':
      return buildPhone(fields as FieldsByType['phone'])
    case 'sms':
      return buildSms(fields as FieldsByType['sms'])
    case 'contact':
      return buildContact(fields as FieldsByType['contact'])
    case 'location':
      return buildLocation(fields as FieldsByType['location'])
    default:
      throw new Error(`Unknown content type: ${type satisfies never}`)
  }
}

/** Short, non-sensitive description for history entries and file names. Never includes passwords. */
export function describe<T extends ContentType>(type: T, fields: FieldsByType[T]): string {
  switch (type) {
    case 'url':
      return normalizeUrl((fields as FieldsByType['url']).url).replace(/^https?:\/\//, '')
    case 'text':
      return (fields as FieldsByType['text']).text.split('\n')[0]
    case 'wifi':
      return (fields as FieldsByType['wifi']).ssid
    case 'email':
      return (fields as FieldsByType['email']).to.trim()
    case 'phone':
      return (fields as FieldsByType['phone']).number.trim()
    case 'sms':
      return (fields as FieldsByType['sms']).number.trim()
    case 'contact': {
      const c = fields as FieldsByType['contact']
      return (
        [c.firstName, c.lastName]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(' ') || c.organization.trim()
      )
    }
    case 'location': {
      const l = fields as FieldsByType['location']
      return `${l.latitude.trim()}, ${l.longitude.trim()}`
    }
    default:
      throw new Error(`Unknown content type: ${type satisfies never}`)
  }
}
