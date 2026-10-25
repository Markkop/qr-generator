import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Moon, QrCode, Sun } from 'lucide-react'
import { ContentForm } from './components/ContentForm'
import { HistoryPanel } from './components/HistoryPanel'
import { PreviewPanel, type Notice } from './components/PreviewPanel'
import { StylePanel } from './components/StylePanel'
import { useToast } from './components/toast-context'
import { TypeTabs } from './components/TypeTabs'
import { PANEL_ID, tabId } from './components/tabs'
import { LanguageSelect } from './components/LanguageSelect'
import { SiteBottomBar } from './components/SiteBottomBar'
import { Card } from './components/ui'
import { useQrPreview } from './hooks/useQrPreview'
import { useI18n } from './i18n/context'
import type { Message, MessageKey } from './i18n/messages'
import { getLogo, requestPersistentStorage, saveEntry, type HistoryEntry } from './lib/db'
import { canCopyImage, canShareFiles, copyImage, copyText, downloadBlob, fileName, shareImage } from './lib/export'
import { buildPayload, describe } from './lib/payload/build'
import { DEFAULT_FIELDS, typeLabelKey, type AllFields, type ContentType, type FieldsByType } from './lib/payload/types'
import { checkColors } from './lib/qr/color'
import { densityOf } from './lib/qr/encode'
import { renderQr } from './lib/qr/render'
import { DEFAULT_STYLE, resolveErrorCorrection, sanitizeStyle, type QrStyle } from './lib/qr/style'
import { useApplyTheme, usePreferences, type Theme } from './lib/prefs'

const THEMES: { value: Theme; icon: typeof Sun; label: MessageKey; name: MessageKey }[] = [
  { value: 'light', icon: Sun, label: 'theme.light', name: 'theme.lightName' },
  { value: 'dark', icon: Moon, label: 'theme.dark', name: 'theme.darkName' },
]

interface NoticeMessage {
  level: Notice['level']
  message: Message
}

const COPY_SUPPORTED = canCopyImage()
const SHARE_SUPPORTED = canShareFiles()

export default function App() {
  const { t, tm } = useI18n()
  const toast = useToast()
  const [prefs, updatePrefs] = usePreferences()
  useApplyTheme(prefs.theme)

  const [type, setType] = useState<ContentType>('url')
  const [fields, setFields] = useState<AllFields>(DEFAULT_FIELDS)
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE)
  const [logo, setLogo] = useState<string | null>(null)
  const persistRequested = useRef(false)
  const editor = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = editor.current
    const inset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)
    if (panel && panel.getBoundingClientRect().top < inset) {
      panel.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }, [type])

  const current = fields[type]
  const built = useMemo(() => buildPayload(type, current), [type, current])
  const renderInput = useMemo(
    () => (built.payload ? { payload: built.payload, style, logo } : null),
    [built.payload, style, logo],
  )
  const preview = useQrPreview(renderInput)
  const description = describe(type, current)

  const notices = useMemo(() => {
    const list: NoticeMessage[] = built.warnings.map((message) => ({ level: 'warn', message }))
    const colors = checkColors(style.foreground, style.background)
    if (colors.message) list.push({ level: colors.level === 'bad' ? 'bad' : 'warn', message: colors.message })
    if (style.cornerColor) {
      const corners = checkColors(style.cornerColor, style.background)
      if (corners.level === 'bad')
        list.push({
          level: 'bad',
          message: { key: 'warn.cornerContrast' },
        })
    }
    if (style.quietZone < 4)
      list.push({
        level: 'warn',
        message: { key: 'warn.quietZone' },
      })
    const ecl = resolveErrorCorrection(style, Boolean(logo))
    if (logo && (ecl === 'L' || ecl === 'M'))
      list.push({
        level: 'warn',
        message: { key: 'warn.logoEcl', params: { ecl } },
      })
    if (preview.status === 'ready') {
      const density = densityOf(preview.analysis.version)
      if (density === 'medium') list.push({ level: 'warn', message: { key: 'warn.dense' } })
      if (density === 'high')
        list.push({
          level: 'bad',
          message: { key: 'warn.veryDense' },
        })
      if (preview.scan.status === 'unreadable')
        list.push({
          level: 'bad',
          message: { key: 'warn.unreadable' },
        })
      if (preview.scan.status === 'mismatch') list.push({ level: 'bad', message: { key: 'warn.mismatch' } })
    }
    return list
  }, [built.warnings, style, logo, preview])
  const translatedNotices = notices.map(({ level, message }) => ({ level, message: tm(message) }))

  const updateFields = useCallback(
    <T extends ContentType>(patch: Partial<FieldsByType[T]>) =>
      setFields((all) => ({ ...all, [type]: { ...all[type], ...patch } })),
    [type],
  )

  const ready = preview.status === 'ready' && preview.payload === built.payload ? preview : null

  const record = async (force = false) => {
    if (!ready || (!force && !prefs.saveHistory)) return
    try {
      await saveEntry({ type, fields: current, payload: ready.payload, style, logo })
      if (!persistRequested.current) {
        persistRequested.current = true
        void requestPersistentStorage()
      }
      if (force) toast(t('toast.saved'))
    } catch {
      toast(t('toast.saveFailed'), 'error')
    }
  }

  const onDownload = async () => {
    if (!ready) return
    try {
      const { blob } = await renderQr({ payload: ready.payload, style, logo }, prefs.exportSize, prefs.exportFormat)
      downloadBlob(blob, fileName(type, description, prefs.exportFormat))
      toast(t('toast.downloaded'))
      void record()
    } catch {
      toast(t('toast.downloadFailed'), 'error')
    }
  }

  const onCopyImage = () => {
    if (!ready) return
    copyImage(Promise.resolve(ready.blob))
      .then(() => {
        toast(t('toast.imageCopied'))
        void record()
      })
      .catch(() => toast(t('toast.copyImageBlocked'), 'error'))
  }

  const onCopyText = () => {
    if (!ready) return
    copyText(ready.payload)
      .then(() => {
        toast(t('toast.contentCopied'))
        void record()
      })
      .catch(() => toast(t('toast.copyFailed'), 'error'))
  }

  const onShare = () => {
    if (!ready) return
    shareImage(ready.blob, fileName(type, description, 'png'), t('share.title', { type: t(typeLabelKey(type)) }))
      .then((outcome) => {
        if (outcome === 'shared') void record()
      })
      .catch(() => toast(t('toast.shareFailed'), 'error'))
  }

  const onOpen = async (entry: HistoryEntry) => {
    setFields((all) => ({ ...all, [entry.type]: { ...DEFAULT_FIELDS[entry.type], ...entry.fields } }))
    setType(entry.type)
    setStyle(sanitizeStyle(entry.style))
    setLogo(await getLogo(entry.logoId))
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
    toast(t('toast.loaded'))
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page text-zinc-900 dark:text-zinc-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        {t('app.skip')}
      </a>
      <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-2 px-4 py-4 sm:gap-3 sm:px-6 lg:px-8 lg:py-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white sm:size-9">
            <QrCode className="size-4 sm:size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base leading-tight font-semibold sm:text-lg">{t('app.name')}</h1>
            <p className="truncate text-[11px] text-zinc-500 sm:text-xs dark:text-zinc-400">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSelect />
          <div className="flex items-center gap-1 sm:gap-2">
            <HistoryPanel
              saveHistory={prefs.saveHistory}
              onSaveHistoryChange={(saveHistory) => updatePrefs({ saveHistory })}
              onOpen={onOpen}
            />
            <button
              type="button"
              onClick={() => updatePrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
              aria-label={t(prefs.theme === 'dark' ? 'theme.dark' : 'theme.light')}
              title={t(prefs.theme === 'dark' ? 'theme.darkName' : 'theme.lightName')}
              className="inline-flex size-11 items-center justify-center rounded-xl border border-zinc-200 bg-soft text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:hidden dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {prefs.theme === 'dark' ? (
                <Moon className="size-4" aria-hidden />
              ) : (
                <Sun className="size-4" aria-hidden />
              )}
            </button>
            <div
              role="group"
              aria-label={t('theme.label')}
              className="hidden gap-1 rounded-xl border border-zinc-200 bg-soft p-1 sm:flex dark:border-zinc-700"
            >
              {THEMES.map(({ value, icon: Icon, label, name }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updatePrefs({ theme: value })}
                  aria-label={t(label)}
                  aria-pressed={prefs.theme === value}
                  title={t(label)}
                  className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                    prefs.theme === value
                      ? 'bg-surface text-indigo-700 shadow-sm dark:text-indigo-300'
                      : 'text-zinc-500 hover:bg-surface hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  <span>{t(name)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-2 pb-10 sm:px-6 lg:px-8 lg:pt-3">
        <div className="workspace-layout">
          <aside className="type-panel" aria-labelledby="type-panel-title">
            <h2 id="type-panel-title" className="type-panel-title">
              {t('tabs.label')}
            </h2>
            <TypeTabs value={type} onChange={setType} />
          </aside>

          <div ref={editor} className="editor-layout">
            <Card className="content-card flex min-w-0 flex-col gap-5">
              <div className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
                <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">{t('editor.content')}</p>
                <h2 className="text-xl leading-tight font-semibold tracking-tight">{t(typeLabelKey(type))}</h2>
              </div>
              <div
                id={PANEL_ID}
                role="tabpanel"
                aria-labelledby={tabId(type)}
                tabIndex={0}
                className="min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500"
              >
                <ContentForm key={type} type={type} fields={current} errors={built.errors} onChange={updateFields} />
              </div>
            </Card>

            <div className="preview-column">
              <PreviewPanel
                state={preview}
                actionsReady={Boolean(ready)}
                type={type}
                notices={translatedNotices}
                alt={t('preview.alt', { type: t(typeLabelKey(type)), description })}
                prefs={prefs}
                onPrefsChange={updatePrefs}
                onDownload={onDownload}
                onCopyImage={onCopyImage}
                onCopyText={onCopyText}
                onShare={SHARE_SUPPORTED ? onShare : undefined}
                onSave={() => void record(true)}
                canCopyImage={COPY_SUPPORTED}
              />
            </div>

            <div className="style-column min-w-0">
              <StylePanel
                style={style}
                logo={logo}
                onStyleChange={(patch) => setStyle((s) => ({ ...s, ...patch }))}
                onLogoChange={setLogo}
                onReset={() => {
                  setStyle(DEFAULT_STYLE)
                  setLogo(null)
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <footer>
        <p className="mx-auto max-w-6xl px-4 pb-6 text-center text-xs text-zinc-500 sm:px-6 dark:text-zinc-400">
          {t('footer.privacy')}
        </p>
        <SiteBottomBar />
      </footer>
    </div>
  )
}
