import { describe, expect, it } from 'vitest'
import { buildPayload, normalizeTelegramUsername } from './build'

describe('Telegram public links', () => {
  it.each(['telegram', '@telegram', 't.me/telegram', 'https://t.me/telegram/', 'https://telegram.me/telegram'])(
    'accepts %s',
    (username) => {
      expect(buildPayload('telegram', { username, message: '' }).payload).toBe('https://t.me/telegram')
    },
  )
  it.each([
    'https://example.com/name',
    't.me/+invitation',
    't.me/c/123',
    't.me/share',
    't.me/user?start=bot',
    't.me/user#fragment',
    'user/name',
    '@bad user',
    'x'.repeat(33),
  ])('rejects unsupported input %s', (input) => expect(normalizeTelegramUsername(input)).toBeNull())
  it('encodes drafts without sending them and prevents an inline query', () => {
    expect(buildPayload('telegram', { username: '@telegram', message: 'Olá & café 👋' }).payload).toBe(
      'https://t.me/telegram?text=' + encodeURIComponent('Olá & café 👋'),
    )
    expect(buildPayload('telegram', { username: 'telegram', message: '@example' }).payload).toBe(
      'https://t.me/telegram?text=%20%40example',
    )
    expect(buildPayload('telegram', { username: 'telegram', message: 'a'.repeat(4097) }).payload).toBeNull()
    expect(buildPayload('telegram', { username: '', message: '' }).payload).toBeNull()
  })
})
