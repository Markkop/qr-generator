import type { ContentType } from './payload/types'
import type { ExportFormat } from './qr/render'

export function slugify(input: string, maxLength = 40): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLength)
      .replace(/-+$/, '') || 'code'
  )
}

export function fileName(type: ContentType, description: string, format: ExportFormat, date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  const extension = format === 'jpeg' ? 'jpg' : format
  return `qr-${type}-${slugify(description)}-${day}.${extension}`
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'
}

/**
 * Pass the blob as a promise and call write() synchronously inside the click handler.
 * Safari drops the user activation after any await, which makes write() reject.
 */
export function copyImage(pngBlob: Promise<Blob>): Promise<void> {
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
}

export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false
  const probe = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' })
  return navigator.canShare({ files: [probe] })
}

export async function shareImage(blob: Blob, name: string, title: string): Promise<'shared' | 'cancelled'> {
  const file = new File([blob], name, { type: blob.type })
  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}
