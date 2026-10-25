import { describe, expect, it } from 'vitest'
import { createTranslator } from '../i18n/context'
import { contentSummary } from './content-summary'
import { DEFAULT_FIELDS } from './payload/types'

const pt = { ...createTranslator('pt-BR'), locale: 'pt-BR' as const }
const en = { ...createTranslator('en'), locale: 'en' as const }

describe('content summaries', () => {
  it('combines all contact details without QR encoding syntax', () => {
    const card = contentSummary(
      'contact',
      {
        firstName: 'Ana',
        lastName: 'Silva',
        organization: 'Studio',
        title: 'Designer',
        phone: '+55 11 91234 5678',
        email: 'ana@example.com',
        website: 'example.com',
        street: 'Rua Um, 10',
        city: 'São Paulo',
        region: 'SP',
        postcode: '01000-000',
        country: 'Brasil',
        note: 'Olá\nAté breve',
      },
      pt,
    )!
    expect(card.title).toBe('Ana Silva')
    expect(card.subtitle).toBe('Designer · Studio')
    expect(card.details.map(({ value }) => value)).toEqual([
      '+55 11 91234 5678',
      'ana@example.com',
      'example.com',
      'Rua Um, 10\nSão Paulo · SP · 01000-000\nBrasil',
      'Olá\nAté breve',
    ])
  })
  it('marks Wi-Fi passwords as sensitive without changing their content', () => {
    const card = contentSummary(
      'wifi',
      { ssid: 'Studio', password: ' secret pass ', encryption: 'WPA', hidden: true },
      pt,
    )!
    expect(card.details).toContainEqual({ label: 'Senha', value: ' secret pass ', sensitive: true })
    expect(card.details).toContainEqual({ label: 'Rede oculta', value: 'Sim', sensitive: false })
    const open = contentSummary(
      'wifi',
      { ssid: 'Open', password: 'stale password', encryption: 'nopass', hidden: false },
      pt,
    )!
    expect(open.details).toHaveLength(1)
    expect(JSON.stringify(open)).not.toContain('stale password')
  })
  it('formats Pix in BRL and shows only the optional reference that was entered', () => {
    const card = contentSummary(
      'pix',
      { keyType: 'email', key: 'ANA@EXAMPLE.COM', name: 'Ana Silva', city: 'São Paulo', amount: '25,50', txid: '' },
      pt,
    )!
    expect(card.details.find(({ label }) => label === 'Chave Pix')?.value).toBe('ana@example.com')
    expect(card.details.find(({ label }) => label === 'Valor')?.value).toMatch(/25,50/)
    expect(card.details.some(({ label }) => label === 'Referência')).toBe(false)
  })
  it('keeps calendar wall times in the event time zone and all-day dates inclusive', () => {
    const event = {
      ...DEFAULT_FIELDS.calendar,
      title: 'Coffee',
      start: '2026-11-15T09:00',
      end: '2026-11-15T10:00',
      timeZone: 'America/Sao_Paulo',
      location: 'Studio',
      description: 'Bring ideas',
    }
    const card = contentSummary('calendar', event, en)!
    expect(card.details[0].value).toContain('9:00')
    expect(card.details[1].value).toContain('10:00')
    expect(card.details[2].value).toBe('America/Sao_Paulo')
    const allDay = contentSummary('calendar', { ...event, allDay: true, start: '2026-11-15', end: '2026-11-17' }, en)!
    expect(allDay.details[1].value).toContain('17')
    expect(allDay.details.some(({ value }) => value === 'America/Sao_Paulo')).toBe(false)
  })
  it('combines messages, preserves text and normalizes coordinates and Telegram usernames', () => {
    expect(
      contentSummary('email', { to: 'ana@example.com', subject: 'Coffee?', body: 'Tomorrow\nat 9' }, en)?.details.map(
        ({ value }) => value,
      ),
    ).toEqual(['Coffee?', 'Tomorrow\nat 9'])
    expect(contentSummary('text', { text: 'Olá 👋\n日本語' }, pt)?.body).toBe('Olá 👋\n日本語')
    expect(contentSummary('text', { text: '   ' }, pt)).toBeNull()
    expect(contentSummary('location', { latitude: '-23,5505', longitude: '-46.6333' }, pt)?.title).toBe(
      '-23.5505, -46.6333',
    )
    expect(contentSummary('telegram', { username: 'https://t.me/example', message: 'Hello' }, en)?.title).toBe(
      '@example',
    )
    expect(contentSummary('url', { url: 'https://example.com' }, en)).toBeNull()
  })
})
