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
  message?: string
}

export function checkColors(foreground: string, background: string): ColorCheck {
  const ratio = contrastRatio(foreground, background)
  if (ratio < 2.5) {
    return {
      level: 'bad',
      message: `Contrast is very low (${ratio.toFixed(1)}:1). Most phones will not read this code.`,
    }
  }
  if (luminance(foreground) > luminance(background)) {
    return { level: 'warn', message: 'Light code on a dark background. Some scanner apps cannot read inverted codes.' }
  }
  if (ratio < 4) {
    return {
      level: 'warn',
      message: `Contrast is low (${ratio.toFixed(1)}:1). Aim for 4:1 or more, ideally a dark code on white.`,
    }
  }
  return { level: 'ok' }
}
