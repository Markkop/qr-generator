import { useEffect, useState } from 'react'
import { CapacityError, type Analysis, type ErrorCorrection } from '../lib/qr/encode'
import { renderQr, type RenderInput } from '../lib/qr/render'
import type { ScanResult } from '../lib/qr/scan'

export const PREVIEW_SIZE = 1024

export type ReadyPreview = {
  status: 'ready'
  url: string
  blob: Blob
  payload: string
  analysis: Analysis
  ecl: ErrorCorrection
  scan: ScanResult | { status: 'checking' } | { status: 'skipped' }
}

export type PreviewState = { status: 'empty' } | { status: 'error'; message: string } | ReadyPreview

const DEBOUNCE_MS = 150

export function useQrPreview(input: RenderInput | null): PreviewState {
  const [state, setState] = useState<PreviewState>({ status: 'empty' })
  // Serialized so the effect re-runs only when the content changes, not on every new object.
  const key = input ? JSON.stringify(input) : null

  useEffect(() => {
    if (!key) return
    const current = JSON.parse(key) as RenderInput
    let cancelled = false
    let url: string | null = null

    const timer = setTimeout(async () => {
      try {
        const { blob, analysis, ecl } = await renderQr(current, PREVIEW_SIZE, 'png')
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setState({ status: 'ready', url, blob, payload: current.payload, analysis, ecl, scan: { status: 'checking' } })
        let scan: ReadyPreview['scan']
        try {
          const { verifyScan } = await import('../lib/qr/scan')
          scan = await verifyScan(blob, current.payload)
        } catch {
          scan = { status: 'skipped' }
        }
        if (!cancelled) setState((s) => (s.status === 'ready' && s.blob === blob ? { ...s, scan } : s))
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'error',
          message:
            error instanceof CapacityError
              ? 'Too much content for one QR code. Shorten it or lower the error correction level.'
              : 'Could not render this QR code.',
        })
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
      // The image stays on screen until the next render lands, so release it a little later.
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 2000)
    }
  }, [key])

  return key ? state : { status: 'empty' }
}
