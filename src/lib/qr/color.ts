import type { Message } from '../../i18n/messages'

export function parseHex(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return null
  const value = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number]
}

/** WCAG 2 relative luminance. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export interface ColorCheck {
  level: 'ok' | 'warn' | 'bad'
  message?: Message
}

const round = (value: number) => Math.round(value * 10) / 10

export function checkColors(foreground: string, background: string): ColorCheck {
  const ratio = contrastRatio(foreground, background)
  if (ratio < 2.5) {
    return { level: 'bad', message: { key: 'warn.contrastVeryLow', params: { ratio: round(ratio) } } }
  }
  if (luminance(foreground) > luminance(background)) {
    return { level: 'warn', message: { key: 'warn.inverted' } }
  }
  if (ratio < 4) {
    return { level: 'warn', message: { key: 'warn.contrastLow', params: { ratio: round(ratio) } } }
  }
  return { level: 'ok' }
}
