import { useRef, type KeyboardEvent } from 'react'
import { AtSign, Contact, Link, MapPin, MessageSquare, Phone, Type, Wifi, type LucideIcon } from 'lucide-react'
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
  sms: MessageSquare,
  contact: Contact,
  location: MapPin,
}

export function TypeTabs({ value, onChange }: { value: ContentType; onChange: (type: ContentType) => void }) {
  const { t } = useI18n()
  const refs = useRef<Partial<Record<ContentType, HTMLButtonElement | null>>>({})

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

  return (
    <div role="tablist" aria-label={t('tabs.label')} className="grid grid-cols-4 gap-1.5" onKeyDown={onKeyDown}>
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
              'flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
              selected
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-indigo-300'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/60',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {t(typeLabelKey(type))}
          </button>
        )
      })}
    </div>
  )
}
