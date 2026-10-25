import { expect, type Route } from '@playwright/test'
import { test } from './fixtures'

const HTML_HEADERS = { 'content-type': 'text/html', 'access-control-allow-origin': '*' }

test('shows combined local details only for valid content, and masks Wi-Fi passwords', async ({ page }) => {
  let externalRequests = 0
  page.on('request', (request) => {
    if (request.url().startsWith('https://')) externalRequests++
  })
  await page.goto('/')
  const card = page.getByTestId('content-preview')
  await expect(card).toHaveCount(0)
  await page.getByRole('tab', { name: 'E-mail', exact: true }).click()
  await page.getByLabel('Endereço de e-mail', { exact: true }).fill('ana@example.com')
  await page.getByLabel('Assunto (opcional)', { exact: true }).fill('Café amanhã?')
  await page.getByLabel('Mensagem (opcional)', { exact: true }).fill('Às 9h\nNo estúdio')
  await expect(card).toContainText('ana@example.com')
  await expect(card).toContainText('Café amanhã?')
  await expect(card).toContainText('Às 9h\nNo estúdio')
  await page.getByLabel('Endereço de e-mail', { exact: true }).fill('invalid')
  await expect(card).toHaveCount(0)

  await page.getByRole('tab', { name: 'Wi-Fi', exact: true }).click()
  await page.getByLabel('Nome da rede (SSID)', { exact: true }).fill('Studio Wi-Fi')
  await expect(card).toHaveCount(0)
  await page.getByLabel('Senha', { exact: true }).fill('secret123')
  await expect(card).toContainText('Studio Wi-Fi')
  await expect(card).not.toContainText('secret123')
  await card.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(card).toContainText('secret123')
  await page.getByLabel('Senha', { exact: true }).fill('changed123')
  await expect(card).not.toContainText('changed123')

  await page.getByRole('tab', { name: 'Localização', exact: true }).click()
  await page.getByLabel('Latitude', { exact: true }).fill('-23,5505')
  await page.getByLabel('Longitude', { exact: true }).fill('-46.6333')
  await expect(card).toContainText('-23.5505, -46.6333')
  await expect(card.getByRole('link', { name: 'Abrir localização' })).toHaveAttribute('href', 'geo:-23.5505,-46.6333')
  expect(externalRequests).toBe(0)
})

test('reserves no space while fetching, then shows safe metadata below the URL input', async ({ page }) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  let requests = 0
  await page.route('https://cards.example/**', async (route) => {
    requests++
    await pending
    await route.fulfill({
      headers: HTML_HEADERS,
      body: `<head>
      <meta property="og:title" content="Studio &amp; ideias">
      <meta property="og:description" content="Um lugar para criar.">
      <meta property="og:site_name" content="Studio">
      <script>document.documentElement.dataset.injected = 'yes'</script>
      </head><body><img src="https://tracker.example/image"></body>`,
    })
  })
  const unexpectedImages: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('tracker.example')) unexpectedImages.push(request.url())
  })
  await page.goto('/')
  const card = page.getByTestId('content-preview')
  const editor = page.locator('.content-card')
  const empty = await editor.boundingBox()
  await page.getByLabel('Endereço do site', { exact: true }).fill('https://cards.example/post#intro')
  await expect.poll(() => requests).toBe(1)
  await expect(card).toHaveCount(0)
  expect((await editor.boundingBox())!.height).toBe(empty!.height)
  release()
  await expect(card).toBeVisible()
  await expect(card).toContainText('Studio & ideias')
  await expect(card).toContainText('Um lugar para criar.')
  await expect(card).toContainText('cards.example')
  await expect(card.getByRole('link', { name: 'Abrir link' })).toHaveAttribute(
    'href',
    'https://cards.example/post#intro',
  )
  expect(await page.locator('html').getAttribute('data-injected')).toBeNull()
  expect(unexpectedImages).toEqual([])
  await page.getByLabel('Endereço do site', { exact: true }).fill('')
  await expect(card).toHaveCount(0)
})

test('silently omits failed, empty and non-HTML link previews', async ({ page }) => {
  await page.route('https://cards.example/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/offline') return route.abort('failed')
    return route.fulfill({
      status: path === '/failed' ? 503 : 200,
      headers: { ...HTML_HEADERS, 'content-type': path === '/plain' ? 'text/plain' : 'text/html' },
      body: path === '/empty' ? '<html><head></head></html>' : '<title>Not a usable preview</title>',
    })
  })
  await page.goto('/')
  const card = page.getByTestId('content-preview')
  const height = (await page.locator('.content-card').boundingBox())!.height
  for (const path of ['/failed', '/plain', '/empty', '/offline']) {
    const address = `https://cards.example${path}`
    const finished = path === '/offline'
      ? page.waitForEvent('requestfailed', (request) => request.url() === address)
      : page.waitForResponse((response) => response.url() === address)
    await page.getByLabel('Endereço do site', { exact: true }).fill(address)
    await finished
    await expect(card).toHaveCount(0)
    expect((await page.locator('.content-card').boundingBox())!.height).toBe(height)
  }
  await expect(page.getByRole('button', { name: 'Baixar', exact: true })).toBeEnabled()
})

test('cancels slow requests and never replaces a new link with an old response', async ({ page }) => {
  await page.clock.install()
  let oldRoute: Route | undefined
  await page.route('https://cards.example/**', async (route) => {
    if (route.request().url().endsWith('/old')) {
      oldRoute = route
      return
    }
    await route.fulfill({ headers: HTML_HEADERS, body: '<title>Latest page</title>' })
  })
  await page.goto('/')
  const url = page.getByLabel('Endereço do site', { exact: true })
  const card = page.getByTestId('content-preview')
  await url.fill('https://cards.example/old')
  await expect.poll(() => Boolean(oldRoute)).toBe(true)
  await expect(card).toHaveCount(0)
  const aborted = page.waitForEvent('requestfailed', (request) => request.url().endsWith('/old'))
  await page.clock.fastForward(6000)
  await aborted
  await expect(card).toHaveCount(0)
  await url.fill('https://cards.example/new')
  await expect(card).toContainText('Latest page')
  await oldRoute!.fulfill({ headers: HTML_HEADERS, body: '<title>Obsolete page</title>' })
  await expect(card).not.toContainText('Obsolete page')
  await expect(card).toContainText('Latest page')
})

test('contact cards fit phone and desktop layouts in both themes and languages', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Contato', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Ana')
  await page.getByLabel('Sobrenome', { exact: true }).fill('Silva')
  await page.getByLabel('Empresa', { exact: true }).fill('Studio')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@example.com')
  await page.getByLabel('Site', { exact: true }).fill(`https://example.com/${'long-path-'.repeat(15)}`)
  const card = page.getByTestId('content-preview')
  for (const language of ['pt-BR', 'en']) {
    await page.getByRole('combobox', { name: /^(Idioma|Language)$/ }).selectOption(language)
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const dark of [false, true]) {
        if ((await page.locator('html').evaluate((node) => node.classList.contains('dark'))) !== dark) {
          const name =
            width < 640 ? /^(Tema|Theme):/ : dark ? /^(Tema: escuro|Theme: dark)$/ : /^(Tema: claro|Theme: light)$/
          await page.getByRole('button', { name }).click()
        }
        await expect(card).toContainText('Ana Silva')
        await expect(card).toContainText('ana@example.com')
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
    }
  }
})
