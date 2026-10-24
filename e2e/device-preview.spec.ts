import { expect, test } from '@playwright/test'

test('plays a scan, pauses, replays, and yields to the real QR code', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  const demo = page.getByTestId('device-demo')
  await expect(demo).toHaveAttribute('data-phase', 'aim')
  await expect(page.getByRole('button', { name: 'Baixar', exact: true })).toBeDisabled()
  await page.clock.runFor(2200)
  await expect(demo).toHaveAttribute('data-phase', 'detect')
  await page.clock.runFor(1700)
  await expect(demo).toHaveAttribute('data-phase', 'tap')
  await page.clock.runFor(900)
  await expect(demo).toHaveAttribute('data-phase', 'open')
  await page.getByRole('button', { name: 'Pausar demonstração' }).click()
  await page.clock.runFor(10_000)
  await expect(demo).toHaveAttribute('data-phase', 'open')
  await page.getByRole('button', { name: 'Repetir demonstração' }).click()
  await expect(demo).toHaveAttribute('data-phase', 'aim')

  await page.getByLabel('Endereço do site').fill('example.com')
  await page.clock.runFor(1000)
  await expect(page.getByTestId('qr-preview')).toBeVisible()
  await expect(demo).toHaveCount(0)
  await page.getByLabel('Endereço do site').fill('')
  await expect(demo).toBeVisible()
})

test.describe('illustrations with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('shows each of the eight result types on both operating systems, without navigating', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    const demo = page.getByTestId('device-demo')
    const systems = page.getByRole('group', { name: 'Sistema da demonstração' })
    const types = [
      ['URL', 'url', 'Safari', 'Chrome'],
      ['Texto', 'text', 'Leitor de Código', 'Google Lens'],
      ['Wi-Fi', 'wifi', 'Ajustes', 'Internet'],
      ['E-mail', 'email', 'Mail', 'Gmail'],
      ['Telefone', 'phone', 'Telefone', 'Telefone'],
      ['SMS', 'sms', 'Mensagens', 'Google Messages'],
      ['Contato', 'contact', 'Contatos', 'Google Contacts'],
      ['Localização', 'location', 'Mapas', 'Google Maps'],
    ] as const
    for (const [label, type, iosApp, androidApp] of types) {
      await page.getByRole('tab', { name: label, exact: true }).click()
      for (const [label, os, app] of [
        ['iOS', 'ios', iosApp],
        ['Android', 'android', androidApp],
      ] as const) {
        await systems.getByRole('button', { name: label, exact: true }).click()
        await expect(demo).toHaveAttribute('data-type', type)
        await expect(demo).toHaveAttribute('data-os', os)
        await expect(demo).toHaveAttribute('data-phase', 'open')
        await expect(demo).toHaveAttribute('data-paused', 'true')
        await expect(page.getByTestId('demo-result')).toHaveAttribute('data-app', app)
        const animations = await demo.evaluate((node) => node.getAnimations({ subtree: true }).length)
        expect(animations).toBe(0)
        const clippedActions = await demo.evaluate((node) => {
          const screen = node.querySelector('.demo-phone-screen')!.getBoundingClientRect()
          return [
            ...node.querySelectorAll(
              '.demo-native-action, .demo-call, .demo-native-dialog, .demo-composer, .demo-mail-send',
            ),
          ]
            .filter((action) => action.getBoundingClientRect().bottom > screen.bottom - 12)
            .map((action) => action.className)
        })
        expect(clippedActions, `${type} actions should fit inside ${os}`).toEqual([])
      }
    }
    await expect(page).toHaveURL('http://localhost:4173/')
    expect(errors).toEqual([])
    const steps = page.getByRole('group', { name: 'Etapas da demonstração' })
    await steps.getByRole('button', { name: /Enquadrar/ }).click()
    await expect(demo).toHaveAttribute('data-phase', 'aim')
    await steps.getByRole('button', { name: /Abrir/ }).click()
    await expect(demo).toHaveAttribute('data-phase', 'open')
  })

  test('fits a small viewport in both themes and supports English', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 780 })
    await page.goto('/')
    for (const theme of ['Tema: claro', 'Tema: escuro']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const size = await page.getByTestId('device-demo').boundingBox()
      expect(size?.width).toBeLessThanOrEqual(288)
    }
    await page.getByLabel('Idioma').selectOption('en')
    await expect(page.getByRole('group', { name: 'Demo operating system' })).toBeVisible()
    await expect(page.getByText('The link opens in a browser', { exact: true })).toBeVisible()
  })
})

test.describe('passive iPhone detection', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  })

  test('detects iOS without asking for hardware or permissions, then remembers a manual choice', async ({ page }) => {
    await page.addInitScript(() => {
      const forbidden = () => {
        throw new Error('The illustration must not request permissions or hardware.')
      }
      Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: forbidden } })
      Object.defineProperty(navigator, 'geolocation', {
        value: { getCurrentPosition: forbidden, watchPosition: forbidden },
      })
      Object.defineProperty(navigator, 'permissions', { value: { query: forbidden } })
    })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.getByTestId('device-demo')).toHaveAttribute('data-os', 'ios')
    await page.getByRole('group', { name: 'Sistema da demonstração' }).getByRole('button', { name: 'Android' }).click()
    await page.reload()
    await expect(page.getByTestId('device-demo')).toHaveAttribute('data-os', 'android')
    expect(errors).toEqual([])
  })
})
