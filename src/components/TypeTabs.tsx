import { useRef, useSyncExternalStore, type KeyboardEvent } from 'react'
import {
  AtSign,
  CalendarDays,
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
import { CONTENT_TYPES, typeLabelKey, type ContentType } from '../lib/payload/types'
import { cx } from '../lib/cx'
import { PANEL_ID, tabId } from './tabs'

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

const VERTICAL_LAYOUT = '(min-width: 640px)'

function subscribeLayout(onChange: () => void) {
  const query = window.matchMedia(VERTICAL_LAYOUT)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function isVerticalLayout() {
  return window.matchMedia(VERTICAL_LAYOUT).matches
}

export function TypeTabs({ value, onChange }: { value: ContentType; onChange: (type: ContentType) => void }) {
  const { t } = useI18n()
  const refs = useRef<Partial<Record<ContentType, HTMLButtonElement | null>>>({})
  const vertical = useSyncExternalStore(subscribeLayout, isVerticalLayout, () => false)

  const onKeyDown = (event: KeyboardEvent) => {
    const index = CONTENT_TYPES.indexOf(value)
    const columns = vertical ? 1 : 4
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + columns,
      ArrowLeft: index - 1,
      ArrowUp: index - columns,
      Home: 0,
      End: CONTENT_TYPES.length - 1,
    }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = CONTENT_TYPES[(moves[event.key] + CONTENT_TYPES.length) % CONTENT_TYPES.length]
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={t('tabs.label')}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
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
