// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLinkMetadata, parseLinkMetadata, previewableUrl } from './link-preview'

afterEach(() => vi.unstubAllGlobals())

describe('link preview URLs', () => {
  it('accepts public HTTPS URLs and drops fragments', () => {
    expect(previewableUrl('https://example.com/article?q=hello#section')).toBe('https://example.com/article?q=hello')
  })
  it.each([
    'not a URL',
    'http://example.com',
    'javascript:alert(1)',
    'data:text/html,test',
    'https://user:password@example.com',
    'https://localhost',
    'https://router.local',
    'https://host.internal',
    'https://host.test',
    'https://host.invalid',
    'https://127.0.0.1',
    'https://10.0.0.1',
    'https://2130706433',
    'https://[::1]',
    'https://example.com:8443',
  ])('does not fetch %s', (url) => expect(previewableUrl(url)).toBeNull())
})

describe('metadata parsing', () => {
  it('prefers Open Graph and decodes entities without including page markup', () => {
    const result = parseLinkMetadata(
      `
      <html><head><title>Fallback</title>
      <meta property="og:title" content="A &amp; B">
      <meta property="og:description" content="A short description">
      <meta property="og:site_name" content="Example"></head>
      <body><script>throw Error('never execute')</script><img src="https://unwanted.example/image"></body>`,
      'https://example.com/',
    )
    expect(result).toEqual({
      title: 'A & B',
      description: 'A short description',
      siteName: 'Example',
      url: 'https://example.com/',
    })
  })
  it('supports Twitter metadata and ordinary page titles', () => {
    expect(
      parseLinkMetadata(
        '<meta name="twitter:title" content="Twitter title"><title>Fallback</title>',
        'https://example.com/',
      )?.title,
    ).toBe('Twitter title')
    expect(
      parseLinkMetadata(
        '<title> A\n page </title><meta name="description" content="About this page">',
        'https://example.com/',
      ),
    ).toMatchObject({ title: 'A page', description: 'About this page' })
  })
  it('ignores comments, script contents and missing titles', () => {
    expect(
      parseLinkMetadata(
        '<!-- <title>Comment</title> --><script><title>Script</title></script><body><title>Body</title>',
        'https://example.com/',
      ),
    ).toBeNull()
    expect(parseLinkMetadata('<meta name="description" content="No title">', 'https://example.com/')).toBeNull()
  })
})

describe('metadata fetching', () => {
  it('uses anonymous CORS requests and reads HTML only', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response('<title>Loaded</title>', { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      )
    vi.stubGlobal('fetch', fetcher)
    const signal = new AbortController().signal
    expect(await fetchLinkMetadata('https://example.com/', signal)).toMatchObject({ title: 'Loaded' })
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/',
      expect.objectContaining({ signal, credentials: 'omit', mode: 'cors', referrerPolicy: 'no-referrer' }),
    )
  })
  it.each([
    new Response('Unavailable', { status: 503, headers: { 'content-type': 'text/html' } }),
    new Response('<title>Not HTML</title>', { headers: { 'content-type': 'text/plain' } }),
    new Response('x'.repeat(512 * 1024 + 1), { headers: { 'content-type': 'text/html' } }),
  ])('returns no metadata for unsuccessful, non-HTML or oversized responses', async (response) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    expect(await fetchLinkMetadata('https://example.com/', new AbortController().signal)).toBeNull()
  })
})
