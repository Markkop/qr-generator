import type { MessageKey } from '../i18n/messages'

/** An error the UI can show in the user's language. */
export class AppError extends Error {
  readonly key: MessageKey

  constructor(key: MessageKey) {
    super(key)
    this.name = 'AppError'
    this.key = key
  }
}
