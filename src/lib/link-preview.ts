export interface LinkMetadata {
  title: string
  description: string
  siteName: string
  url: string
}

const MAX_BYTES = 512 * 1024

export function previewableUrl(input: string): string | null {
  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase()
    // Only fetch public HTTPS pages, never credentials, local devices or IP literals.
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes('.') ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.test') ||
      host.endsWith('.invalid') ||
      host.endsWith('.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      host.includes(':')
    )
      return null
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

export function parseLinkMetadata(html: string, url: string): LinkMetadata | null {
  // Read only the head; an inert detached document must never load page images or frames.
  const head = html
    .split(/<\/head\s*>/i, 1)[0]
    .split(/<body[\s>]/i, 1)[0]
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  const tags = head.replace(/<!--[\s\S]*?-->/g, '').match(/<meta\b[^>]*>|<title\b[^>]*>[\s\S]*?<\/title\s*>/gi) || []
  const doc = new DOMParser().parseFromString(tags.join('\n'), 'text/html')
  const clean = (value: string | null | undefined, limit: number) =>
    (value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
  const meta = (name: string) =>
    doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute('content')
  const title = clean(meta('og:title') || meta('twitter:title') || doc.querySelector('title')?.textContent, 180)
  if (!title) return null
  return {
    title,
    description: clean(meta('og:description') || meta('twitter:description') || meta('description'), 320),
    siteName: clean(meta('og:site_name'), 80),
    url,
  }
}

export async function fetchLinkMetadata(url: string, signal: AbortSignal): Promise<LinkMetadata | null> {
  const response = await fetch(url, {
    signal,
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers: { Accept: 'text/html, application/xhtml+xml' },
  })
  if (
    !response.ok ||
    !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(response.headers.get('content-type') || '') ||
    !response.body
  ) {
    await response.body?.cancel()
    return null
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BYTES) return null
      html += decoder.decode(value, { stream: true })
      if (/<\/head\s*>|<body[\s>]/i.test(html)) break
    }
    html += decoder.decode()
  } finally {
    await reader.cancel()
  }
  return parseLinkMetadata(html, url)
}
