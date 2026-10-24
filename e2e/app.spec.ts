import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const scanStatus = (page: Page) => page.getByTestId('scan-status')

async function expectScans(page: Page) {
  await expect(page.getByTestId('qr-preview')).toBeVisible()
  await expect(scanStatus(page)).toHaveAttribute('data-status', 'match', { timeout: 15_000 })
}

let consoleErrors: string[] = []

async function openHistory(page: Page) {
  const panel = page.getByRole('dialog', { name: 'Histórico' })
  if (!(await panel.isVisible())) await page.getByRole('button', { name: /^Histórico/ }).click()
  await expect(panel).toBeVisible()
  return panel
}

test.beforeEach(async ({ page }) => {
  consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'")
})

test.afterEach(() => {
  expect(consoleErrors, 'console errors (including CSP violations)').toEqual([])
})

test('generates a URL code, downloads it and keeps it in history', async ({ page }) => {
  await page.getByLabel('Endereço do site', { exact: true }).fill('markkop.dev')
  await expectScans(page)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^qr-url-markkop-dev-\d{4}-\d{2}-\d{2}\.png$/)
  const bytes = await readFile((await download.path())!)
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')

  await expect(page.getByRole('dialog', { name: 'Histórico' })).toBeHidden()
  const panel = await openHistory(page)
  const history = page.getByTestId('history-entry')
  await expect(history).toHaveCount(1)
  await expect(history.first()).toContainText('markkop.dev')
  await expect(page.getByRole('button', { name: 'Exportar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Baixar PNG' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Backup e opções' }).click()
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeVisible()
  await page.getByRole('button', { name: /Mais ações para/ }).click()
  await expect(page.getByRole('button', { name: 'Baixar PNG' })).toBeVisible()

  await page.setViewportSize({ width: 320, height: 700 })
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(321)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(700)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)

  await page.reload()
  await openHistory(page)
  await expect(page.getByTestId('history-entry')).toHaveCount(1)
  await page.getByRole('button', { name: 'Abrir markkop.dev no editor' }).click()
  await expect(page.getByLabel('Endereço do site', { exact: true })).toHaveValue('markkop.dev')
  await expectScans(page)
})

test('exports SVG', async ({ page }) => {
  await page.getByLabel('Endereço do site', { exact: true }).fill('example.com')
  await expectScans(page)
  await page.getByLabel('Formato do arquivo').selectOption('svg')
  await expect(page.getByLabel('Tamanho da imagem')).toBeDisabled()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Baixar' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.svg$/)
  const svg = await readFile((await download.path())!, 'utf8')
  expect(svg).toContain('<svg')
})

test('pastes clipboard text into a line field and below a textarea', async ({ page }) => {
  await page.evaluate(() => navigator.clipboard.writeText('markkop.dev'))
  const url = page.getByLabel('Endereço do site', { exact: true })
  const urlPaste = page.getByRole('button', { name: 'Colar em Endereço do site' })
  await urlPaste.click()
  await expect(url).toHaveValue('markkop.dev')
  const urlBox = await url.boundingBox()
  const urlPasteBox = await urlPaste.boundingBox()
  const urlClear = page.getByRole('button', { name: 'Limpar Endereço do site' })
  const urlClearBox = await urlClear.boundingBox()
  expect(urlBox && urlPasteBox && Math.abs(urlBox.y - urlPasteBox.y)).toBeLessThan(8)
  expect(urlPasteBox!.x).toBeGreaterThan(urlBox!.x + urlBox!.width - 1)
  expect(urlClearBox && urlPasteBox && Math.abs(urlClearBox.y - urlPasteBox.y)).toBeLessThan(8)
  expect(urlClearBox!.x).toBeGreaterThan(urlPasteBox!.x)
  await expectScans(page)
  await urlClear.click()
  await expect(url).toHaveValue('')

  await page.getByRole('tab', { name: 'Texto' }).click()
  await page.evaluate(() => navigator.clipboard.writeText('Olá, área de transferência'))
  const text = page.getByRole('textbox', { name: 'Texto' })
  const textPaste = page.getByRole('button', { name: 'Colar em Texto' })
  await textPaste.click()
  await expect(text).toHaveValue('Olá, área de transferência')
  const textBox = await text.boundingBox()
  const textPasteBox = await textPaste.boundingBox()
  const textClear = page.getByRole('button', { name: 'Limpar Texto' })
  const textClearBox = await textClear.boundingBox()
  expect(textBox && textPasteBox && textPasteBox.y).toBeGreaterThanOrEqual(textBox.y + textBox.height - 1)
  expect(textClearBox && textPasteBox && Math.abs(textClearBox.y - textPasteBox.y)).toBeLessThan(8)
  await textClear.click()
  await expect(text).toHaveValue('')

  await page.setViewportSize({ width: 320, height: 700 })
  await page.getByRole('tab', { name: 'Localização' }).click()
  await expect(page.getByRole('button', { name: 'Colar em Latitude' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('copies the image and the content to the clipboard', async ({ page }) => {
  await page.getByLabel('Endereço do site', { exact: true }).fill('example.com')
  await expectScans(page)

  await page.getByRole('button', { name: 'Copiar imagem' }).click()
  await expect(page.getByRole('status')).toContainText('Imagem copiada')
  const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((item) => item.types))
  expect(types).toContain('image/png')

  await page.getByRole('button', { name: 'Copiar texto' }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('https://example.com')
})

test('round-trips unicode text through the scanner', async ({ page }) => {
  await page.getByRole('tab', { name: 'Texto' }).click()
  await page.getByRole('textbox', { name: 'Texto' }).fill('Olá 👋 café, 日本語\nsecond line')
  await expectScans(page)
})

test('builds Wi-Fi codes and skips history when auto-save is off', async ({ page }) => {
  await openHistory(page)
  await page.getByRole('button', { name: 'Backup e opções' }).click()
  await page.getByRole('switch', { name: /Salvar códigos automaticamente/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Histórico' })).toBeHidden()
  await page.getByRole('tab', { name: 'Wi-Fi' }).click()
  await page.getByLabel('Nome da rede (SSID)', { exact: true }).fill('Cafe; Wifi')
  await page.getByLabel('Senha', { exact: true }).fill('p:w,d\\1secret')
  await expectScans(page)
  await page.getByRole('button', { name: 'Copiar texto' }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('WIFI:T:WPA;S:Cafe\\; Wifi;P:p\\:w\\,d\\\\1secret;;')
  await openHistory(page)
  await expect(page.getByTestId('history-entry')).toHaveCount(0)
})

test('every content type produces a scannable code', async ({ page }) => {
  const steps: [string, (page: Page) => Promise<void>][] = [
    ['E-mail', async (p) => p.getByLabel('Endereço de e-mail', { exact: true }).fill('ada@example.com')],
    ['Telefone', async (p) => p.getByLabel('Número de telefone', { exact: true }).fill('+1 555 123 4567')],
    [
      'WhatsApp',
      async (p) => {
        await p.getByLabel('Número de telefone', { exact: true }).fill('+55 11 91234 5678')
        await p.getByLabel('Mensagem (opcional)', { exact: true }).fill('Olá')
      },
    ],
    [
      'SMS',
      async (p) => {
        await p.getByLabel('Número de telefone', { exact: true }).fill('+15551234567')
        await p.getByLabel('Mensagem (opcional)', { exact: true }).fill('On my way')
      },
    ],
    [
      'Contato',
      async (p) => {
        await p.getByLabel('Nome', { exact: true }).fill('Ada')
        await p.getByLabel('Sobrenome', { exact: true }).fill('Lovelace')
        await p.getByLabel('Empresa', { exact: true }).fill('Analytical Engine, Ltd')
      },
    ],
    [
      'Localização',
      async (p) => {
        await p.getByLabel('Latitude', { exact: true }).fill('-23.5505')
        await p.getByLabel('Longitude', { exact: true }).fill('-46.6333')
      },
    ],
  ]
  for (const [tab, fill] of steps) {
    await page.getByRole('tab', { name: tab }).click()
    await fill(page)
    await expectScans(page)
  }
})

test('a logo raises error correction and still scans', async ({ page }) => {
  await page.getByLabel('Endereço do site', { exact: true }).fill('example.com')
  await expectScans(page)
  await page.getByText('Estilo', { exact: true }).click()

  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#e11d48'
    ctx.fillRect(0, 0, 64, 64)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Enviar logo' }).click()
  await (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })

  await expect(page.getByText(/EC H/)).toBeVisible()
  await expectScans(page)
})

test('warns about low contrast', async ({ page }) => {
  await page.getByLabel('Endereço do site', { exact: true }).fill('example.com')
  await page.getByText('Estilo', { exact: true }).click()
  await page.getByLabel('Cor do código: valor hexadecimal').fill('#eeeeee')
  await expect(page.getByText(/O contraste está muito baixo/)).toBeVisible()
})

test('explains when the content is too long', async ({ page }) => {
  await page.getByRole('tab', { name: 'Texto' }).click()
  await page.getByRole('textbox', { name: 'Texto' }).fill('x'.repeat(3000))
  await expect(page.getByRole('alert')).toContainText('Conteúdo demais')
})

test('defaults to Portuguese and remembers English', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('QR Code')
  await expect(page.getByText('Grátis e simples')).toBeVisible()
  await expect(page).toHaveTitle('WhatsApp, links e Wi-Fi | QR Code by Mark Kop')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /QR Code grátis para WhatsApp/)
  await expect(page.getByRole('link', { name: /Feito com amor por Mark Kop/ })).toHaveAttribute(
    'href',
    'https://markkop.dev',
  )

  await page.getByLabel('Idioma').selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByLabel('Website URL', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Made with love by Mark Kop/ })).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('QR Code')
  await expect(page.getByText('Free and simple')).toBeVisible()
  await expect(page).toHaveTitle('WhatsApp, links and Wi-Fi | QR Code by Mark Kop')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /free QR code for WhatsApp/)
  await page.getByLabel('Website URL', { exact: true }).fill('example.com')
  await expectScans(page)
  await page.getByLabel('Language').selectOption('pt-BR')
  await expect(page.getByLabel('Endereço do site', { exact: true })).toHaveValue('example.com')
})
