import { useCallback, useMemo, useRef, useState } from 'react'
import { Monitor, Moon, QrCode, Sun } from 'lucide-react'
import { ContentForm } from './components/ContentForm'
import { HistoryPanel } from './components/HistoryPanel'
import { PreviewPanel, type Notice } from './components/PreviewPanel'
import { StylePanel } from './components/StylePanel'
import { useToast } from './components/toast-context'
import { TypeTabs } from './components/TypeTabs'
import { PANEL_ID, tabId } from './components/tabs'
import { Button, Card } from './components/ui'
import { useQrPreview } from './hooks/useQrPreview'
import { getLogo, requestPersistentStorage, saveEntry, type HistoryEntry } from './lib/db'
import { canCopyImage, canShareFiles, copyImage, copyText, downloadBlob, fileName, shareImage } from './lib/export'
import { buildPayload, describe } from './lib/payload/build'
import { DEFAULT_FIELDS, TYPE_LABELS, type AllFields, type ContentType, type FieldsByType } from './lib/payload/types'
import { checkColors } from './lib/qr/color'
import { densityOf } from './lib/qr/encode'
import { renderQr } from './lib/qr/render'
import { DEFAULT_STYLE, resolveErrorCorrection, sanitizeStyle, type QrStyle } from './lib/qr/style'
import { useApplyTheme, usePreferences, type Theme } from './lib/prefs'

const THEME_CYCLE: Record<Theme, { next: Theme; icon: typeof Sun; label: string }> = {
  system: { next: 'light', icon: Monitor, label: 'Theme: system' },
  light: { next: 'dark', icon: Sun, label: 'Theme: light' },
  dark: { next: 'system', icon: Moon, label: 'Theme: dark' },
}

const COPY_SUPPORTED = canCopyImage()
const SHARE_SUPPORTED = canShareFiles()

export default function App() {
  const toast = useToast()
  const [prefs, updatePrefs] = usePreferences()
  useApplyTheme(prefs.theme)

  const [type, setType] = useState<ContentType>('url')
  const [fields, setFields] = useState<AllFields>(DEFAULT_FIELDS)
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE)
  const [logo, setLogo] = useState<string | null>(null)
  const persistRequested = useRef(false)

  const current = fields[type]
  const built = useMemo(() => buildPayload(type, current), [type, current])
  const renderInput = useMemo(
    () => (built.payload ? { payload: built.payload, style, logo } : null),
    [built.payload, style, logo],
  )
  const preview = useQrPreview(renderInput)
  const description = describe(type, current)

  const notices = useMemo(() => {
    const list: Notice[] = built.warnings.map((message) => ({ level: 'warn', message }))
    const colors = checkColors(style.foreground, style.background)
    if (colors.message) list.push({ level: colors.level === 'bad' ? 'bad' : 'warn', message: colors.message })
    if (style.cornerColor) {
      const corners = checkColors(style.cornerColor, style.background)
      if (corners.level === 'bad')
        list.push({
          level: 'bad',
          message: 'The corner color barely contrasts with the background. Scanners locate the code by those corners.',
        })
    }
    if (style.quietZone < 4)
      list.push({
        level: 'warn',
        message: 'The QR spec asks for a 4-module margin. Smaller margins can fail next to other artwork.',
      })
    const ecl = resolveErrorCorrection(style, Boolean(logo))
    if (logo && (ecl === 'L' || ecl === 'M'))
      list.push({
        level: 'warn',
        message: `A logo with error correction ${ecl} leaves little room for damage. Use Q or H.`,
      })
    if (preview.status === 'ready') {
      const density = densityOf(preview.analysis.version)
      if (density === 'medium')
        list.push({ level: 'warn', message: 'This is a dense code. Print it larger, or shorten the content.' })
      if (density === 'high')
        list.push({
          level: 'bad',
          message: 'This code is very dense and will be hard to scan. Shorten the content if you can.',
        })
      if (preview.scan.status === 'unreadable')
        list.push({
          level: 'bad',
          message: 'Our scanner could not read this code. Increase contrast, shrink the logo or pick simpler shapes.',
        })
      if (preview.scan.status === 'mismatch')
        list.push({ level: 'bad', message: 'The code scans, but returns different content than expected.' })
    }
    return list
  }, [built.warnings, style, logo, preview])

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
      if (force) toast('Saved to history.')
    } catch {
      toast('Could not save to history. Storage may be full or disabled.', 'error')
    }
  }

  const onDownload = async () => {
    if (!ready) return
    try {
      const { blob } = await renderQr({ payload: ready.payload, style, logo }, prefs.exportSize, prefs.exportFormat)
      downloadBlob(blob, fileName(type, description, prefs.exportFormat))
      toast('Downloaded.')
      void record()
    } catch {
      toast('Download failed.', 'error')
    }
  }

  const onCopyImage = () => {
    if (!ready) return
    copyImage(Promise.resolve(ready.blob))
      .then(() => {
        toast('Image copied.')
        void record()
      })
      .catch(() => toast('Your browser blocked copying images. Use Download instead.', 'error'))
  }

  const onCopyText = () => {
    if (!ready) return
    copyText(ready.payload)
      .then(() => {
        toast('Content copied.')
        void record()
      })
      .catch(() => toast('Could not copy to the clipboard.', 'error'))
  }

  const onShare = () => {
    if (!ready) return
    shareImage(ready.blob, fileName(type, description, 'png'), `${TYPE_LABELS[type]} QR code`)
      .then((outcome) => {
        if (outcome === 'shared') void record()
      })
      .catch(() => toast('Sharing failed.', 'error'))
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
    toast('Loaded into the editor.')
  }

  const theme = THEME_CYCLE[prefs.theme]
  const ThemeIcon = theme.icon

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <QrCode className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg leading-tight font-semibold">QR Generator</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Free, private, works offline</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updatePrefs({ theme: theme.next })}
          aria-label={`${theme.label}. Switch theme.`}
          title={theme.label}
        >
          <ThemeIcon className="size-4" aria-hidden />
        </Button>
      </header>

      <main id="main" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr]">
          <Card className="flex flex-col gap-5">
            <TypeTabs value={type} onChange={setType} />
            <div id={PANEL_ID} role="tabpanel" aria-labelledby={tabId(type)}>
              <ContentForm key={type} type={type} fields={current} errors={built.errors} onChange={updateFields} />
            </div>
          </Card>

          <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <PreviewPanel
              state={preview}
              hint={built.hint}
              notices={notices}
              alt={`QR code for ${TYPE_LABELS[type]}: ${description}`}
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

        <HistoryPanel
          saveHistory={prefs.saveHistory}
          onSaveHistoryChange={(saveHistory) => updatePrefs({ saveHistory })}
          onOpen={onOpen}
        />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-zinc-500 sm:px-6 dark:text-zinc-400">
        Everything runs in your browser. Nothing you type is uploaded, and there is no tracking.{' '}
        <a
          href="https://github.com/Markkop/qr-generator"
          className="underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Source on GitHub
        </a>
      </footer>
    </div>
  )
}
