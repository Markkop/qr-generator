export interface PopoverBox {
  top: number
  left: number
  width: number
  maxHeight: number
}

const MARGIN = 8
const PREFERRED_WIDTH = 352
const MIN_HEIGHT = 160

/** Places a panel under the anchor, right-aligned, and keeps it inside the viewport. */
export function historyPopoverBox(
  anchor: { right: number; bottom: number },
  viewport: { width: number; height: number },
): PopoverBox {
  const width = Math.min(PREFERRED_WIDTH, Math.max(0, viewport.width - MARGIN * 2))
  const maxLeft = viewport.width - width - MARGIN
  const left = Math.min(Math.max(MARGIN, anchor.right - width), Math.max(MARGIN, maxLeft))
  const below = anchor.bottom + MARGIN
  const spaceBelow = viewport.height - below - MARGIN
  if (spaceBelow >= MIN_HEIGHT && below >= MARGIN) return { top: below, left, width, maxHeight: spaceBelow }

  const maxHeight = Math.min(480, Math.max(MIN_HEIGHT, viewport.height - MARGIN * 2))
  const top = Math.max(MARGIN, Math.min(below, viewport.height - MARGIN - maxHeight))
  return { top, left, width, maxHeight: Math.min(maxHeight, viewport.height - top - MARGIN) }
}
