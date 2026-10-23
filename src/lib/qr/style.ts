import type { ErrorCorrection } from './encode'

export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded'
export type CornerSquareStyle = 'square' | 'extra-rounded' | 'dot'
export type CornerDotStyle = 'square' | 'dot'

export interface QrStyle {
  foreground: string
  background: string
  /** Null means the corners use the foreground color. */
  cornerColor: string | null
  dotStyle: DotStyle
  cornerSquareStyle: CornerSquareStyle
  cornerDotStyle: CornerDotStyle
  /** 'auto' picks M, or H when a logo is present. */
  errorCorrection: ErrorCorrection | 'auto'
  /** Quiet zone width in modules. The spec requires 4. */
  quietZone: number
  /** Logo width as a fraction of the code width. */
  logoSize: number
}

export const DEFAULT_STYLE: QrStyle = {
  foreground: '#111111',
  background: '#ffffff',
  cornerColor: null,
  dotStyle: 'square',
  cornerSquareStyle: 'square',
  cornerDotStyle: 'square',
  errorCorrection: 'auto',
  quietZone: 4,
  logoSize: 0.22,
}

export const MIN_QUIET_ZONE = 0
export const MAX_QUIET_ZONE = 8
export const MIN_LOGO_SIZE = 0.12
export const MAX_LOGO_SIZE = 0.35

export const DOT_STYLES: { value: DotStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'extra-rounded', label: 'Extra rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy rounded' },
]

export const CORNER_SQUARE_STYLES: { value: CornerSquareStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot', label: 'Circle' },
]

export const CORNER_DOT_STYLES: { value: CornerDotStyle; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Circle' },
]

export function resolveErrorCorrection(style: QrStyle, hasLogo: boolean): ErrorCorrection {
  if (style.errorCorrection !== 'auto') return style.errorCorrection
  return hasLogo ? 'H' : 'M'
}

/** Accepts untrusted input (history imports) and returns a valid style. */
export function sanitizeStyle(input: unknown): QrStyle {
  const s = (typeof input === 'object' && input !== null ? input : {}) as Partial<Record<keyof QrStyle, unknown>>
  const hex = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback)
  const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
    options.includes(v as T) ? (v as T) : fallback
  const clamp = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
  return {
    foreground: hex(s.foreground, DEFAULT_STYLE.foreground),
    background: hex(s.background, DEFAULT_STYLE.background),
    cornerColor: s.cornerColor === null ? null : hex(s.cornerColor, '') || null,
    dotStyle: oneOf(
      s.dotStyle,
      DOT_STYLES.map((d) => d.value),
      DEFAULT_STYLE.dotStyle,
    ),
    cornerSquareStyle: oneOf(
      s.cornerSquareStyle,
      CORNER_SQUARE_STYLES.map((d) => d.value),
      DEFAULT_STYLE.cornerSquareStyle,
    ),
    cornerDotStyle: oneOf(
      s.cornerDotStyle,
      CORNER_DOT_STYLES.map((d) => d.value),
      DEFAULT_STYLE.cornerDotStyle,
    ),
    errorCorrection: oneOf(s.errorCorrection, ['auto', 'L', 'M', 'Q', 'H'] as const, DEFAULT_STYLE.errorCorrection),
    quietZone: Math.round(clamp(s.quietZone, MIN_QUIET_ZONE, MAX_QUIET_ZONE, DEFAULT_STYLE.quietZone)),
    logoSize: clamp(s.logoSize, MIN_LOGO_SIZE, MAX_LOGO_SIZE, DEFAULT_STYLE.logoSize),
  }
}
