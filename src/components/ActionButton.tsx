import { Check, Loader2, X, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useActionFeedback, type ActionState, type ButtonAction } from '../hooks/useActionFeedback'
import { useI18n } from '../i18n/context'
import { cx } from '../lib/cx'
import { Button } from './Button'

interface FeedbackProps extends Omit<ComponentProps<typeof Button>, 'children'> {
  state: ActionState
  label: string
  icon: LucideIcon
  successLabel?: string
  pendingLabel?: string
  compact?: boolean
  iconOnly?: boolean
}

export function FeedbackButton({
  state,
  label,
  icon: Icon,
  successLabel,
  pendingLabel,
  compact,
  iconOnly,
  disabled,
  className,
  onClick,
  ...props
}: FeedbackProps) {
  const { t } = useI18n()
  const message =
    state === 'pending'
      ? pendingLabel || t('feedback.working')
      : state === 'success'
        ? successLabel || t('feedback.done')
        : state === 'error'
          ? t('feedback.retry')
          : ''
  const StatusIcon = state === 'pending' ? Loader2 : state === 'success' ? Check : X
  const textClass = iconOnly ? 'sr-only' : compact ? 'hidden sm:inline' : ''
  const accessibleLabel = props['aria-label'] || label
  return (
    <Button
      {...props}
      disabled={disabled}
      aria-label={accessibleLabel}
      aria-disabled={disabled || state === 'pending'}
      aria-busy={state === 'pending'}
      data-state={state}
      onClick={(event) => {
        if (state === 'pending' || disabled) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      className={cx(
        'relative data-[state=pending]:cursor-wait data-[state=success]:bg-emerald-50 data-[state=success]:text-emerald-800 data-[state=success]:ring-1 data-[state=success]:ring-emerald-600/30 data-[state=error]:bg-red-50 data-[state=error]:text-red-800 data-[state=error]:ring-1 data-[state=error]:ring-red-600/30 dark:data-[state=success]:bg-emerald-950 dark:data-[state=success]:text-emerald-300 dark:data-[state=error]:bg-red-950 dark:data-[state=error]:text-red-300',
        className,
      )}
    >
      <span
        className={cx('inline-flex items-center justify-center gap-2', state !== 'idle' && 'invisible')}
        aria-hidden
      >
        <Icon className="size-4 shrink-0" />
        <span className={textClass}>{label}</span>
      </span>
      {state !== 'idle' && (
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 overflow-hidden px-1" aria-hidden>
          <StatusIcon className={cx('size-4 shrink-0', state === 'pending' && 'motion-safe:animate-spin')} />
          <span className={cx('min-w-0 truncate', textClass)}>{message}</span>
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {message && `${accessibleLabel}: ${message}`}
      </span>
    </Button>
  )
}

export function ActionButton({
  onAction,
  ...props
}: Omit<FeedbackProps, 'state' | 'onClick'> & { onAction: ButtonAction }) {
  const { state, run } = useActionFeedback()
  return <FeedbackButton {...props} state={state} onClick={() => void run(onAction)} />
}
