import type { MessageKey, Params } from '../i18n/messages'
import { buildPayload, describe } from './payload/build'
import { DEFAULT_FIELDS, type AllFields, type ContentType } from './payload/types'

export type DemoOS = 'ios' | 'android'

export interface DeviceSignals {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
}

/** Passive browser hints only. Apple desktops use the iPhone illustration; other desktops use Android. */
export function inferDemoOS({ userAgent, platform = '', maxTouchPoints = 0 }: DeviceSignals): DemoOS {
  if (/android/i.test(userAgent)) return 'android'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  if (/Mac/i.test(platform) && maxTouchPoints > 1) return 'ios'
  return /Mac/i.test(`${platform} ${userAgent}`) ? 'ios' : 'android'
}

export const DEMO_OS_KEY = 'qr-generator:demo-os'

export function readDemoOS(): DemoOS {
  try {
    const stored = localStorage.getItem(DEMO_OS_KEY)
    if (stored === 'ios' || stored === 'android') return stored
  } catch {
    // The illustration still works when browser storage is unavailable.
  }
  return inferDemoOS(navigator)
}

type Translate = (key: MessageKey, params?: Params) => string

export function createDemoExample(type: ContentType, t: Translate) {
  const fields: AllFields = {
    ...DEFAULT_FIELDS,
    url: { url: 'https://markkop.dev' },
    text: { text: t('demo.sample.text') },
    wifi: { ssid: 'Studio Wi-Fi', password: 'just-an-example', encryption: 'WPA', hidden: false },
    email: { to: 'hello@example.com', subject: t('demo.sample.subject'), body: t('demo.sample.message') },
    phone: { number: '+1 202 555 0123' },
    sms: { number: '+1 202 555 0123', message: t('demo.sample.message') },
    contact: {
      ...DEFAULT_FIELDS.contact,
      firstName: 'Ana',
      lastName: 'Silva',
      organization: 'Studio',
      phone: '+1 202 555 0123',
      email: 'ana@example.com',
    },
    location: { latitude: '-23.5505', longitude: '-46.6333' },
  }
  const payload = buildPayload(type, fields[type]).payload
  if (!payload) throw new Error('The scan illustration needs a valid example.')
  return { fields, payload, title: type === 'location' ? 'São Paulo' : describe(type, fields[type]) }
}

export type DemoExample = ReturnType<typeof createDemoExample>
