import type { ContentType } from '../lib/payload/types'

export const PANEL_ID = 'content-panel'

export function tabId(type: ContentType) {
  return `tab-${type}`
}
