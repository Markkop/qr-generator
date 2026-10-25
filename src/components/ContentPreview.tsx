import { useState } from 'react'
import {
  AtSign,
  CalendarDays,
  Contact,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Landmark,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  Type,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import { useLinkMetadata } from '../hooks/useLinkMetadata'
import { contentSummary } from '../lib/content-summary'
import { typeLabelKey, type ContentType, type FieldsByType } from '../lib/payload/types'

const ICONS: Record<ContentType, LucideIcon> = {
  url: Globe,
  text: Type,
  wifi: Wifi,
  email: AtSign,
  phone: Phone,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  contact: Contact,
  location: MapPin,
  pix: Landmark,
  calendar: CalendarDays,
  telegram: Send,
}

export function ContentPreview<T extends ContentType>({
  type,
  fields,
  payload,
}: {
  type: T
  fields: FieldsByType[T]
  payload: string | null
}) {
  const i18n = useI18n()
  const { t } = i18n
  const metadata = useLinkMetadata(type === 'url' ? payload : null)
  const [showPassword, setShowPassword] = useState(false)
  if (!payload) return null
  const summary =
    type === 'url'
      ? metadata && {
          title: metadata.title,
          subtitle: metadata.siteName,
          body: metadata.description,
          details: [],
        }
      : contentSummary(type, fields, i18n)
  if (!summary) return null
  const Icon: LucideIcon = ICONS[type]

  return (
    <section
      aria-label={t('summary.label')}
      data-testid="content-preview"
      className="mt-5 min-w-0 rounded-xl border border-zinc-200 bg-field p-4 dark:border-zinc-700 dark:bg-zinc-900/60"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-soft text-indigo-700 dark:text-indigo-300">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {metadata ? new URL(metadata.url).hostname : t(typeLabelKey(type))}
          </p>
          {summary.title && (
            <h3 className="mt-0.5 text-sm leading-snug font-semibold [overflow-wrap:anywhere]">{summary.title}</h3>
          )}
          {summary.subtitle && (
            <p className="mt-1 text-xs text-zinc-600 [overflow-wrap:anywhere] dark:text-zinc-400">{summary.subtitle}</p>
          )}
          {summary.body && (
            <p className="mt-1.5 max-h-32 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
              {summary.body}
            </p>
          )}
        </div>
        {(type === 'url' || type === 'location') && (
          <a
            href={payload}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(type === 'url' ? 'summary.openLink' : 'summary.openLocation')}
            title={t(type === 'url' ? 'summary.openLink' : 'summary.openLocation')}
            className="-mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-soft hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:text-indigo-300"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
      {summary.details.length > 0 && (
        <dl className="mt-3 grid min-w-0 gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {summary.details.map(({ label, value, sensitive }) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="mt-0.5 flex min-w-0 items-start gap-2 text-sm">
                <span className="min-w-0 flex-1 max-h-32 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {sensitive && !showPassword ? '••••••••' : value}
                </span>
                {sensitive && (
                  <button
                    type="button"
                    aria-label={t(showPassword ? 'wifi.hidePassword' : 'wifi.showPassword')}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((shown) => !shown)}
                    className="-my-3 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-soft focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
