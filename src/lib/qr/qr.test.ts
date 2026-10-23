import { describe, expect, it } from 'vitest'
import qrcode from 'qrcode-generator'
import { analyze, CapacityError, densityOf, detectMode, toByteString, utf8Length } from './encode'
import { checkColors, contrastRatio } from './color'
import { DEFAULT_STYLE, resolveErrorCorrection, sanitizeStyle } from './style'
import { buildOptions } from './render'

describe('encode', () => {
  it('turns text into UTF-8 byte strings', () => {
    expect(toByteString('é')).toBe('\xc3\xa9')
    expect(toByteString('abc')).toBe('abc')
    expect(utf8Length('👋')).toBe(4)
  })

  it('detects the most compact mode', () => {
    expect(detectMode('12345')).toBe('Numeric')
    expect(detectMode('HTTPS://EXAMPLE.COM')).toBe('Alphanumeric')
    expect(detectMode('https://example.com')).toBe('Byte')
  })

  it('reports version and module count', () => {
    const result = analyze('https://example.com', 'M')
    expect(result.version).toBe(2)
    expect(result.moduleCount).toBe(25)
  })

  it('produces the exact UTF-8 bytes in the symbol', () => {
    // Without the byte-string conversion, qrcode-generator would encode "é" as the single byte 0xE9.
    const text = 'Olá 👋'
    const { encoded } = analyze(text, 'M')
    expect(qrcode.stringToBytes(encoded)).toEqual([...new TextEncoder().encode(text)])
  })

  it('throws a capacity error when content does not fit', () => {
    expect(() => analyze('x'.repeat(3000), 'H')).toThrow(CapacityError)
  })

  it('grades density by version', () => {
    expect(densityOf(5)).toBe('low')
    expect(densityOf(15)).toBe('medium')
    expect(densityOf(30)).toBe('high')
  })
})

describe('colors', () => {
  it('computes WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1)
  })

  it('flags low contrast and inverted codes', () => {
    expect(checkColors('#111111', '#ffffff').level).toBe('ok')
    expect(checkColors('#ffff00', '#ffffff').level).toBe('bad')
    expect(checkColors('#ffffff', '#000000').level).toBe('warn')
    expect(checkColors('#999999', '#ffffff').level).toBe('warn')
  })
})

describe('style', () => {
  it('raises error correction to H when a logo is present', () => {
    expect(resolveErrorCorrection(DEFAULT_STYLE, false)).toBe('M')
    expect(resolveErrorCorrection(DEFAULT_STYLE, true)).toBe('H')
    expect(resolveErrorCorrection({ ...DEFAULT_STYLE, errorCorrection: 'L' }, true)).toBe('L')
  })

  it('sanitizes untrusted styles', () => {
    const style = sanitizeStyle({
      foreground: 'red',
      quietZone: 99,
      dotStyle: 'evil',
      logoSize: -1,
      cornerColor: '#ABCDEF',
    })
    expect(style.foreground).toBe(DEFAULT_STYLE.foreground)
    expect(style.quietZone).toBe(8)
    expect(style.dotStyle).toBe('square')
    expect(style.logoSize).toBeGreaterThan(0)
    expect(style.cornerColor).toBe('#ABCDEF')
    expect(sanitizeStyle(null)).toEqual(DEFAULT_STYLE)
  })
})

describe('buildOptions', () => {
  it('sizes the margin as a whole number of modules', () => {
    const { options, analysis } = buildOptions(
      { payload: 'https://example.com', style: DEFAULT_STYLE, logo: null },
      1000,
      'canvas',
    )
    const moduleSize = 1000 / (analysis.moduleCount + 8)
    expect(options.margin).toBe(Math.floor(moduleSize * 4))
  })

  it('keeps the logo inside the recovery budget', () => {
    const { options, ecl } = buildOptions(
      {
        payload: 'https://example.com',
        style: { ...DEFAULT_STYLE, logoSize: 0.35 },
        logo: 'data:image/png;base64,AA==',
      },
      1000,
      'canvas',
    )
    expect(ecl).toBe('H')
    // Hidden area = imageSize * 30% recovery, so the logo covers 0.35² ≈ 12% of the code.
    expect(options.imageOptions!.imageSize! * 0.3).toBeCloseTo(0.35 ** 2)
  })
})
