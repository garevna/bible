import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** The worker (see playwright.config.ts): what /me says, and the requests the app sends */
async function fakeWorker(page: Page, me: Record<string, unknown>) {
  const requests: { method: string; path: string; body: unknown }[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    const body = request.postData() ? request.postDataJSON() : null
    if (request.method() !== 'GET') requests.push({ method: request.method(), path, body })
    if (path === '/me' && request.method() === 'GET')
      return route.fulfill({ json: { telegram: false, canReceive: false, phone: null, ...me } })
    if (path === '/status-request') return route.fulfill({ json: { statusRequestAt: Date.now() } })
    if (path === '/me') return route.fulfill({ json: { statusGranted: null } })
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/admin/settings')
      return route.fulfill({
        json: {
          roles: [
            { id: 'servant', name: 'Служитель', manage: [], sendToRoles: [], invite: [] },
            { id: 'reader', name: 'Читач', manage: [], sendToRoles: [], invite: [] }
          ],
          types: [],
          ministries: [],
          locations: [],
          eventTypes: [],
          calendar: { redDays: 2, orangeDays: 5, filters: [] }
        }
      })
    if (path === '/admin/users')
      return route.fulfill({
        json: {
          users: [
            {
              uid: 'new-uid',
              email: 'new@example.com',
              emailVerified: true,
              name: 'Новенька',
              role: 'reader',
              owner: false,
              lastSeen: Date.now(),
              statusRequest: { at: Date.now(), note: 'Музичне служіння' }
            }
          ],
          roles: [],
          ministries: []
        }
      })
    if (path.startsWith('/admin/users/'))
      return route.fulfill({
        json: {
          user: { uid: 'new-uid', name: 'Новенька', role: body.role, owner: false, lastSeen: Date.now() }
        }
      })
    return route.fulfill({ json: {} })
  })
  return requests
}

async function signIn(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
}

test('a new reader is asked once whether they serve; the request goes to the administrators', async ({
  page
}) => {
  const requests = await fakeWorker(page, { role: 'reader', offerStatus: true })
  await signIn(page)
  const ask = dialog(page)
  await expect(ask).toContainText('Якщо ви служите в церкві, надішліть запит')
  await ask.getByRole('textbox', { name: 'Де ви служите (необов’язково)' }).fill('Музичне служіння')
  await ask.getByRole('button', { name: 'Надіслати запит' }).click()
  await expect(ask).toContainText('Запит надіслано')
  expect(requests.find((request) => request.path === '/status-request')).toMatchObject({
    body: { note: 'Музичне служіння' }
  })
  await ask.getByRole('button', { name: 'Закрити' }).last().click()
  // the menu of the avatar says it is sent
  await page.getByRole('button', { name: 'E2E', exact: true }).click()
  await expect(
    page.locator('.v-overlay--active .v-list-item', { hasText: 'Стати служителем' })
  ).toContainText('Запит надіслано')
})

test('shown once after the sign up: told to the worker; a reader of before is not asked, the menu has it', async ({
  page
}) => {
  const requests = await fakeWorker(page, { role: 'reader', offerStatus: true })
  await signIn(page)
  await dialog(page).getByRole('button', { name: 'Пізніше' }).click()
  // the worker knows it was shown: never again, on any device
  expect(requests.find((request) => request.path === '/me')).toMatchObject({
    method: 'PUT',
    body: { offered: true }
  })
})

test('a reader who signed up before is not asked by itself; the menu of the avatar has it', async ({
  page
}) => {
  await fakeWorker(page, { role: 'reader' })
  await signIn(page)
  await expect(page.getByText('Якщо ви служите в церкві, надішліть запит')).toHaveCount(0)
  await page.getByRole('button', { name: 'E2E', exact: true }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Стати служителем' }).click()
  await expect(dialog(page)).toContainText('Надіслати запит')
})

test('the first visit with the status given: congratulations and the service channel', async ({ page }) => {
  const requests = await fakeWorker(page, {
    role: 'servant',
    statusGranted: 'Служитель',
    serviceChannel: 'https://t.me/+channel'
  })
  await signIn(page)
  const greeting = dialog(page)
  await expect(greeting).toContainText('Вітаємо!')
  await expect(greeting).toContainText('Ваш статус у застосунку змінено. Тепер ви — Служитель.')
  await expect(greeting.getByRole('link', { name: 'Приєднатися до каналу' })).toHaveAttribute(
    'href',
    'https://t.me/+channel'
  )
  await greeting.getByRole('button', { name: 'Зрозуміло' }).click()
  await expect(page.getByText('Вітаємо!')).toHaveCount(0)
  expect(requests.find((request) => request.path === '/me')).toMatchObject({
    method: 'PUT',
    body: { greeted: true }
  })
})

test('an administrator gives the status asked for in one click', async ({ page }) => {
  const requests = await fakeWorker(page, { role: 'admin', rights: { manage: ['users'] } })
  await signIn(page)
  await page.getByRole('button', { name: 'Адміністрування' }).click()
  // the reader who asks is shown though the readers are hidden
  const row = page.locator('.users-table tbody tr', { hasText: 'Новенька' })
  await expect(row).toContainText('Просить статус служителя')
  await row.click()
  await expect(page.locator('.details-row')).toContainText('«Музичне служіння»')
  await page.locator('.details-row').getByRole('button', { name: 'Надати статус служителя' }).click()
  await expect
    .poll(() => requests.find((request) => request.path === '/admin/users/new-uid'))
    .toMatchObject({ method: 'PUT', body: { role: 'servant' } })
})
