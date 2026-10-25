import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function content(page: Page) {
  await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'match', { timeout: 15000 })
  await page.evaluate(() => navigator.clipboard.writeText(''))
  const copy = page.getByRole('button', { name: 'Copiar texto', exact: true })
  await expect(copy).toBeEnabled()
  await copy.click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).not.toBe('')
  return page.evaluate(() => navigator.clipboard.readText())
}

async function restore(page: Page, label: string) {
  await page.getByRole('button', { name: 'Salvar no histórico', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Salvo no histórico.')
  await page.reload()
  await page.getByRole('button', { name: /^Histórico/ }).click()
  await page.getByRole('button', { name: `Abrir ${label} no editor`, exact: true }).click()
  await expect(page.getByTestId('scan-status')).toHaveAttribute('data-status', 'match', { timeout: 15000 })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('Pix validates and round-trips through the QR scanner and history', async ({ page }) => {
  await page.getByRole('tab', { name: 'Pix', exact: true }).click()
  await page.getByLabel('Chave Pix', { exact: true }).fill('ana@example.com')
  await page.getByLabel('Nome do recebedor', { exact: true }).fill('Ana Silva')
  await page.getByLabel('Cidade do recebedor', { exact: true }).fill('São Paulo')
  await page.getByLabel('Valor em R$ (opcional)', { exact: true }).fill('0')
  await expect(page.getByText(/Use um valor positivo/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copiar texto', exact: true })).toBeDisabled()
  await page.getByLabel('Valor em R$ (opcional)', { exact: true }).fill('25,50')
  const payload = await content(page)
  expect(payload).toContain('br.gov.bcb.pix')
  expect(payload).toContain('540525.50')
  expect(payload).toContain('Sao Paulo')
  await restore(page, 'Ana Silva')
  expect(await content(page)).toBe(payload)
  await expect(page.getByLabel('Valor em R$ (opcional)', { exact: true })).toHaveValue('25,50')
})

test('Calendar converts time zones, exports ICS, and preserves event identity in history', async ({ page }) => {
  await page.getByRole('tab', { name: 'Calendário', exact: true }).click()
  await page.getByLabel('Título do evento', { exact: true }).fill('Café com a equipe')
  await page.getByLabel('Início', { exact: true }).fill('2026-11-15T09:00')
  await page.getByLabel('Término', { exact: true }).fill('2026-11-15T08:00')
  await expect(page.getByText('O término deve ser depois do início.')).toBeVisible()
  await page.getByLabel('Término', { exact: true }).fill('2026-11-15T10:00')
  await page.getByLabel('Fuso horário', { exact: true }).selectOption('America/Sao_Paulo')
  const payload = await content(page)
  expect(payload).toContain('DTSTART:20261115T120000Z')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar evento .ics', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toBe('evento.ics')
  expect(await readFile((await download.path())!, 'utf8')).toBe(payload)
  await restore(page, 'Café com a equipe')
  expect(await content(page)).toBe(payload)
  await page.getByRole('switch', { name: 'Dia inteiro', exact: true }).click()
  await page.getByLabel('Data inicial', { exact: true }).fill('2026-12-31')
  await page.getByLabel('Último dia (inclusive)', { exact: true }).fill('2026-12-31')
  expect(await content(page)).toContain('DTEND;VALUE=DATE:20270101')
})

test('Telegram links encode optional drafts and restore from history', async ({ page }) => {
  await page.getByRole('tab', { name: 'Telegram', exact: true }).click()
  await page.getByLabel('Usuário ou link do Telegram', { exact: true }).fill('https://t.me/telegram')
  await page.getByLabel('Mensagem (opcional)', { exact: true }).fill('Olá 👋 & café')
  const payload = await content(page)
  expect(payload).toBe('https://t.me/telegram?text=' + encodeURIComponent('Olá 👋 & café'))
  await restore(page, 'telegram')
  expect(await content(page)).toBe(payload)
})

test('new forms fit a small viewport in both languages and themes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 })
  for (const language of ['pt-BR', 'en']) {
    await page.getByRole('combobox', { name: /^(Idioma|Language)$/ }).selectOption(language)
    for (const dark of [false, true]) {
      if ((await page.locator('html').evaluate((node) => node.classList.contains('dark'))) !== dark) {
        await page.getByRole('button', { name: /^(Tema|Theme):/ }).click()
      }
      for (const name of ['Pix', language === 'en' ? 'Calendar' : 'Calendário', 'Telegram']) {
        await page.getByRole('tab', { name, exact: true }).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      }
    }
  }
})
