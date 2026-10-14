import type { Page, Route } from '@playwright/test'

import { expect, openBible, signInLocally, test, withStores } from './fixtures'

/** The worker (see playwright.config.ts): a minister, the service bot, Telegram not linked yet */
async function fakeWorker(page: Page) {
  const calls: string[] = []
  let linked = false
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me') {
      return route.fulfill({
        json: {
          role: 'servant',
          telegram: false,
          rights: { publish: false, send: false, sendToPeople: false, sendToRoles: [], manage: [] },
          ministries: ['Молитовне'],
          canReceive: true,
          phone: '+380501234567',
          serviceBot: true,
          telegramLinked: linked
        }
      })
    }
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    calls.push(`${request.method()} ${path}`)
    if (path === '/telegram/link' && request.method() === 'POST') {
      // as if the minister pressed Start in the bot
      linked = true
      return route.fulfill({ json: { url: 'https://t.me/kcc_service_bot?start=abc' } })
    }
    if (path === '/telegram/link') {
      linked = false
      return route.fulfill({ json: { linked: false } })
    }
    return route.fulfill({ json: {} })
  })
  return calls
}

test('a minister links Telegram from the menu of the avatar, and unlinks it', async ({ page }) => {
  const calls = await fakeWorker(page)
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })

  await page.getByRole('button', { name: 'E2E' }).click()
  // the bot opens in a new tab (t.me is not reached: requests outside the app are aborted)
  const tab = page.context().waitForEvent('page')
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Підключити Telegram' }).click()
  await (await tab).close()
  await expect(page.getByText('У Telegram натисніть «Start» (Почати) — і готово')).toBeVisible()
  expect(calls).toContain('POST /telegram/link')

  // back in the app: linked
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await page.getByRole('button', { name: 'E2E' }).click()
  const linked = page.locator('.v-overlay--active .v-list-item', { hasText: 'Telegram підключено' })
  await expect(linked).toBeVisible()
  await linked.click()
  await expect.poll(() => calls).toContain('DELETE /telegram/link')
})
