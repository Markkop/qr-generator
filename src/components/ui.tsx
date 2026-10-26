import { ClipboardPaste, Eraser } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { cx } from '../lib/cx'
import {
  forwardRef,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { useToast } from './toast-context'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-600/50',
  secondary:
    'border border-zinc-300 bg-surface text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  ghost: 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
  danger: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'md' ? 'min-h-11 px-4 py-2 text-sm' : 'min-h-11 px-2.5 py-2 text-xs sm:min-h-8 sm:py-1',
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

const controlClass =
  'min-w-0 w-full rounded-lg border border-zinc-300 bg-field px-3 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 aria-invalid:border-red-500'

interface FieldProps {
  label: string
  error?: string
  hint?: ReactNode
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  className?: string
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx(controlClass, 'h-11', className)} {...props} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cx(controlClass, 'min-h-24 py-2', className)} {...props} />
})

function writeControlValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

const fieldActionClass =
  'inline-flex size-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-surface text-sm font-medium whitespace-nowrap text-zinc-900 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:w-auto sm:px-2.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'

function PasteButton({
  control,
  label,
}: {
  control: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  label: string
}) {
  const { t } = useI18n()
  const toast = useToast()
  return (
    <button
      type="button"
      aria-label={t('field.pasteInto', { label })}
      title={t('field.pasteInto', { label })}
      onClick={() => {
        const element = control.current
        if (!element) return
        void navigator.clipboard
          .readText()
          .then((text) => {
            writeControlValue(element, text)
            element.focus()
          })
          .catch(() => toast(t('field.pasteFailed'), 'error'))
      }}
      className={fieldActionClass}
    >
      <ClipboardPaste className="size-4" aria-hidden />
      <span className="hidden sm:inline">{t('field.paste')}</span>
    </button>
  )
}

function ClearButton({
  control,
  label,
}: {
  control: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  label: string
}) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      aria-label={t('field.clearFrom', { label })}
      title={t('field.clearFrom', { label })}
      onClick={() => {
        const element = control.current
        if (!element) return
        writeControlValue(element, '')
        element.focus()
      }}
      className={fieldActionClass}
    >
      <Eraser className="size-4" aria-hidden />
      <span className="hidden sm:inline">{t('field.clear')}</span>
    </button>
  )
}

export function FieldActions({
  control,
  label,
}: {
  control: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  label: string
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <PasteButton control={control} label={label} />
      <ClearButton control={control} label={label} />
    </div>
  )
}

export function PasteInput({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <TextInput ref={ref} className={cx('min-w-32 flex-1 basis-32', className)} {...props} />
      <FieldActions control={ref} label={label} />
    </div>
  )
}

export function PasteArea({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  return (
    <div className="flex flex-col items-end gap-1.5">
      <TextArea ref={ref} className={cx('w-full', className)} {...props} />
      <FieldActions control={ref} label={label} />
    </div>
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(controlClass, 'h-11 pr-8', className)} {...props} />
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="flex flex-col">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        {description && <span className="text-xs text-zinc-500 dark:text-zinc-400">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
          checked ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cx(
              'min-h-11 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-8 sm:py-1',
              value === option.value
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300'
                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  const { t } = useI18n()
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setDraft(value)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-field px-2 dark:border-zinc-700 dark:bg-zinc-900">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          aria-label={t('style.hexValue', { label })}
          value={draft}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value)
            const next = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase())
          }}
          onBlur={() => setDraft(value)}
          className="w-full bg-transparent font-mono text-sm uppercase text-zinc-900 focus:outline-none dark:text-zinc-100"
        />
      </div>
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cx(
        'rounded-2xl border border-zinc-200 bg-surface p-4 shadow-sm sm:p-5 dark:border-zinc-800',
        className,
      )}
    >
      {children}
    </section>
  )
}
