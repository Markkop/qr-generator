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
import { prepareLogo } from '../lib/logo'
import { Button, ColorInput, Field, Segmented, Select, Switch } from './ui'
import { useToast } from './toast-context'

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
  const fileInput = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const effectiveEcl = resolveErrorCorrection(style, Boolean(logo))

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      onLogoChange(await prepareLogo(file))
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load that image.', 'error')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl p-4 select-none sm:px-5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-semibold">Style</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            Colors, shapes, logo and error correction
          </span>
        </span>
        <ChevronDown className="size-5 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="flex flex-col gap-5 border-t border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-4">
          <ColorInput
            label="Code color"
            value={style.foreground}
            onChange={(foreground) => onStyleChange({ foreground })}
          />
          <ColorInput
            label="Background"
            value={style.background}
            onChange={(background) => onStyleChange({ background })}
          />
        </div>

        <Switch
          checked={style.cornerColor !== null}
          onChange={(on) => onStyleChange({ cornerColor: on ? style.foreground : null })}
          label="Different corner color"
          description="Brand color on the three corner squares only."
        />
        {style.cornerColor !== null && (
          <ColorInput
            label="Corner color"
            value={style.cornerColor}
            onChange={(cornerColor) => onStyleChange({ cornerColor })}
          />
        )}

        <Segmented
          label="Dots"
          value={style.dotStyle}
          options={DOT_STYLES}
          onChange={(dotStyle) => onStyleChange({ dotStyle })}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Segmented
            label="Corner frame"
            value={style.cornerSquareStyle}
            options={CORNER_SQUARE_STYLES}
            onChange={(cornerSquareStyle) => onStyleChange({ cornerSquareStyle })}
          />
          <Segmented
            label="Corner center"
            value={style.cornerDotStyle}
            options={CORNER_DOT_STYLES}
            onChange={(cornerDotStyle) => onStyleChange({ cornerDotStyle })}
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Logo</span>
          <div className="flex items-center gap-3">
            {logo ? (
              <img
                src={logo}
                alt="Selected logo"
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
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button size="sm" onClick={() => fileInput.current?.click()}>
              {logo ? 'Replace' : 'Upload logo'}
            </Button>
            {logo && (
              <Button size="sm" variant="danger" onClick={() => onLogoChange(null)}>
                <Trash2 className="size-3.5" aria-hidden />
                Remove
              </Button>
            )}
          </div>
          {logo && (
            <Slider
              label="Logo size"
              value={style.logoSize}
              min={MIN_LOGO_SIZE}
              max={MAX_LOGO_SIZE}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}% width`}
              onChange={(logoSize) => onStyleChange({ logoSize })}
            />
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The logo stays on your device. It goes in the center, with error correction raised to H.
          </p>
        </div>

        <Field
          label="Error correction"
          hint={`In use: ${effectiveEcl}. Higher levels survive damage and logos but make the code denser.`}
        >
          {(p) => (
            <Select
              {...p}
              value={style.errorCorrection}
              onChange={(e) => onStyleChange({ errorCorrection: e.target.value as QrStyle['errorCorrection'] })}
            >
              <option value="auto">Auto (M, or H with a logo)</option>
              <option value="L">L: recovers about 7%</option>
              <option value="M">M: recovers about 15%</option>
              <option value="Q">Q: recovers about 25%</option>
              <option value="H">H: recovers about 30%</option>
            </Select>
          )}
        </Field>

        <Slider
          label="Quiet zone (margin)"
          value={style.quietZone}
          min={MIN_QUIET_ZONE}
          max={MAX_QUIET_ZONE}
          step={1}
          format={(v) => `${v} module${v === 1 ? '' : 's'}${v === DEFAULT_STYLE.quietZone ? ' (spec)' : ''}`}
          onChange={(quietZone) => onStyleChange({ quietZone })}
        />

        <Button variant="ghost" size="sm" className="self-start" onClick={onReset}>
          <RotateCcw className="size-3.5" aria-hidden />
          Reset style
        </Button>
      </div>
    </details>
  )
}
