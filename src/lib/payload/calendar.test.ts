import { describe, expect, it } from 'vitest'
import { buildPayload } from './build'
import { calendarUtc, escapeCalendarText, foldCalendarLine } from './calendar'
import { DEFAULT_FIELDS } from './types'

const event = {
  ...DEFAULT_FIELDS.calendar,
  title: 'Café, equipe; planejamento',
  start: '2026-11-15T09:00',
  end: '2026-11-15T10:00',
  timeZone: 'America/Sao_Paulo',
  createdAt: '2026-10-25T12:00:00Z',
}

describe('iCalendar events', () => {
  it('creates a complete, stable RFC 5545 event in UTC', () => {
    const payload = buildPayload('calendar', event).payload!
    expect(payload).toContain('DTSTART:20261115T120000Z\r\nDTEND:20261115T130000Z')
    expect(payload).toContain('DTSTAMP:20261025T120000Z')
    expect(payload).toMatch(/UID:[a-f0-9]{32}@qr.markkop.dev/)
    expect(payload).toContain('SUMMARY:Café\\, equipe\\; planejamento')
    expect(payload).toBe(buildPayload('calendar', { ...event }).payload)
    expect(payload).toMatch(/^BEGIN:VCALENDAR\r\nVERSION:2.0/)
    expect(payload.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true)
  })
  it('uses an exclusive end date for inclusive all-day input, across years', () => {
    const payload = buildPayload('calendar', {
      ...event,
      allDay: true,
      start: '2026-12-31',
      end: '2027-01-01',
    }).payload!
    expect(payload).toContain('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270102')
    expect(
      buildPayload('calendar', { ...event, allDay: true, start: '2026-11-15', end: '2026-11-15' }).payload,
    ).toBeTruthy()
  })
  it('handles DST and uses the first occurrence of repeated local times', () => {
    expect(calendarUtc('2026-03-08T02:30', 'America/New_York')).toBeNull()
    expect(new Date(calendarUtc('2026-11-01T01:30', 'America/New_York')!).toISOString()).toBe(
      '2026-11-01T05:30:00.000Z',
    )
    expect(new Date(calendarUtc('2026-11-15T09:00', 'Asia/Kathmandu')!).toISOString()).toBe('2026-11-15T03:15:00.000Z')
  })
  it.each([
    { end: '2026-11-15T08:00' },
    { end: event.start },
    { start: '2026-02-30T09:00' },
    { start: '2026-11-15T25:00' },
    { timeZone: 'invalid' },
    { createdAt: 'invalid' },
    { title: '\u0000' },
    { allDay: true, start: '2026-11-15', end: '2026-11-14' },
  ])('rejects invalid input %o', (patch) => expect(buildPayload('calendar', { ...event, ...patch }).payload).toBeNull())
  it('escapes untrusted text and folds by UTF-8 bytes without splitting characters', () => {
    expect(escapeCalendarText('\\\r\nEND:VEVENT;test,')).toBe('\\\\\\nEND:VEVENT\\;test\\,')
    const value = 'SUMMARY:' + 'Olá 👋日本語'.repeat(30)
    const folded = foldCalendarLine(value)
    expect(folded.replace(/\r\n /g, '')).toBe(value)
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const payload = buildPayload('calendar', { ...event, description: '\nEND:VEVENT\nBEGIN:VEVENT' }).payload!
    expect(payload.match(/\r\nBEGIN:VEVENT/g)).toHaveLength(1)
  })
})
