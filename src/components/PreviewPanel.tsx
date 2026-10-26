import { useState } from 'react'
import {
  AlertTriangle,
  BookmarkPlus,
  CheckCircle2,
  ClipboardCopy,
  ChevronDown,
  Download,
  Image as ImageIcon,
  Loader2,
  Share2,
  Smartphone,
  XCircle,
} from 'lucide-react'
import type { PreviewState } from '../hooks/useQrPreview'
import { useI18n } from '../i18n/context'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { EXPORT_FORMATS, EXPORT_SIZES, type ExportFormat } from '../lib/qr/render'
import { densityOf } from '../lib/qr/encode'
import type { Preferences } from '../lib/prefs'
import { Card, Select } from './ui'
import { ActionButton } from './ActionButton'
import type { ButtonAction } from '../hooks/useActionFeedback'
import { cx } from '../lib/cx'
import type { ContentType } from '../lib/payload/types'
import { DevicePreview } from './DevicePreview'

export interface Notice {
  level: 'warn' | 'bad'
  message: string
}

interface Props {
  state: PreviewState
  actionsReady: boolean
  type: ContentType
  notices: Notice[]
  alt: string
  prefs: Preferences
  onPrefsChange: (patch: Partial<Preferences>) => void
  onDownload: ButtonAction
  onCopyImage: ButtonAction
  onCopyText: ButtonAction
  onShare?: ButtonAction
  onSave: ButtonAction
  canCopyImage: boolean
}

function ScanBadge({ state }: { state: Extract<PreviewState, { status: 'ready' }> }) {
  const { t } = useI18n()
  const { scan } = state
  if (scan.status === 'skipped') return null
  const variants = {
    checking: { icon: Loader2, text: t('scan.checking'), className: 'text-zinc-500 dark:text-zinc-400', spin: true },
    match: {
      icon: CheckCircle2,
      text: t('scan.match'),
      className: 'text-emerald-600 dark:text-emerald-400',
      spin: false,
    },
    mismatch: {
      icon: AlertTriangle,
      text: t('scan.mismatch'),
      className: 'text-amber-600 dark:text-amber-400',
      spin: false,
    },
    unreadable: { icon: XCircle, text: t('scan.unreadable'), className: 'text-red-600 dark:text-red-400', spin: false },
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

function ScanDemoDisclosure({ type }: { type: ContentType }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <details
      className="group/demo rounded-lg border border-zinc-200 dark:border-zinc-800"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-500 [&::-webkit-details-marker]:hidden">
        <Smartphone className="size-4 shrink-0 text-zinc-500" aria-hidden />
        <span className="flex-1">{t('demo.title')}</span>
        <ChevronDown className="size-4 shrink-0 text-zinc-500 group-open/demo:rotate-180" aria-hidden />
      </summary>
      {open && (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <DevicePreview type={type} />
        </div>
      )}
    </details>
  )
}

export function PreviewPanel(props: Props) {
  const { t } = useI18n()
  const { state, type, notices, alt, prefs, onPrefsChange } = props
  const ready = props.actionsReady
  const wideLayout = useMediaQuery('(min-width: 640px)')

  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <h2 className="text-base font-semibold tracking-tight">{t('preview.title')}</h2>
      {state.status === 'empty' ? (
        wideLayout ? (
          <DevicePreview type={type} />
        ) : (
          <>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('preview.placeholder')}</p>
            <ScanDemoDisclosure key={type} type={type} />
          </>
        )
      ) : (
        <div className="qr-output-image mx-auto aspect-square w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
          {state.status === 'ready' ? (
            <img src={state.url} alt={alt} className="size-full object-contain" data-testid="qr-preview" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <XCircle className="size-10 text-red-500" aria-hidden />
              <p role="alert">{t(state.message)}</p>
            </div>
          )}
        </div>
      )}

      {state.status === 'ready' && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <ScanBadge state={state} />
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400" title={t('preview.statsTitle')}>
            v{state.analysis.version} · {state.analysis.moduleCount}×{state.analysis.moduleCount} ·{' '}
            {state.analysis.bytes} B · EC {state.ecl}
            {densityOf(state.analysis.version) !== 'low' && ` · ${t('preview.dense')}`}
          </span>
        </div>
      )}

      {notices.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={t('preview.warnings')}>
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

      <div
        key={state.status === 'ready' ? state.url : type}
        className={cx('flex-col gap-3', state.status === 'empty' ? 'hidden sm:flex' : 'flex')}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Select
            aria-label={t('export.format')}
            value={prefs.exportFormat}
            onChange={(e) => onPrefsChange({ exportFormat: e.target.value as ExportFormat })}
          >
            {EXPORT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {t(f.label)}
              </option>
            ))}
          </Select>
          <Select
            aria-label={t('export.size')}
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
        <ActionButton
          variant="primary"
          disabled={!ready}
          onAction={props.onDownload}
          icon={Download}
          label={t('action.download')}
          successLabel={t('feedback.downloaded')}
        />
        <div className="grid grid-cols-2 gap-2 [&_button]:px-3 [&_svg]:shrink-0">
          {props.canCopyImage && (
            <ActionButton
              disabled={!ready}
              onAction={props.onCopyImage}
              icon={ImageIcon}
              label={t('action.copyImage')}
              successLabel={t('feedback.copied')}
            />
          )}
          <ActionButton
            disabled={!ready}
            onAction={props.onCopyText}
            icon={ClipboardCopy}
            label={t('action.copyContent')}
            successLabel={t('feedback.copied')}
            className={cx(!props.canCopyImage && 'col-span-2')}
          />
          {props.onShare && (
            <ActionButton
              disabled={!ready}
              onAction={props.onShare}
              icon={Share2}
              label={t('action.share')}
              successLabel={t('feedback.shared')}
            />
          )}
          <ActionButton
            disabled={!ready}
            onAction={props.onSave}
            icon={BookmarkPlus}
            label={t('action.save')}
            successLabel={t('feedback.saved')}
            className={cx(!props.onShare && 'col-span-2')}
          />
        </div>
      </div>

      <p
        className={cx(
          'text-xs leading-relaxed text-zinc-500 dark:text-zinc-400',
          state.status === 'empty' && 'hidden sm:block',
        )}
      >
        {t('preview.printTip')}
      </p>
    </Card>
  )
}
