import type { Message } from '../../i18n/messages'
import type { BuildResult } from './build'
import type { FieldsByType } from './types'

// RFC 5545: UTC date-times, exclusive DTEND, escaped TEXT and 75-octet folded lines.
// https://www.rfc-editor.org/rfc/rfc5545.html
export function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

export function foldCalendarLine(value: string): string {
  let line = ''
  let bytes = 0
  const lines: string[] = []
  for (const char of value) {
    const size = new TextEncoder().encode(char).length
    if (bytes + size > 75) {
      lines.push(line)
      line = ' '
      bytes = 1
    }
    line += char
    bytes += size
  }
  return [...lines, line].join('\r\n')
}

function parseWallTime(value: string, allDay = false): number | null {
  const match = (allDay ? /^([1-9]\d{3})-(\d{2})-(\d{2})$/ : /^([1-9]\d{3})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/).exec(
    value,
  )
  if (!match) return null
  const [, year, month, day, hour = '0', minute = '0'] = match
  const parts = [Number(year), Number(month), Number(day), Number(hour), Number(minute)]
  const instant = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4])
  const date = new Date(instant)
  return date.getUTCFullYear() === parts[0] &&
    date.getUTCMonth() + 1 === parts[1] &&
    date.getUTCDate() === parts[2] &&
    date.getUTCHours() === parts[3] &&
    date.getUTCMinutes() === parts[4]
    ? instant
    : null
}

export function calendarUtc(value: string, timeZone: string): number | null {
  const wall = parseWallTime(value)
  if (wall === null) return null
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const localWall = (instant: number) => {
    const p = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]))
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
  }
  const offsets = new Set(
    [-36, 0, 36].map((hours) => {
      const instant = wall + hours * 3600000
      return localWall(instant) - instant
    }),
  )
  // Missing DST times have no match. Repeated times use the first occurrence (RFC 5545 §3.3.5).
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => localWall(instant) === wall)
    .sort((a, b) => a - b)
  return matches[0] ?? null
}

function stamp(instant: number): string {
  return new Date(instant)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function eventId(content: string): string {
  // A stable content ID keeps rerenders and backup imports from creating new event identities.
  const hash = (seed: bigint) => {
    let h = seed
    for (const byte of new TextEncoder().encode(content)) h = BigInt.asUintN(64, (h ^ BigInt(byte)) * 0x100000001b3n)
    return h.toString(16).padStart(16, '0')
  }
  return `${hash(0xcbf29ce484222325n)}${hash(0x84222325cbf29ce4n)}@qr.markkop.dev`
}

export function buildCalendar(fields: FieldsByType['calendar']): BuildResult {
  const errors: Record<string, Message> = {}
  const empty = () => ({ payload: null, errors, warnings: [] })
  if (!fields.title.trim() || !fields.start || !fields.end) return empty()
  let start: number | null
  let end: number | null
  if (fields.allDay) {
    start = parseWallTime(fields.start, true)
    const last = parseWallTime(fields.end, true)
    end = last === null ? null : last + 86400000
  } else {
    try {
      start = calendarUtc(fields.start, fields.timeZone)
      end = calendarUtc(fields.end, fields.timeZone)
    } catch {
      errors.timeZone = { key: 'error.calendarZone' }
      return empty()
    }
  }
  if (start === null) errors.start = { key: 'error.calendarDate' }
  if (end === null || new Date(end).getUTCFullYear() > 9999) errors.end = { key: 'error.calendarDate' }
  if (start !== null && end !== null && end <= start) errors.end = { key: 'error.calendarEnd' }
  const created = Date.parse(fields.createdAt)
  if (
    !Number.isFinite(created) ||
    new Date(created).getUTCFullYear() < 1000 ||
    new Date(created).getUTCFullYear() > 9999
  )
    errors.title = { key: 'error.calendarMetadata' }
  // eslint-disable-next-line no-control-regex -- RFC TEXT must reject these control characters.
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(fields.title + fields.location + fields.description))
    errors.title = { key: 'error.calendarText' }
  if (Object.keys(errors).length || start === null || end === null) return empty()
  const dateLine = (name: string, instant: number) =>
    fields.allDay ? `${name};VALUE=DATE:${stamp(instant).slice(0, 8)}` : `${name}:${stamp(instant)}`
  const event = [
    dateLine('DTSTART', start),
    dateLine('DTEND', end),
    `SUMMARY:${escapeCalendarText(fields.title.trim())}`,
    ...(fields.location.trim() ? [`LOCATION:${escapeCalendarText(fields.location.trim())}`] : []),
    ...(fields.description.trim() ? [`DESCRIPTION:${escapeCalendarText(fields.description.trim())}`] : []),
  ]
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mark Kop//QR Code//EN',
    'BEGIN:VEVENT',
    `UID:${eventId(JSON.stringify([event, fields.createdAt]))}`,
    `DTSTAMP:${stamp(created)}`,
    ...event,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return { payload: lines.map(foldCalendarLine).join('\r\n') + '\r\n', errors: {}, warnings: [] }
}
