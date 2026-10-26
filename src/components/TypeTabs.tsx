import { useRef, type KeyboardEvent } from 'react'
import {
  AtSign,
  CalendarDays,
  ChevronDown,
  Landmark,
  Send,
  Contact,
  Link,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Type,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { CONTENT_TYPES, typeLabelKey, type ContentType } from '../lib/payload/types'
import { cx } from '../lib/cx'
import { PANEL_ID, TYPE_VALUE_ID, tabId } from './tabs'

const ICONS: Record<ContentType, LucideIcon> = {
  url: Link,
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

export function TypeTabs({ value, onChange }: { value: ContentType; onChange: (type: ContentType) => void }) {
  const { t } = useI18n()
  const refs = useRef<Partial<Record<ContentType, HTMLButtonElement | null>>>({})
  const vertical = useMediaQuery('(min-width: 640px)')

  const onKeyDown = (event: KeyboardEvent) => {
    const index = CONTENT_TYPES.indexOf(value)
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: CONTENT_TYPES.length - 1,
    }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = CONTENT_TYPES[(moves[event.key] + CONTENT_TYPES.length) % CONTENT_TYPES.length]
    onChange(next)
    refs.current[next]?.focus()
  }

  if (!vertical) {
    const Icon = ICONS[value]
    return (
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">{t('tabs.label')}</span>
        <span id={TYPE_VALUE_ID} className="sr-only">
          {t(typeLabelKey(value))}
        </span>
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-indigo-600 dark:text-indigo-300"
          aria-hidden
        />
        <select
          value={value}
          aria-label={t('tabs.label')}
          aria-controls={PANEL_ID}
          onChange={(event) => onChange(event.target.value as ContentType)}
          className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg bg-surface pr-7 pl-9 text-base font-medium focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          {CONTENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(typeLabelKey(type))}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-zinc-500"
          aria-hidden
        />
      </label>
    )
  }

  return (
    <div
      role="tablist"
      aria-label={t('tabs.label')}
      aria-orientation="vertical"
      className="type-tabs"
      onKeyDown={onKeyDown}
    >
      {CONTENT_TYPES.map((type) => {
        const Icon = ICONS[type]
        const selected = type === value
        return (
          <button
            key={type}
            ref={(el) => {
              refs.current[type] = el
            }}
            id={tabId(type)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(type)}
            className={cx(
              'type-tab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
              selected
                ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                : 'text-zinc-600 hover:bg-soft hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{t(typeLabelKey(type))}</span>
          </button>
        )
      })}
    </div>
  )
}
