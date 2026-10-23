import { describe as group, expect, it } from 'vitest'
import { buildPayload, describe, escapeVCard, escapeWifi, formatCoordinate, normalizeUrl } from './build'
import { DEFAULT_FIELDS } from './types'

group('escapeWifi', () => {
  it('escapes every special character once', () => {
    expect(escapeWifi('Cafe; Wifi')).toBe('Cafe\\; Wifi')
    expect(escapeWifi('p:w,d\\1')).toBe('p\\:w\\,d\\\\1')
    expect(escapeWifi('"quoted"')).toBe('\\"quoted\\"')
  })
})

group('escapeVCard', () => {
  it('escapes backslash, semicolon, comma and newlines', () => {
    expect(escapeVCard('Analytical Engine, Ltd')).toBe('Analytical Engine\\, Ltd')
    expect(escapeVCard('a;b\\c\nd\r\ne')).toBe('a\\;b\\\\c\\nd\\ne')
  })
})

group('url', () => {
  it('adds https:// when the scheme is missing', () => {
    expect(normalizeUrl(' example.com/path ')).toBe('https://example.com/path')
    expect(buildPayload('url', { url: 'example.com' }).payload).toBe('https://example.com')
  })

  it('keeps existing schemes', () => {
    expect(normalizeUrl('ftp://files.example.com')).toBe('ftp://files.example.com')
    expect(normalizeUrl('HTTPS://Example.com')).toBe('HTTPS://Example.com')
  })

  it('warns on http and missing dots', () => {
    expect(buildPayload('url', { url: 'http://example.com' }).warnings).toHaveLength(1)
    expect(buildPayload('url', { url: 'intranet' }).warnings[0]).toMatch(/no dot/)
  })

  it('returns a hint while empty', () => {
    const result = buildPayload('url', { url: '' })
    expect(result.payload).toBeNull()
    expect(result.hint).toBeTruthy()
  })

  it('flags invalid URLs', () => {
    expect(buildPayload('url', { url: 'https://exa mple.com' }).errors.url).toBeTruthy()
  })
})

group('text', () => {
  it('passes text through untouched, including unicode and newlines', () => {
    expect(buildPayload('text', { text: 'Olá 👋\nline two' }).payload).toBe('Olá 👋\nline two')
  })
})

group('wifi', () => {
  const base = DEFAULT_FIELDS.wifi

  it('builds a WPA payload with escaping', () => {
    expect(buildPayload('wifi', { ...base, ssid: 'Cafe; Wifi', password: 'p:w,d\\1xyz' }).payload).toBe(
      'WIFI:T:WPA;S:Cafe\\; Wifi;P:p\\:w\\,d\\\\1xyz;;',
    )
  })

  it('omits the password for open networks', () => {
    expect(buildPayload('wifi', { ...base, ssid: 'Guest', password: 'ignored', encryption: 'nopass' }).payload).toBe(
      'WIFI:T:nopass;S:Guest;;',
    )
  })

  it('marks hidden networks', () => {
    expect(buildPayload('wifi', { ...base, ssid: 'Lab', password: '12345678', hidden: true }).payload).toBe(
      'WIFI:T:WPA;S:Lab;P:12345678;H:true;;',
    )
  })

  it('validates WPA password length', () => {
    expect(buildPayload('wifi', { ...base, ssid: 'Lab', password: 'short' }).errors.password).toBeTruthy()
    expect(buildPayload('wifi', { ...base, ssid: 'Lab', password: 'short', encryption: 'WEP' }).payload).toBe(
      'WIFI:T:WEP;S:Lab;P:short;;',
    )
  })

  it('never describes a network with its password', () => {
    expect(describe('wifi', { ...base, ssid: 'Home', password: 'supersecret' })).toBe('Home')
  })
})

group('email', () => {
  it('builds mailto with percent-encoded query', () => {
    expect(buildPayload('email', { to: 'ada@example.com', subject: 'Hello there', body: 'Hi & bye' }).payload).toBe(
      'mailto:ada@example.com?subject=Hello%20there&body=Hi%20%26%20bye',
    )
  })

  it('omits the query when empty', () => {
    expect(buildPayload('email', { to: 'ada@example.com', subject: '', body: '' }).payload).toBe(
      'mailto:ada@example.com',
    )
  })

  it('rejects malformed addresses', () => {
    expect(buildPayload('email', { to: 'nope', subject: '', body: '' }).errors.to).toBeTruthy()
  })
})

group('phone and sms', () => {
  it('strips formatting from numbers', () => {
    expect(buildPayload('phone', { number: '+1 (555) 123-4567' }).payload).toBe('tel:+15551234567')
  })

  it('nudges toward international format', () => {
    expect(buildPayload('phone', { number: '555 1234' }).warnings).toHaveLength(1)
    expect(buildPayload('phone', { number: '+55 11 91234 5678' }).warnings).toHaveLength(0)
  })

  it('builds SMSTO with a raw message', () => {
    expect(buildPayload('sms', { number: '+1 555 123 4567', message: 'on my way: 5 min' }).payload).toBe(
      'SMSTO:+15551234567:on my way: 5 min',
    )
  })
})

group('contact', () => {
  const base = DEFAULT_FIELDS.contact

  it('builds a vCard 3.0 with CRLF and only filled fields', () => {
    const payload = buildPayload('contact', {
      ...base,
      firstName: 'Ada',
      lastName: 'Lovelace',
      organization: 'Analytical Engine, Ltd',
    }).payload
    expect(payload).toBe(
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'N:Lovelace;Ada;;;',
        'FN:Ada Lovelace',
        'ORG:Analytical Engine\\, Ltd',
        'END:VCARD',
      ].join('\r\n'),
    )
  })

  it('falls back to the organization for the display name', () => {
    expect(buildPayload('contact', { ...base, organization: 'Acme' }).payload).toContain('FN:Acme')
  })

  it('includes address, phone, email, website and note', () => {
    const payload = buildPayload('contact', {
      ...base,
      firstName: 'Ada',
      phone: '+44 20 1234',
      email: 'ada@example.com',
      website: 'example.com',
      street: '1 Main St',
      city: 'London',
      country: 'UK',
      note: 'line1\nline2',
    }).payload!
    expect(payload).toContain('TEL;TYPE=CELL:+44 20 1234')
    expect(payload).toContain('EMAIL:ada@example.com')
    expect(payload).toContain('URL:https://example.com')
    expect(payload).toContain('ADR:;;1 Main St;London;;;UK')
    expect(payload).toContain('NOTE:line1\\nline2')
  })
})

group('location', () => {
  it('builds geo: with plain decimals', () => {
    expect(buildPayload('location', { latitude: '-23.5505', longitude: '-46.6333' }).payload).toBe(
      'geo:-23.5505,-46.6333',
    )
    expect(formatCoordinate(0.0000001)).toBe('0.0000001')
    expect(formatCoordinate(10)).toBe('10')
  })

  it('accepts comma decimals', () => {
    expect(buildPayload('location', { latitude: '40,5', longitude: '-3,7' }).payload).toBe('geo:40.5,-3.7')
  })

  it('detects swapped coordinates', () => {
    expect(buildPayload('location', { latitude: '-122.08', longitude: '37.42' }).errors.latitude).toMatch(/swapped/)
  })
})
