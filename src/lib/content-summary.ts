import type { I18n } from '../i18n/context'
import type { MessageKey } from '../i18n/messages'
import { formatCoordinate, normalizeTelegramUsername } from './payload/build'
import { normalizePixAmount, normalizePixKey } from './payload/pix'
import type { ContentType, FieldsByType } from './payload/types'

export interface SummaryDetail {
  label: string
  value: string
  sensitive?: boolean
}

export interface ContentSummary {
  title?: string
  subtitle?: string
  body?: string
  details: SummaryDetail[]
}

export function contentSummary<T extends ContentType>(
  type: T,
  fields: FieldsByType[T],
  { t, locale }: Pick<I18n, 't' | 'locale'>,
): ContentSummary | null {
  const details: SummaryDetail[] = []
  const add = (key: MessageKey, value: string, sensitive = false) => {
    if (sensitive ? value : value.trim())
      details.push({ label: t(key), value: sensitive ? value : value.trim(), sensitive })
  }
  switch (type) {
    case 'url':
      return null
    case 'text': {
      const { text } = fields as FieldsByType['text']
      return text.trim() ? { body: text, details } : null
    }
    case 'wifi': {
      const f = fields as FieldsByType['wifi']
      add(
        'wifi.security',
        t(f.encryption === 'nopass' ? 'wifi.nopass' : f.encryption === 'WEP' ? 'wifi.wep' : 'wifi.wpa'),
      )
      if (f.encryption !== 'nopass') add('wifi.password', f.password, true)
      if (f.hidden) add('wifi.hidden', t('summary.yes'))
      return { title: f.ssid, details }
    }
    case 'email': {
      const f = fields as FieldsByType['email']
      add('summary.subject', f.subject)
      add('summary.message', f.body)
      return { title: f.to.trim(), details }
    }
    case 'phone':
      return { title: (fields as FieldsByType['phone']).number.trim(), details }
    case 'whatsapp':
    case 'sms': {
      const f = fields as FieldsByType['sms']
      add('summary.message', f.message)
      return { title: f.number.trim(), details }
    }
    case 'contact': {
      const f = fields as FieldsByType['contact']
      const name = [f.firstName.trim(), f.lastName.trim()].filter(Boolean).join(' ')
      add('contact.phone', f.phone)
      add('contact.email', f.email)
      add('contact.website', f.website)
      add(
        'contact.street',
        [f.street, [f.city, f.region, f.postcode].filter(Boolean).join(' · '), f.country].filter(Boolean).join('\n'),
      )
      add('contact.note', f.note)
      return {
        title: name || f.organization.trim(),
        subtitle: [f.title.trim(), name && f.organization.trim()].filter(Boolean).join(' · '),
        details,
      }
    }
    case 'location': {
      const f = fields as FieldsByType['location']
      const latitude = Number(f.latitude.replace(',', '.'))
      const longitude = Number(f.longitude.replace(',', '.'))
      return { title: `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`, details }
    }
    case 'pix': {
      const f = fields as FieldsByType['pix']
      add('pix.keyType', t(`pix.keyType.${f.keyType}`))
      add('pix.key', normalizePixKey(f.keyType, f.key) || f.key)
      const amount = normalizePixAmount(f.amount)
      if (amount)
        add(
          'summary.amount',
          new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(Number(amount)),
        )
      add('summary.reference', f.txid)
      return { title: f.name.trim(), subtitle: f.city.trim(), details }
    }
    case 'calendar': {
      const f = fields as FieldsByType['calendar']
      const formatter = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        ...(!f.allDay && { timeStyle: 'short' }),
        timeZone: 'UTC',
      })
      const date = (value: string) => formatter.format(new Date(`${value}${f.allDay ? 'T00:00:00' : ':00'}Z`))
      add('calendar.start', date(f.start))
      add('calendar.end', date(f.end))
      if (f.allDay) add('calendar.allDay', t('summary.yes'))
      else add('calendar.timeZone', f.timeZone)
      add('summary.description', f.description)
      return { title: f.title.trim(), subtitle: f.location.trim(), details }
    }
    case 'telegram': {
      const f = fields as FieldsByType['telegram']
      add('summary.message', f.message)
      return { title: `@${normalizeTelegramUsername(f.username)}`, details }
    }
    default:
      return null
  }
}
