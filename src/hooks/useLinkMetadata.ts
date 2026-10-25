import { useEffect, useState } from 'react'
import { fetchLinkMetadata, previewableUrl, type LinkMetadata } from '../lib/link-preview'

export function useLinkMetadata(input: string | null) {
  const url = input ? previewableUrl(input) : null
  const [result, setResult] = useState<{ url: string; metadata: LinkMetadata } | null>(null)

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    let deadline: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(async () => {
      deadline = setTimeout(() => controller.abort(), 5000)
      try {
        const metadata = await fetchLinkMetadata(url, controller.signal)
        if (metadata && !controller.signal.aborted) setResult({ url, metadata })
      } catch {
        // Metadata is optional. Loading failures leave no card or reserved space.
      } finally {
        clearTimeout(deadline)
      }
    }, 600)
    return () => {
      clearTimeout(timer)
      clearTimeout(deadline)
      controller.abort()
    }
  }, [url])

  return url && result?.url === url ? result.metadata : null
}
