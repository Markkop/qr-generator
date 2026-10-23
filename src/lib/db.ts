import Dexie, { type EntityTable } from 'dexie'
import { CONTENT_TYPES, DEFAULT_FIELDS, type ContentType, type FieldsByType } from './payload/types'
import { buildPayload, describe } from './payload/build'
import { sanitizeStyle, type QrStyle } from './qr/style'

export interface HistoryEntry<T extends ContentType = ContentType> {
  id: string
  type: T
  fields: FieldsByType[T]
  payload: string
  style: QrStyle
  logoId: string | null
  label: string
  /** 1 or 0, because IndexedDB cannot index booleans. */
  pinned: 0 | 1
  /** Identical content and style collapse into one entry. */
  signature: string
  createdAt: number
  updatedAt: number
}

export interface LogoRecord {
  id: string
  dataUrl: string
  createdAt: number
}

export const HISTORY_LIMIT = 500

export class QrDatabase extends Dexie {
  entries!: EntityTable<HistoryEntry, 'id'>
  logos!: EntityTable<LogoRecord, 'id'>

  constructor(name = 'qr-generator') {
    super(name)
    this.version(1).stores({
      entries: 'id, updatedAt, type, pinned, signature',
      logos: 'id',
    })
  }
}

export const db = new QrDatabase()

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function storeLogo(dataUrl: string, database = db): Promise<string> {
  const id = await sha256(dataUrl)
  if (!(await database.logos.get(id))) await database.logos.put({ id, dataUrl, createdAt: Date.now() })
  return id
}

export interface SaveInput<T extends ContentType = ContentType> {
  type: T
  fields: FieldsByType[T]
  payload: string
  style: QrStyle
  logo: string | null
}

export async function saveEntry(input: SaveInput, database = db): Promise<HistoryEntry> {
  const logoId = input.logo ? await storeLogo(input.logo, database) : null
  const signature = await sha256(JSON.stringify([input.payload, input.style, logoId]))
  const now = Date.now()
  return database.transaction('rw', database.entries, database.logos, async () => {
    const existing = await database.entries.where('signature').equals(signature).first()
    if (existing) {
      await database.entries.update(existing.id, { updatedAt: now })
      return { ...existing, updatedAt: now }
    }
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      type: input.type,
      fields: input.fields,
      payload: input.payload,
      style: input.style,
      logoId,
      label: describe(input.type, input.fields),
      pinned: 0,
      signature,
      createdAt: now,
      updatedAt: now,
    }
    await database.entries.add(entry)
    await prune(database)
    return entry
  })
}

/** Drops the oldest unpinned entries past the limit, then any logo no entry uses. */
export async function prune(database = db, limit = HISTORY_LIMIT): Promise<void> {
  await database.transaction('rw', database.entries, database.logos, async () => {
    const count = await database.entries.count()
    if (count > limit) {
      const excess = await database.entries
        .orderBy('updatedAt')
        .filter((e) => e.pinned === 0)
        .limit(count - limit)
        .primaryKeys()
      await database.entries.bulkDelete(excess)
    }
    await removeOrphanLogos(database)
  })
}

async function removeOrphanLogos(database: QrDatabase): Promise<void> {
  const used = new Set<string>()
  await database.entries.each((e) => {
    if (e.logoId) used.add(e.logoId)
  })
  const orphans = (await database.logos.toCollection().primaryKeys()).filter((id) => !used.has(id))
  if (orphans.length) await database.logos.bulkDelete(orphans)
}

export async function deleteEntry(id: string, database = db): Promise<void> {
  await database.transaction('rw', database.entries, database.logos, async () => {
    await database.entries.delete(id)
    await removeOrphanLogos(database)
  })
}

export async function clearHistory(database = db): Promise<void> {
  await database.transaction('rw', database.entries, database.logos, async () => {
    await database.entries.clear()
    await database.logos.clear()
  })
}

export async function setPinned(id: string, pinned: boolean, database = db): Promise<void> {
  await database.entries.update(id, { pinned: pinned ? 1 : 0 })
}

export async function renameEntry(id: string, label: string, database = db): Promise<void> {
  await database.entries.update(id, { label: label.trim(), updatedAt: Date.now() })
}

export async function getLogo(id: string | null, database = db): Promise<string | null> {
  if (!id) return null
  return (await database.logos.get(id))?.dataUrl ?? null
}

export interface HistoryExport {
  app: 'qr-generator'
  version: 1
  exportedAt: string
  entries: HistoryEntry[]
  logos: LogoRecord[]
}

export async function exportHistory(database = db): Promise<HistoryExport> {
  const [entries, logos] = await Promise.all([database.entries.toArray(), database.logos.toArray()])
  return { app: 'qr-generator', version: 1, exportedAt: new Date().toISOString(), entries, logos }
}

function sanitizeFields<T extends ContentType>(type: T, input: unknown): FieldsByType[T] {
  const defaults = DEFAULT_FIELDS[type] as unknown as Record<string, unknown>
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, fallback] of Object.entries(defaults)) {
    out[key] = typeof source[key] === typeof fallback ? source[key] : fallback
  }
  return out as FieldsByType[T]
}

/** Merges a backup into the current history. Entries are rebuilt from their fields, so a tampered payload cannot sneak in. */
export async function importHistory(raw: unknown, database = db): Promise<number> {
  const data = raw as Partial<HistoryExport>
  if (!data || data.app !== 'qr-generator' || !Array.isArray(data.entries)) {
    throw new Error('This file is not a QR Generator backup.')
  }
  const logos = (Array.isArray(data.logos) ? data.logos : []).filter(
    (l): l is LogoRecord =>
      typeof l?.id === 'string' &&
      typeof l?.dataUrl === 'string' &&
      /^data:image\/(png|jpeg|gif|webp|svg\+xml);/.test(l.dataUrl),
  )
  const logoIds = new Set(logos.map((l) => l.id))
  const entries: HistoryEntry[] = []
  for (const item of data.entries) {
    if (!item || !CONTENT_TYPES.includes(item.type)) continue
    const fields = sanitizeFields(item.type, item.fields)
    const { payload } = buildPayload(item.type, fields)
    if (!payload) continue
    const style = sanitizeStyle(item.style)
    const logoId = typeof item.logoId === 'string' && logoIds.has(item.logoId) ? item.logoId : null
    const now = Date.now()
    entries.push({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      type: item.type,
      fields,
      payload,
      style,
      logoId,
      label: typeof item.label === 'string' ? item.label.slice(0, 200) : describe(item.type, fields),
      pinned: item.pinned === 1 ? 1 : 0,
      signature: await sha256(JSON.stringify([payload, style, logoId])),
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
    })
  }
  await database.transaction('rw', database.entries, database.logos, async () => {
    await database.logos.bulkPut(
      logos.map((l) => ({ id: l.id, dataUrl: l.dataUrl, createdAt: l.createdAt ?? Date.now() })),
    )
    await database.entries.bulkPut(entries)
  })
  await prune(database)
  return entries.length
}

export async function requestPersistentStorage(): Promise<void> {
  if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
    await navigator.storage.persist?.()
  }
}
