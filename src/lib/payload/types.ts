export const CONTENT_TYPES = ['url', 'text', 'wifi', 'email', 'phone', 'sms', 'contact', 'location'] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export type WifiEncryption = 'WPA' | 'WEP' | 'nopass'

export interface FieldsByType {
  url: { url: string }
  text: { text: string }
  wifi: { ssid: string; password: string; encryption: WifiEncryption; hidden: boolean }
  email: { to: string; subject: string; body: string }
  phone: { number: string }
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
}

export type Fields<T extends ContentType = ContentType> = FieldsByType[T]

export type AllFields = { [T in ContentType]: FieldsByType[T] }

export const DEFAULT_FIELDS: AllFields = {
  url: { url: '' },
  text: { text: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
  email: { to: '', subject: '', body: '' },
  phone: { number: '' },
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
}

export const TYPE_LABELS: Record<ContentType, string> = {
  url: 'URL',
  text: 'Text',
  wifi: 'Wi-Fi',
  email: 'Email',
  phone: 'Phone',
  sms: 'SMS',
  contact: 'Contact',
  location: 'Location',
}
