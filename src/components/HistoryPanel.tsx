import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ChevronDown,
  Download,
  EllipsisVertical,
  FileDown,
  FileUp,
  History,
  Pencil,
  Pin,
  PinOff,
  Search,
  Trash2,
  X,
} from 'lucide-react'
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
import { historyPopoverBox } from '../lib/history-popover'
import { Button, Select, Switch, TextInput } from './ui'
import { cx } from '../lib/cx'
import { useToast } from './toast-context'
import { ActionButton, FeedbackButton } from './ActionButton'
import { useActionFeedback } from '../hooks/useActionFeedback'

const PAGE_SIZE = 8

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
      setUrl(null)
    }
  }, [key])

  return (
    <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700">
      {url && <img src={url} alt="" className="size-full" />}
    </div>
  )
}

function EntryRow({
  entry,
  menuOpen,
  onToggleMenu,
  onOpen,
}: {
  entry: HistoryEntry
  menuOpen: boolean
  onToggleMenu: () => void
  onOpen: (entry: HistoryEntry) => void
}) {
  const { t, formatDate } = useI18n()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.label)
  const label = entry.label || t(typeLabelKey(entry.type))
  const rename = useActionFeedback()

  const commitRename = async () => {
    if (draft.trim() !== entry.label) await renameEntry(entry.id, draft)
    setEditing(false)
  }

  const download = async () => {
    try {
      const logo = await getLogo(entry.logoId)
      const { blob } = await renderQr({ payload: entry.payload, style: entry.style, logo }, 1024, 'png')
      downloadBlob(blob, `qr-${entry.type}-${entry.id.slice(0, 8)}.png`)
    } catch (error) {
      toast(t('history.renderFailed'), 'error')
      throw error
    }
  }

  return (
    <li className="rounded-xl border border-zinc-200 p-1.5 dark:border-zinc-800" data-testid="history-entry">
      {editing ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            void rename.run(commitRename)
          }}
        >
          <TextInput
            aria-label={t('history.name')}
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setDraft(entry.label)
                setEditing(false)
              }
            }}
            className="h-8"
            autoFocus
          />
          <FeedbackButton
            state={rename.state}
            type="submit"
            size="sm"
            variant="ghost"
            iconOnly
            icon={Check}
            label={t('history.saveName')}
          />
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpen(entry)}
            aria-label={t('history.open', { label })}
            title={label}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-indigo-500"
          >
            <Thumbnail entry={entry} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-medium">
                {entry.pinned === 1 && <Pin className="size-3 shrink-0 text-indigo-500" aria-hidden />}
                <span className="truncate">{label}</span>
              </span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {t(typeLabelKey(entry.type))} · {formatDate(entry.updatedAt)}
              </span>
            </span>
          </button>
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={menuOpen}
            aria-label={t('history.itemActions', { label })}
            onClick={onToggleMenu}
            className="shrink-0"
          >
            <EllipsisVertical className="size-4" aria-hidden />
          </Button>
        </div>
      )}
      {menuOpen && !editing && (
        <div className="mt-1.5 flex flex-wrap gap-1 border-t border-zinc-100 px-1 pt-1.5 dark:border-zinc-800">
          <ActionButton
            size="sm"
            variant="ghost"
            onAction={download}
            icon={Download}
            label={t('history.downloadPng')}
            successLabel={t('feedback.downloaded')}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onToggleMenu()
              setDraft(entry.label)
              setEditing(true)
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
            {t('history.rename')}
          </Button>
          <ActionButton
            size="sm"
            variant="ghost"
            onAction={() => setPinned(entry.id, entry.pinned === 0)}
            icon={entry.pinned ? PinOff : Pin}
            label={t(entry.pinned ? 'history.unpin' : 'history.pin')}
          />
          <ActionButton
            size="sm"
            variant="danger"
            icon={Trash2}
            label={t('history.delete')}
            onAction={async () => {
              await deleteEntry(entry.id)
              toast(t('history.deleted'))
            }}
          />
        </div>
      )}
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
  const importing = useActionFeedback()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const manageRef = useRef<HTMLButtonElement>(null)
  const panelId = `history-${useId().replace(/:/g, '')}`
  const titleId = `${panelId}-title`
  const manageId = `${panelId}-manage`
  const [open, setOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [box, setBox] = useState({ top: 0, left: 0, width: 320, maxHeight: 480 })
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const entries = useLiveQuery(() => db.entries.orderBy('updatedAt').reverse().toArray(), [])

  const place = () => {
    const anchor = buttonRef.current
    if (!anchor) return
    setBox(
      historyPopoverBox(anchor.getBoundingClientRect(), {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    )
  }

  const close = (restoreFocus = false) => {
    setOpen(false)
    setManageOpen(false)
    setMenuId(null)
    if (restoreFocus) buttonRef.current?.focus()
  }

  const toggle = () => {
    if (open) {
      close()
      return
    }
    place()
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const anchor = buttonRef.current
      if (!anchor) return
      setBox(
        historyPopoverBox(anchor.getBoundingClientRect(), {
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      )
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const target = searchRef.current ?? manageRef.current
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
      setManageOpen(false)
      setMenuId(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (menuId) {
        setMenuId(null)
        return
      }
      setOpen(false)
      setManageOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, menuId])

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
    if (!file) return false
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
      throw error
    } finally {
      if (importInput.current) importInput.current.value = ''
    }
  }

  const onClear = async () => {
    if (!window.confirm(t('history.confirmClear'))) return false
    await clearHistory()
    toast(t('history.cleared'))
  }

  const openEntry = (entry: HistoryEntry) => {
    close()
    onOpen(entry)
  }

  const total = entries?.length ?? 0

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={entries ? t('history.button', { count: total }) : t('history.title')}
        className={cx(
          'relative inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 max-sm:w-11 max-sm:px-0 sm:px-2.5',
          open
            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300'
            : 'border-zinc-200 bg-soft text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800',
        )}
      >
        <History className="size-4 shrink-0" aria-hidden />
        <span className="max-sm:sr-only">{t('history.title')}</span>
        {entries && (
          <span
            aria-hidden
            className={cx(
              'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold tabular-nums max-sm:absolute max-sm:-top-1 max-sm:-right-1',
              total > 0
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-900/10 text-zinc-600 dark:bg-white/15 dark:text-zinc-300',
            )}
          >
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{ top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }}
          className="fixed z-40 m-0 overflow-auto overscroll-contain rounded-2xl border border-zinc-200 bg-surface text-zinc-900 shadow-xl focus:outline-none dark:border-zinc-700 dark:text-zinc-100"
        >
          <div className="sticky top-0 z-10 flex flex-col gap-2.5 border-b border-zinc-200 bg-surface px-3 py-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id={titleId} className="text-sm font-semibold">
                    {t('history.title')}
                  </h2>
                  {entries && <span className="text-xs font-medium text-zinc-500 tabular-nums">{total}</span>}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{t('history.subtitle')}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label={t('history.close')}
                onClick={() => close(true)}
                className="shrink-0"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <button
              ref={manageRef}
              type="button"
              aria-expanded={manageOpen}
              aria-controls={manageId}
              onClick={() => setManageOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <span>{t('history.manage')}</span>
              <ChevronDown
                className={cx(
                  'size-4 shrink-0 text-zinc-400 transition-transform motion-reduce:transition-none',
                  manageOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
            {manageOpen && (
              <div id={manageId} className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1">
                  <ActionButton
                    size="sm"
                    variant="ghost"
                    onAction={onExport}
                    disabled={!total}
                    icon={FileDown}
                    label={t('history.export')}
                    successLabel={t('feedback.downloaded')}
                  />
                  <FeedbackButton
                    state={importing.state}
                    size="sm"
                    variant="ghost"
                    onClick={() => importInput.current?.click()}
                    icon={FileUp}
                    label={t('history.import')}
                  />
                  <ActionButton
                    size="sm"
                    variant="danger"
                    onAction={onClear}
                    disabled={!total}
                    icon={Trash2}
                    label={t('history.clear')}
                    successLabel={t('feedback.cleared')}
                  />
                </div>
                <Switch
                  checked={saveHistory}
                  onChange={onSaveHistoryChange}
                  label={t('history.autoSave')}
                  description={t('history.autoSaveHint')}
                />
              </div>
            )}

            {total > 0 && (
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <TextInput
                    ref={searchRef}
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
          </div>

          <div className="flex flex-col gap-2 px-3 py-3">
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                void importing.run(() => onImport(file))
              }}
            />
            {entries === undefined ? null : total === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t('history.empty')}
              </p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">{t('history.noMatch')}</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {filtered.slice(0, limit).map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      menuOpen={menuId === entry.id}
                      onToggleMenu={() => setMenuId((current) => (current === entry.id ? null : entry.id))}
                      onOpen={openEntry}
                    />
                  ))}
                </ul>
                {filtered.length > limit && (
                  <Button variant="ghost" className="self-center" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    {t('history.showMore', { count: filtered.length - limit })}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
