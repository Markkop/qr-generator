import { test as base, type Page } from '@playwright/test'

export async function selectType(page: Page, name: string) {
  const picker = page.getByRole('combobox', { name: /^(Tipo de conteúdo|Content type)$/ })
  if (await picker.isVisible()) await picker.selectOption({ label: name })
  else await page.getByRole('tab', { name, exact: true }).click()
}

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
