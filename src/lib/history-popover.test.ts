import { describe, expect, it } from 'vitest'
import { historyPopoverBox } from './history-popover'

describe('historyPopoverBox', () => {
  it('aligns the panel to the button and keeps it inside a wide viewport', () => {
    const box = historyPopoverBox({ right: 1100, bottom: 64 }, { width: 1280, height: 800 })
    expect(box.width).toBe(352)
    expect(box.left + box.width).toBe(1100)
    expect(box.top).toBe(72)
    expect(box.left).toBeGreaterThanOrEqual(8)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(800)
  })

  it('keeps the panel inside a narrow viewport', () => {
    const box = historyPopoverBox({ right: 300, bottom: 96 }, { width: 320, height: 700 })
    expect(box.left).toBeGreaterThanOrEqual(8)
    expect(box.left + box.width).toBeLessThanOrEqual(312)
    expect(box.top).toBeGreaterThanOrEqual(8)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(700)
    expect(box.width).toBeGreaterThan(200)
  })

  it('lifts the panel when there is little room below the button', () => {
    const box = historyPopoverBox({ right: 400, bottom: 760 }, { width: 1280, height: 800 })
    expect(box.top).toBeLessThan(760)
    expect(box.maxHeight).toBeGreaterThanOrEqual(160)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(792)
  })

  it('stays on screen when the button is above the viewport', () => {
    const box = historyPopoverBox({ right: 300, bottom: -40 }, { width: 390, height: 700 })
    expect(box.top).toBeGreaterThanOrEqual(8)
    expect(box.left).toBeGreaterThanOrEqual(8)
    expect(box.left + box.width).toBeLessThanOrEqual(382)
    expect(box.top + box.maxHeight).toBeLessThanOrEqual(692)
  })
})
