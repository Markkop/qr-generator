import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Image as ImageIcon,
  Loader2,
  QrCode,
  Share2,
  XCircle,
} from 'lucide-react'
import type { PreviewState } from '../hooks/useQrPreview'
import { EXPORT_FORMATS, EXPORT_SIZES, type ExportFormat } from '../lib/qr/render'
import { densityOf } from '../lib/qr/encode'
import type { Preferences } from '../lib/prefs'
import { Button, Card, Select } from './ui'
import { cx } from '../lib/cx'

export interface Notice {
  level: 'warn' | 'bad'
  message: string
}

interface Props {
  state: PreviewState
  hint?: string
  notices: Notice[]
  alt: string
  prefs: Preferences
  onPrefsChange: (patch: Partial<Preferences>) => void
  onDownload: () => void
  onCopyImage: () => void
  onCopyText: () => void
  onShare?: () => void
  onSave: () => void
  canCopyImage: boolean
}

function ScanBadge({ state }: { state: Extract<PreviewState, { status: 'ready' }> }) {
  const { scan } = state
  if (scan.status === 'skipped') return null
  const variants = {
    checking: { icon: Loader2, text: 'Checking scan...', className: 'text-zinc-500 dark:text-zinc-400', spin: true },
    match: { icon: CheckCircle2, text: 'Scans OK', className: 'text-emerald-600 dark:text-emerald-400', spin: false },
    mismatch: {
      icon: AlertTriangle,
      text: 'Scans, but the content differs',
      className: 'text-amber-600 dark:text-amber-400',
      spin: false,
    },
    unreadable: { icon: XCircle, text: 'May not scan', className: 'text-red-600 dark:text-red-400', spin: false },
  } as const
  const v = variants[scan.status]
  const Icon = v.icon
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 text-sm font-medium', v.className)}
      data-testid="scan-status"
      data-status={scan.status}
    >
      <Icon className={cx('size-4', v.spin && 'motion-safe:animate-spin')} aria-hidden />
      {v.text}
    </span>
  )
}

export function PreviewPanel(props: Props) {
  const { state, hint, notices, alt, prefs, onPrefsChange } = props
  const ready = state.status === 'ready'

  return (
    <Card className="flex flex-col gap-4">
      <div className="mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        {state.status === 'ready' ? (
          <img src={state.url} alt={alt} className="size-full object-contain" data-testid="qr-preview" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {state.status === 'error' ? (
              <>
                <XCircle className="size-10 text-red-500" aria-hidden />
                <p role="alert">{state.message}</p>
              </>
            ) : (
              <>
                <QrCode className="size-14 text-zinc-300 dark:text-zinc-700" aria-hidden />
                <p>{hint ?? 'Your QR code will appear here.'}</p>
              </>
            )}
          </div>
        )}
      </div>

      {state.status === 'ready' && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <ScanBadge state={state} />
          <span
            className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400"
            title="QR version, grid size, content size and error correction level"
          >
            v{state.analysis.version} · {state.analysis.moduleCount}×{state.analysis.moduleCount} ·{' '}
            {state.analysis.bytes} B · EC {state.ecl}
            {densityOf(state.analysis.version) !== 'low' && ' · dense'}
          </span>
        </div>
      )}

      {notices.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Warnings">
          {notices.map((notice) => (
            <li
              key={notice.message}
              className={cx(
                'flex gap-2 rounded-lg px-3 py-2 text-xs',
                notice.level === 'bad'
                  ? 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                  : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
              )}
            >
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
              {notice.message}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Select
            aria-label="File format"
            value={prefs.exportFormat}
            onChange={(e) => onPrefsChange({ exportFormat: e.target.value as ExportFormat })}
          >
            {EXPORT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Image size"
            value={prefs.exportSize}
            disabled={prefs.exportFormat === 'svg'}
            onChange={(e) => onPrefsChange({ exportSize: Number(e.target.value) })}
            className="w-28"
          >
            {EXPORT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} px
              </option>
            ))}
          </Select>
        </div>
        <Button variant="primary" disabled={!ready} onClick={props.onDownload}>
          <Download className="size-4" aria-hidden />
          Download
        </Button>
        <div className="grid grid-cols-2 gap-2">
          {props.canCopyImage && (
            <Button disabled={!ready} onClick={props.onCopyImage}>
              <ImageIcon className="size-4" aria-hidden />
              Copy image
            </Button>
          )}
          <Button disabled={!ready} onClick={props.onCopyText} className={cx(!props.canCopyImage && 'col-span-2')}>
            <ClipboardCopy className="size-4" aria-hidden />
            Copy content
          </Button>
          {props.onShare && (
            <Button disabled={!ready} onClick={props.onShare}>
              <Share2 className="size-4" aria-hidden />
              Share
            </Button>
          )}
          <Button disabled={!ready} onClick={props.onSave} className={cx(!props.onShare && 'col-span-2')}>
            <BookmarkPlus className="size-4" aria-hidden />
            Save to history
          </Button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        For print, use SVG and keep the code at least 2 cm wide. A good rule is width = scanning distance ÷ 10. Always
        test a print with a couple of phones.
      </p>
    </Card>
  )
}
