import qrcode from 'qrcode-generator'

export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H'
export type Mode = 'Numeric' | 'Alphanumeric' | 'Byte'

/**
 * qrcode-generator maps each UTF-16 code unit to a single byte, which garbles anything outside Latin-1.
 * Feeding it a string whose code units are already UTF-8 bytes produces a correct byte-mode payload.
 */
export function toByteString(text: string): string {
  let out = ''
  for (const byte of new TextEncoder().encode(text)) out += String.fromCharCode(byte)
  return out
}

export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length
}

export function detectMode(text: string): Mode {
  if (/^[0-9]*$/.test(text)) return 'Numeric'
  if (/^[0-9A-Z $%*+\-./:]*$/.test(text)) return 'Alphanumeric'
  return 'Byte'
}

export interface Analysis {
  version: number
  moduleCount: number
  bytes: number
  mode: Mode
  /** Data in the form the renderer must receive. */
  encoded: string
}

export class CapacityError extends Error {
  constructor() {
    super('Too much content for a single QR code.')
    this.name = 'CapacityError'
  }
}

export function analyze(text: string, ecl: ErrorCorrection): Analysis {
  const mode = detectMode(text)
  const encoded = mode === 'Byte' ? toByteString(text) : text
  const qr = qrcode(0, ecl)
  try {
    qr.addData(encoded, mode)
    qr.make()
  } catch {
    throw new CapacityError()
  }
  const moduleCount = qr.getModuleCount()
  return { version: (moduleCount - 17) / 4, moduleCount, bytes: utf8Length(text), mode, encoded }
}

export type Density = 'low' | 'medium' | 'high'

/** Versions above ~10 get hard to scan at small print sizes; above ~20 they struggle on screens too. */
export function densityOf(version: number): Density {
  if (version <= 10) return 'low'
  if (version <= 20) return 'medium'
  return 'high'
}
