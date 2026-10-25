import { test as base } from '@playwright/test'

// Metadata requests must be deterministic and never depend on public websites.
export const test = base.extend<{ externalPages: void }>({
  externalPages: [
    async ({ page }, use) => {
      await page.route('https://**/*', (route) =>
        route.fulfill({
          status: 204,
          headers: { 'access-control-allow-origin': '*' },
        }),
      )
      await use()
    },
    { auto: true },
  ],
})
