import type { ContentType } from '../lib/payload/types'

export const PANEL_ID = 'content-panel'
export const TYPE_VALUE_ID = 'mobile-type-value'
export const QR_OUTPUT_ID = 'qr-output'

export function tabId(type: ContentType) {
  return `tab-${type}`
}
