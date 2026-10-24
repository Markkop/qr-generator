import type { MessageKey } from '../../i18n/messages'
import QRCodeStyling, { type Options } from 'qr-code-styling'
import { analyze, type Analysis, type ErrorCorrection } from './encode'
import { resolveErrorCorrection, type QrStyle } from './style'

export type ExportFormat = 'png' | 'svg' | 'jpeg' | 'webp'

export const EXPORT_FORMATS: { value: ExportFormat; label: MessageKey; mime: string }[] = [
  { value: 'png', label: 'format.png', mime: 'image/png' },
  { value: 'svg', label: 'format.svg', mime: 'image/svg+xml' },
  { value: 'jpeg', label: 'format.jpeg', mime: 'image/jpeg' },
  { value: 'webp', label: 'format.webp', mime: 'image/webp' },
]

export const EXPORT_SIZES = [256, 512, 1024, 2048] as const

/** Share of codewords each level can recover, used to size the logo knockout. */
const RECOVERY: Record<ErrorCorrection, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 }

export interface RenderInput {
  payload: string
  style: QrStyle
  /** Data URL. Kept local so the canvas is never tainted. */
  logo: string | null
}

export function buildOptions({ payload, style, logo }: RenderInput, size: number, type: 'canvas' | 'svg') {
  const ecl = resolveErrorCorrection(style, Boolean(logo))
  const analysis = analyze(payload, ecl)
  const margin = Math.floor((size * style.quietZone) / (analysis.moduleCount + 2 * style.quietZone))
  const cornerColor = style.cornerColor ?? style.foreground
  const options: Partial<Options> = {
    type,
    width: size,
    height: size,
    margin,
    data: analysis.encoded,
    qrOptions: { typeNumber: 0, mode: analysis.mode, errorCorrectionLevel: ecl },
    dotsOptions: { type: style.dotStyle, color: style.foreground, roundSize: true },
    cornersSquareOptions: { type: style.cornerSquareStyle, color: cornerColor },
    cornersDotOptions: { type: style.cornerDotStyle, color: cornerColor },
    backgroundOptions: { color: style.background },
  }
  if (logo) {
    options.image = logo
    options.imageOptions = {
      hideBackgroundDots: true,
      // qr-code-styling sizes the logo as a share of the recoverable area, so convert from side length.
      imageSize: Math.min(1, style.logoSize ** 2 / RECOVERY[ecl]),
      margin: Math.max(2, Math.round(size / 200)),
      saveAsBlob: true,
    }
  }
  return { options, analysis, ecl }
}

export interface Rendered {
  blob: Blob
  analysis: Analysis
  ecl: ErrorCorrection
}

export async function renderQr(input: RenderInput, size: number, format: ExportFormat = 'png'): Promise<Rendered> {
  const { options, analysis, ecl } = buildOptions(input, size, format === 'svg' ? 'svg' : 'canvas')
  const qr = new QRCodeStyling(options)
  const data = await qr.getRawData(format)
  if (!(data instanceof Blob)) throw new Error('Rendering failed.')
  if (format === 'jpeg' || format === 'webp') {
    // Some browsers return an untyped blob for these formats.
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/webp'
    return { blob: data.type === mime ? data : new Blob([data], { type: mime }), analysis, ecl }
  }
  return { blob: data, analysis, ecl }
}
