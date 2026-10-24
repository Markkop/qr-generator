import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearHistory, deleteEntry, exportHistory, importHistory, prune, QrDatabase, saveEntry, setPinned } from './db'
import { DEFAULT_STYLE } from './qr/style'

let database: QrDatabase
let counter = 0

beforeEach(() => {
  database = new QrDatabase(`test-${++counter}`)
})

afterEach(async () => {
  database.close()
  await database.delete()
})

const urlEntry = (url: string, logo: string | null = null) => ({
  type: 'url' as const,
  fields: { url },
  payload: `https://${url}`,
  style: DEFAULT_STYLE,
  logo,
})

describe('history', () => {
  it('saves entries with a label', async () => {
    const entry = await saveEntry(urlEntry('example.com'), database)
    expect(entry.label).toBe('example.com')
    expect(await database.entries.count()).toBe(1)
  })

  it('collapses identical content and style into one entry', async () => {
    const first = await saveEntry(urlEntry('example.com'), database)
    const second = await saveEntry(urlEntry('example.com'), database)
    expect(second.id).toBe(first.id)
    expect(await database.entries.count()).toBe(1)
    await saveEntry({ ...urlEntry('example.com'), style: { ...DEFAULT_STYLE, foreground: '#222222' } }, database)
    expect(await database.entries.count()).toBe(2)
  })

  it('stores each logo once and removes orphans', async () => {
    const a = await saveEntry(urlEntry('a.com', 'data:image/png;base64,AAAA'), database)
    await saveEntry(urlEntry('b.com', 'data:image/png;base64,AAAA'), database)
    expect(await database.logos.count()).toBe(1)
    await deleteEntry(a.id, database)
    expect(await database.logos.count()).toBe(1)
    await clearHistory(database)
    expect(await database.logos.count()).toBe(0)
  })

  it('prunes the oldest unpinned entries past the limit', async () => {
    const ids = []
    for (const url of ['1.com', '2.com', '3.com']) ids.push((await saveEntry(urlEntry(url), database)).id)
    await Promise.all(ids.map((id, i) => database.entries.update(id, { updatedAt: i })))
    await setPinned(ids[0], true, database)
    await prune(database, 2)
    const labels = (await database.entries.toArray()).map((e) => e.label).sort()
    expect(labels).toEqual(['1.com', '3.com'])
  })

  it('round-trips through export and import', async () => {
    await saveEntry(urlEntry('example.com', 'data:image/png;base64,AAAA'), database)
    const backup = JSON.parse(JSON.stringify(await exportHistory(database)))
    const other = new QrDatabase(`test-import-${counter}`)
    expect(await importHistory(backup, other)).toBe(1)
    const [entry] = await other.entries.toArray()
    expect(entry.payload).toBe('https://example.com')
    expect(await other.logos.count()).toBe(1)
    other.close()
    await other.delete()
  })

  it('rebuilds payloads on import instead of trusting the file', async () => {
    const count = await importHistory(
      {
        app: 'qr-generator',
        version: 1,
        entries: [
          { id: 'x', type: 'url', fields: { url: 'safe.com' }, payload: 'javascript:alert(1)', style: {} },
          { id: 'y', type: 'nope', fields: {} },
          { id: 'z', type: 'url', fields: { url: '' } },
        ],
        logos: [{ id: 'l', dataUrl: 'javascript:alert(1)' }],
      },
      database,
    )
    expect(count).toBe(1)
    expect((await database.entries.get('x'))?.payload).toBe('https://safe.com')
    expect(await database.logos.count()).toBe(0)
  })

  it('rejects files that are not backups', async () => {
    await expect(importHistory({ foo: 1 }, database)).rejects.toMatchObject({ key: 'history.importNotBackup' })
  })
})
