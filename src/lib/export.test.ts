import { describe, expect, it } from 'vitest'
import { fileName, slugify } from './export'

describe('file names', () => {
  it('slugifies accents, symbols and length', () => {
    expect(slugify('Café & Bar, São Paulo!')).toBe('cafe-bar-sao-paulo')
    expect(slugify('👋')).toBe('code')
    expect(slugify('a'.repeat(100)).length).toBe(40)
  })

  it('builds dated file names with the right extension', () => {
    const date = new Date('2026-10-23T12:00:00Z')
    expect(fileName('wifi', 'My Network', 'png', date)).toBe('qr-wifi-my-network-2026-10-23.png')
    expect(fileName('url', 'example.com/path', 'jpeg', date)).toBe('qr-url-example-com-path-2026-10-23.jpg')
  })
})
