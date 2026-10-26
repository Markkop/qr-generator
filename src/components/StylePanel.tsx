import { useId, useRef } from 'react'
import { ChevronDown, ImagePlus, RotateCcw, Trash2 } from 'lucide-react'
import {
  CORNER_DOT_STYLES,
  CORNER_SQUARE_STYLES,
  DEFAULT_STYLE,
  DOT_STYLES,
  MAX_LOGO_SIZE,
  MAX_QUIET_ZONE,
  MIN_LOGO_SIZE,
  MIN_QUIET_ZONE,
  resolveErrorCorrection,
  type QrStyle,
} from '../lib/qr/style'
import { useI18n } from '../i18n/context'
import { AppError } from '../lib/errors'
import { prepareLogo } from '../lib/logo'
import { Button, ColorInput, Field, Segmented, Select, Switch } from './ui'
import { useToast } from './toast-context'
import { ActionButton, FeedbackButton } from './ActionButton'
import { useActionFeedback } from '../hooks/useActionFeedback'

interface Props {
  style: QrStyle
  logo: string | null
  onStyleChange: (patch: Partial<QrStyle>) => void
  onLogoChange: (logo: string | null) => void
  onReset: () => void
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-indigo-600"
      />
    </div>
  )
}

export function StylePanel({ style, logo, onStyleChange, onLogoChange, onReset }: Props) {
  const { t, tn } = useI18n()
  const fileInput = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const effectiveEcl = resolveErrorCorrection(style, Boolean(logo))
  const upload = useActionFeedback()

  const onFile = async (file: File | undefined) => {
    if (!file) return false
    try {
      onLogoChange(await prepareLogo(file))
    } catch (error) {
      toast(t(error instanceof AppError ? error.key : 'logo.errorLoad'), 'error')
      throw error
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <details className="group rounded-2xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 select-none hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold">{t('style.title')}</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{t('style.subtitle')}</span>
        </span>
        <ChevronDown className="size-5 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="flex flex-col gap-5 border-t border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-4">
          <ColorInput
            label={t('style.foreground')}
            value={style.foreground}
            onChange={(foreground) => onStyleChange({ foreground })}
          />
          <ColorInput
            label={t('style.background')}
            value={style.background}
            onChange={(background) => onStyleChange({ background })}
          />
        </div>

        <Switch
          checked={style.cornerColor !== null}
          onChange={(on) => onStyleChange({ cornerColor: on ? style.foreground : null })}
          label={t('style.cornerToggle')}
          description={t('style.cornerHint')}
        />
        {style.cornerColor !== null && (
          <ColorInput
            label={t('style.cornerColor')}
            value={style.cornerColor}
            onChange={(cornerColor) => onStyleChange({ cornerColor })}
          />
        )}

        <Segmented
          label={t('style.dots')}
          value={style.dotStyle}
          options={DOT_STYLES.map((o) => ({ value: o.value, label: t(o.label) }))}
          onChange={(dotStyle) => onStyleChange({ dotStyle })}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Segmented
            label={t('style.cornerFrame')}
            value={style.cornerSquareStyle}
            options={CORNER_SQUARE_STYLES.map((o) => ({ value: o.value, label: t(o.label) }))}
            onChange={(cornerSquareStyle) => onStyleChange({ cornerSquareStyle })}
          />
          <Segmented
            label={t('style.cornerCenter')}
            value={style.cornerDotStyle}
            options={CORNER_DOT_STYLES.map((o) => ({ value: o.value, label: t(o.label) }))}
            onChange={(cornerDotStyle) => onStyleChange({ cornerDotStyle })}
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('logo.title')}</span>
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt={t('logo.selected')}
                className="size-12 rounded-lg border border-zinc-200 bg-white object-contain p-1 dark:border-zinc-700"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
                <ImagePlus className="size-5" aria-hidden />
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                void upload.run(() => onFile(file))
              }}
            />
            <FeedbackButton
              state={upload.state}
              size="sm"
              onClick={() => fileInput.current?.click()}
              icon={ImagePlus}
              label={logo ? t('logo.replace') : t('logo.upload')}
            />
            {logo && (
              <Button size="sm" variant="danger" onClick={() => onLogoChange(null)}>
                <Trash2 className="size-3.5" aria-hidden />
                {t('logo.remove')}
              </Button>
            )}
          </div>
          {logo && (
            <Slider
              label={t('logo.size')}
              value={style.logoSize}
              min={MIN_LOGO_SIZE}
              max={MAX_LOGO_SIZE}
              step={0.01}
              format={(v) => t('logo.sizeValue', { percent: Math.round(v * 100) })}
              onChange={(logoSize) => onStyleChange({ logoSize })}
            />
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('logo.note')}</p>
        </div>

        <Field label={t('ecl.label')} hint={t('ecl.hint', { ecl: effectiveEcl })}>
          {(p) => (
            <Select
              {...p}
              value={style.errorCorrection}
              onChange={(e) => onStyleChange({ errorCorrection: e.target.value as QrStyle['errorCorrection'] })}
            >
              <option value="auto">{t('ecl.auto')}</option>
              {(['L', 'M', 'Q', 'H'] as const).map((level) => (
                <option key={level} value={level}>
                  {t(`ecl.${level}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Slider
          label={t('quiet.label')}
          value={style.quietZone}
          min={MIN_QUIET_ZONE}
          max={MAX_QUIET_ZONE}
          step={1}
          format={(v) => {
            const value = tn('quiet.value', v)
            return v === DEFAULT_STYLE.quietZone ? t('quiet.spec', { value }) : value
          }}
          onChange={(quietZone) => onStyleChange({ quietZone })}
        />

        <ActionButton
          variant="ghost"
          size="sm"
          className="self-start"
          onAction={onReset}
          icon={RotateCcw}
          label={t('style.reset')}
          successLabel={t('feedback.reset')}
        />
      </div>
    </details>
  )
}
