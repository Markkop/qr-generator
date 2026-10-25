import { describe, expect, it } from 'vitest'
import { createTranslator } from '../i18n/context'
import { CONTENT_TYPES } from './payload/types'
import { createDemoExample, inferDemoOS } from './device-preview'

describe('passive demo device inference', () => {
  it.each([
    [{ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)' }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel', maxTouchPoints: 5 }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel' }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10)' }, 'android'],
    [{ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' }, 'android'],
    [{ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64' }, 'android'],
    [{ userAgent: '' }, 'android'],
  ] as const)('chooses the expected illustration from %o', (signals, expected) => {
    expect(inferDemoOS(signals)).toBe(expected)
  })
})

describe('illustration examples', () => {
  it.each(['pt-BR', 'en'] as const)('provides valid, fictional payloads for every type in %s', (locale) => {
    const { t } = createTranslator(locale)
    const expectedPrefixes = {
      url: 'https://markkop.dev',
      text: t('demo.sample.text'),
      wifi: 'WIFI:T:WPA;S:Studio Wi-Fi;',
      email: 'mailto:hello@example.com?',
      phone: 'tel:+12025550123',
      whatsapp: 'https://wa.me/5511912345678?text=',
      sms: 'SMSTO:+12025550123:',
      contact: 'BEGIN:VCARD\r\nVERSION:3.0',
      location: 'geo:-23.5505,-46.6333',
      pix: '000201',
      calendar: 'BEGIN:VCALENDAR\r\nVERSION:2.0',
      telegram: 'https://t.me/ana_example?text=',
    }
    for (const type of CONTENT_TYPES) {
      const example = createDemoExample(type, t)
      expect(example.payload.startsWith(expectedPrefixes[type]), type).toBe(true)
      expect(example.title.length, type).toBeGreaterThan(0)
    }
  })
})
