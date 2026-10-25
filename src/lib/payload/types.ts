export const CONTENT_TYPES = [
  'url',
  'text',
  'wifi',
  'email',
  'phone',
  'whatsapp',
  'sms',
  'contact',
  'location',
  'pix',
  'calendar',
  'telegram',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass'
export const PIX_KEY_TYPES = ['email', 'phone', 'cpf', 'cnpj', 'random'] as const
export type PixKeyType = (typeof PIX_KEY_TYPES)[number]

export interface FieldsByType {
  url: { url: string }
  text: { text: string }
  wifi: { ssid: string; password: string; encryption: WifiEncryption; hidden: boolean }
  email: { to: string; subject: string; body: string }
  phone: { number: string }
  whatsapp: { number: string; message: string }
  sms: { number: string; message: string }
  contact: {
    firstName: string
    lastName: string
    organization: string
    title: string
    phone: string
    email: string
    website: string
    street: string
    city: string
    region: string
    postcode: string
    country: string
    note: string
  }
  location: { latitude: string; longitude: string }
  pix: { keyType: PixKeyType; key: string; name: string; city: string; amount: string; txid: string }
  calendar: {
    title: string
    start: string
    end: string
    allDay: boolean
    timeZone: string
    location: string
    description: string
    createdAt: string
  }
  telegram: { username: string; message: string }
}

export type Fields<T extends ContentType = ContentType> = FieldsByType[T]

export type AllFields = { [T in ContentType]: FieldsByType[T] }

export const DEFAULT_FIELDS: AllFields = {
  url: { url: '' },
  text: { text: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
  email: { to: '', subject: '', body: '' },
  phone: { number: '' },
  whatsapp: { number: '', message: '' },
  sms: { number: '', message: '' },
  contact: {
    firstName: '',
    lastName: '',
    organization: '',
    title: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    region: '',
    postcode: '',
    country: '',
    note: '',
  },
  location: { latitude: '', longitude: '' },
  pix: { keyType: 'email', key: '', name: '', city: '', amount: '', txid: '' },
  calendar: {
    title: '',
    start: '',
    end: '',
    allDay: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    location: '',
    description: '',
    createdAt: new Date().toISOString(),
  },
  telegram: { username: '', message: '' },
}

export function typeLabelKey<T extends ContentType>(type: T) {
  return `type.${type}` as const
}
