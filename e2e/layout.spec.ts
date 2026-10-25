import { expect, test } from '@playwright/test'

test('keeps a vertical type selector beside the desktop editor while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const selector = page.getByRole('complementary', { name: 'Tipo de conteúdo' })
  const tabs = selector.getByRole('tab')
  await expect(tabs).toHaveCount(12)
  await expect(selector.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
  const sidebar = await selector.boundingBox()
  const editor = await page.locator('.content-card').boundingBox()
  const preview = await page.locator('.preview-column').boundingBox()
  expect(sidebar!.x + sidebar!.width).toBeLessThan(editor!.x)
  expect(editor!.x + editor!.width).toBeLessThan(preview!.x)

  await page.getByRole('tab', { name: 'Contato', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Ana')
  await page.getByText('Cores, formas, logo e correção de erro', { exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 700))
  const pinned = await selector.boundingBox()
  expect(pinned!.y).toBeGreaterThanOrEqual(0)
  expect(pinned!.y).toBeLessThanOrEqual(17)
  expect(pinned!.y + pinned!.height).toBeLessThan(900)

  await page.getByRole('tab', { name: 'URL', exact: true }).click()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: 'Texto', exact: true })).toBeFocused()
  await expect(page.getByRole('tabpanel', { name: 'Texto', exact: true })).toBeVisible()
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: 'Telegram', exact: true })).toBeFocused()
  expect((await page.locator('.content-card').boundingBox())!.y).toBeGreaterThanOrEqual(0)
  await page.getByRole('tab', { name: 'Contato', exact: true }).click()
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Ana')
})

test('keeps all twelve types above the phone editor without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  const selector = page.getByRole('complementary', { name: 'Tipo de conteúdo' })
  await expect(selector.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
  const initial = await selector.boundingBox()
  const editor = await page.locator('.content-card').boundingBox()
  expect(initial!.y + initial!.height).toBeLessThan(editor!.y)
  expect(initial!.height).toBeLessThan(220)

  await page.getByRole('tab', { name: 'Contato', exact: true }).click()
  await page.evaluate(() => window.scrollTo(0, 500))
  const pinned = await selector.boundingBox()
  expect(pinned!.y).toBeGreaterThanOrEqual(0)
  expect(pinned!.y).toBeLessThanOrEqual(9)
  for (const tab of await selector.getByRole('tab').all()) {
    const box = await tab.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    expect(box!.y).toBeGreaterThanOrEqual(pinned!.y)
    expect(box!.y + box!.height).toBeLessThanOrEqual(pinned!.y + pinned!.height)
  }

  await page.getByRole('tab', { name: 'URL', exact: true }).click()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: 'Telefone', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.getByRole('tab', { name: 'URL', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('tabpanel', { name: 'URL', exact: true })).toBeFocused()

  await page.getByRole('tab', { name: 'Contato', exact: true }).click()
  await page.evaluate(() => {
    window.scrollTo(0, 900)
    document.getElementById('tab-calendar')!.click()
  })
  await expect(page.getByRole('tab', { name: 'Calendário', exact: true })).toHaveAttribute('aria-selected', 'true')
  const switched = await page.locator('.content-card').boundingBox()
  const stickySelector = await selector.boundingBox()
  expect(switched!.y).toBeGreaterThanOrEqual(stickySelector!.y + stickySelector!.height)

  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(selector.getByRole('tablist')).toHaveAttribute(
      'aria-orientation',
      width >= 640 ? 'vertical' : 'horizontal',
    )
    for (const name of ['Contato', 'Calendário', 'Localização', 'Pix']) {
      await page.getByRole('tab', { name, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
})
