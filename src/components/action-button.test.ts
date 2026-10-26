// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Copy } from 'lucide-react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionButton } from './ActionButton'
import type { ButtonAction } from '../hooks/useActionFeedback'

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function mount(action: ButtonAction, disabled = false) {
  act(() =>
    root.render(
      createElement(ActionButton, { onAction: action, label: 'Copy', icon: Copy, successLabel: 'Copied', disabled }),
    ),
  )
  return container.querySelector('button')!
}

describe('in-place action feedback', () => {
  it('calls the API in the original click, blocks duplicate clicks, and waits for completion', async () => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const action = vi.fn(() => pending)
    const button = mount(action)
    act(() => {
      button.click()
      button.click()
    })
    expect(action).toHaveBeenCalledTimes(1)
    expect(button.dataset.state).toBe('pending')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    await act(async () => {
      finish()
      await pending
    })
    expect(button.dataset.state).toBe('success')
    expect(button.querySelector('[aria-live]')?.textContent).toContain('Copied')
    expect(button.getAttribute('aria-label')).toBe('Copy')
    expect(button.querySelector('.invisible')).not.toBeNull()
    act(() => vi.advanceTimersByTime(2000))
    expect(button.dataset.state).toBe('idle')
  })

  it('shows an error for rejected work and allows an immediate retry', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('Clipboard denied')).mockResolvedValueOnce(undefined)
    const button = mount(action)
    await act(async () => button.click())
    expect(button.dataset.state).toBe('error')
    expect(button.querySelector('[aria-live]')?.textContent).not.toContain('Copied')
    await act(async () => button.click())
    expect(button.dataset.state).toBe('success')
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('does not report success for cancellation or a disabled action', async () => {
    const action = vi.fn(() => false)
    const button = mount(action)
    await act(async () => button.click())
    expect(button.dataset.state).toBe('idle')
    expect(button.querySelector('[aria-live]')?.textContent).toBe('')
    mount(action, true).click()
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('cleans up delayed resets and ignores completion after unmount', async () => {
    let finish!: () => void
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const button = mount(() => pending)
    act(() => button.click())
    act(() => root.render(null))
    await act(async () => {
      finish()
      await pending
    })
    expect(container.childElementCount).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears feedback timers when a completed button is removed', async () => {
    const button = mount(() => {})
    await act(async () => button.click())
    expect(vi.getTimerCount()).toBe(1)
    act(() => root.render(null))
    expect(vi.getTimerCount()).toBe(0)
  })
})
