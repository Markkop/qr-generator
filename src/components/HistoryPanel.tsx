import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Download, FileDown, FileUp, Pencil, Pin, PinOff, Search, SquarePen, Trash2, X } from 'lucide-react'
import {
  clearHistory,
  db,
  deleteEntry,
  exportHistory,
  getLogo,
  importHistory,
  renameEntry,
  setPinned,
  type HistoryEntry,
} from '../lib/db'
import { useI18n } from '../i18n/context'
import { AppError } from '../lib/errors'
import { CONTENT_TYPES, typeLabelKey, type ContentType } from '../lib/payload/types'
import { renderQr } from '../lib/qr/render'
import { downloadBlob } from '../lib/export'
import { Button, Card, Select, Switch, TextInput } from './ui'
import { cx } from '../lib/cx'
import { useToast } from './toast-context'

const PAGE_SIZE = 24

function Thumbnail({ entry }: { entry: HistoryEntry }) {
  const [url, setUrl] = useState<string | null>(null)
  // Live queries return fresh objects on every change, so depend on the serialized content.
  const key = JSON.stringify([entry.payload, entry.style, entry.logoId])
  useEffect(() => {
    const [payload, style, logoId] = JSON.parse(key) as [string, HistoryEntry['style'], string | null]
    let cancelled = false
    let objectUrl: string | null = null
    ;(async () => {
      try {
        const logo = await getLogo(logoId)
        const { blob } = await renderQr({ payload, style, logo }, 192, 'png')
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        // Leave the placeholder in place.
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [key])

  return (
    <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
      {url && <img src={url} alt="" className="size-full" />}
    </div>
  )
}

function EntryRow({ entry, onOpen }: { entry: HistoryEntry; onOpen: (entry: HistoryEntry) => void }) {
  const { t, formatDate } = useI18n()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.label)
  const label = entry.label || t(typeLabelKey(entry.type))

  const commitRename = async () => {
    setEditing(false)
    if (draft.trim() !== entry.label) await renameEntry(entry.id, draft)
  }

  const download = async () => {
    try {
      const logo = await getLogo(entry.logoId)
      const { blob } = await renderQr({ payload: entry.payload, style: entry.style, logo }, 1024, 'png')
      downloadBlob(blob, `qr-${entry.type}-${entry.id.slice(0, 8)}.png`)
    } catch {
      toast(t('history.renderFailed'), 'error')
    }
  }

  return (
    <li
      className="flex items-center gap-3 rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800"
      data-testid="history-entry"
    >
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="rounded-lg focus-visible:outline-2 focus-visible:outline-indigo-500"
        aria-label={t('history.open', { label })}
      >
        <Thumbnail entry={entry} />
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault()
              void commitRename()
            }}
          >
            <TextInput
              aria-label={t('history.name')}
              value={draft}
              maxLength={200}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setDraft(entry.label)
                  setEditing(false)
                }
              }}
              className="h-8"
              autoFocus
            />
            <Button type="submit" size="sm" variant="ghost" aria-label={t('history.saveName')}>
              <Check className="size-4" aria-hidden />
            </Button>
          </form>
        ) : (
          <p className="truncate text-sm font-medium" title={label}>
            {entry.pinned === 1 && (
              <Pin className="mr-1 inline size-3 text-indigo-500" aria-label={t('history.pinned')} />
            )}
            {label}
          </p>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t(typeLabelKey(entry.type))} · {formatDate(entry.updatedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onOpen(entry)}
          aria-label={t('history.openShort')}
          title={t('history.openShort')}
        >
          <SquarePen className="size-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={download}
          aria-label={t('history.downloadPng')}
          title={t('history.downloadPng')}
          className="max-sm:hidden"
        >
          <Download className="size-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(entry.label)
            setEditing(true)
          }}
          aria-label={t('history.rename')}
          title={t('history.rename')}
          className="max-sm:hidden"
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPinned(entry.id, entry.pinned === 0)}
          aria-label={t(entry.pinned ? 'history.unpin' : 'history.pin')}
          title={t(entry.pinned ? 'history.unpin' : 'history.pin')}
        >
          {entry.pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={async () => {
            await deleteEntry(entry.id)
            toast(t('history.deleted'))
          }}
          aria-label={t('history.delete')}
          title={t('history.delete')}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  )
}

interface Props {
  saveHistory: boolean
  onSaveHistoryChange: (value: boolean) => void
  onOpen: (entry: HistoryEntry) => void
}

export function HistoryPanel({ saveHistory, onSaveHistoryChange, onOpen }: Props) {
  const { t, tn } = useI18n()
  const toast = useToast()
  const importInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const entries = useLiveQuery(() => db.entries.orderBy('updatedAt').reverse().toArray(), [])

  const filtered = useMemo(() => {
    if (!entries) return []
    const q = query.trim().toLowerCase()
    return entries
      .filter((e) => typeFilter === 'all' || e.type === typeFilter)
      .filter(
        (e) => !q || e.label.toLowerCase().includes(q) || (e.type !== 'wifi' && e.payload.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.pinned - a.pinned)
  }, [entries, query, typeFilter])

  const onExport = async () => {
    const data = await exportHistory()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `qr-generator-history-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const count = await importHistory(JSON.parse(await file.text()))
      toast(tn('history.imported', count))
    } catch (error) {
      toast(
        t(
          error instanceof SyntaxError
            ? 'history.importInvalidJson'
            : error instanceof AppError
              ? error.key
              : 'history.importFailed',
        ),
        'error',
      )
    } finally {
      if (importInput.current) importInput.current.value = ''
    }
  }

  const onClear = async () => {
    if (!window.confirm(t('history.confirmClear'))) return
    await clearHistory()
    toast(t('history.cleared'))
  }

  const total = entries?.length ?? 0

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{t('history.title')}</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('history.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onExport} disabled={!total}>
            <FileDown className="size-4" aria-hidden />
            {t('history.export')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => importInput.current?.click()}>
            <FileUp className="size-4" aria-hidden />
            {t('history.import')}
          </Button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => onImport(e.target.files?.[0])}
          />
          <Button size="sm" variant="danger" onClick={onClear} disabled={!total}>
            <Trash2 className="size-4" aria-hidden />
            {t('history.clear')}
          </Button>
        </div>
      </div>

      <Switch
        checked={saveHistory}
        onChange={onSaveHistoryChange}
        label={t('history.autoSave')}
        description={t('history.autoSaveHint')}
      />

      {total > 0 && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
              aria-hidden
            />
            <TextInput
              aria-label={t('history.search')}
              placeholder={t('history.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('history.clearSearch')}
                className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-zinc-400 hover:text-zinc-700"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
          <Select
            aria-label={t('history.filter')}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContentType | 'all')}
            className="w-36"
          >
            <option value="all">{t('history.allTypes')}</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(typeLabelKey(type))}
              </option>
            ))}
          </Select>
        </div>
      )}

      {entries === undefined ? null : total === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {t('history.empty')}
        </p>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{t('history.noMatch')}</p>
      ) : (
        <>
          <ul className={cx('grid grid-cols-1 gap-2 lg:grid-cols-2')}>
            {filtered.slice(0, limit).map((entry) => (
              <EntryRow key={entry.id} entry={entry} onOpen={onOpen} />
            ))}
          </ul>
          {filtered.length > limit && (
            <Button variant="ghost" className="self-center" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              {t('history.showMore', { count: filtered.length - limit })}
            </Button>
          )}
        </>
      )}
    </Card>
  )
}
