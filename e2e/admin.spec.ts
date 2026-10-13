import type { Page, Route } from '@playwright/test'

import { expect, openBible, signInLocally, test, withStores } from './fixtures'

const role = (id: string, name: string, change: Record<string, unknown> = {}) => ({
  id,
  name,
  publish: false,
  send: false,
  sendToRoles: [],
  sendToPeople: false,
  messageDays: 1,
  manage: [],
  ...change
})

const ROLES = [
  role('reader', 'Читач'),
  role('servant', 'Служитель'),
  role('publisher', 'Публікатор', { publish: true, send: true, sendToRoles: ['servant'] }),
  role('admin', 'Адміністратор', {
    publish: true,
    manage: ['roles', 'users', 'directories', 'types', 'schedule']
  })
]

/** The worker (see playwright.config.ts); signInLocally signs in as e2e-uid with the given functions */
async function fakeWorker(page: Page, manage: string[]) {
  const users = [
    {
      uid: 'e2e-uid',
      email: 'e2e@example.com',
      emailVerified: true,
      name: 'E2E',
      role: 'admin',
      owner: false,
      lastSeen: Date.now()
    },
    {
      uid: 'leader-uid',
      email: 'leader@example.com',
      emailVerified: true,
      name: 'Лідер',
      role: 'servant',
      ministries: ['Музичне служіння'],
      owner: false,
      lastSeen: Date.now()
    },
    {
      uid: 'pastor-uid',
      email: 'pastor@example.com',
      emailVerified: false,
      name: null,
      role: 'reader',
      owner: false,
      lastSeen: Date.now()
    }
  ]
  const requests: { method: string; path: string; body: unknown }[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    const rights = { publish: true, send: false, sendToPeople: false, sendToRoles: [], manage }
    if (path === '/me') {
      return route.fulfill({
        json: { role: 'admin', telegram: true, rights, canReceive: true, phone: '+380501234567' }
      })
    }
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/admin/settings') {
      return route.fulfill({
        json: { roles: ROLES, types: [], ministries: ['Музичне служіння'], locations: ['Церква'] }
      })
    }
    if (path === '/admin/users')
      return route.fulfill({ json: { users, roles: ROLES, ministries: ['Музичне служіння'] } })
    const body = request.postData() ? request.postDataJSON() : null
    requests.push({ method: request.method(), path, body })
    if (path === '/admin/roles' || path.startsWith('/admin/directories/'))
      return route.fulfill({ json: body })
    const uid = decodeURIComponent(path.replace('/admin/users/', ''))
    const user = users.find((item) => item.uid === uid)!
    if (request.method() === 'DELETE') return route.fulfill({ json: { removed: uid } })
    return route.fulfill({ json: { user: { ...user, ...body, updatedBy: 'E2E' } } })
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

async function openDashboard(page: Page) {
  await signIn(page)
  await page.getByRole('button', { name: 'Адміністрування' }).click()
}

test('the sections on the left; ministers get roles, the readers are shown on request', async ({ page }) => {
  const requests = await fakeWorker(page, ['roles', 'users', 'directories'])
  await openDashboard(page)

  const nav = page.locator('.admin-nav')
  await expect(nav.locator('.v-list-item')).toHaveText(['Ролі і права', 'Служителі', 'Служіння', 'Локації'])

  await nav.getByText('Служителі').click()
  const rows = page.locator('.user-row')
  // the reader is hidden until asked for
  await expect(rows).toHaveCount(2)
  await page.getByLabel('Показати читачів').check()
  await expect(rows).toHaveCount(3)

  const pastor = rows.filter({ hasText: 'pastor@example.com' })
  await pastor.locator('.role-select').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Служитель' }).click()
  await expect
    .poll(() => requests)
    .toContainEqual({ method: 'PUT', path: '/admin/users/pastor-uid', body: { role: 'servant' } })
  // the administrator's own role is not changed here
  await expect(rows.filter({ hasText: 'це ви' }).locator('.role-select')).toHaveClass(/v-input--disabled/)
})

test('roles: rights are changed, a role is added and the roles are saved together', async ({ page }) => {
  const requests = await fakeWorker(page, ['roles', 'users', 'directories'])
  await openDashboard(page)

  const panels = page.locator('.role-panel')
  await expect(panels).toHaveCount(4)
  const publisher = panels.filter({ hasText: 'Публікатор' })
  await publisher.locator('.v-expansion-panel-title').click()
  await publisher.getByLabel('Публікує нотатки й теми в Telegram-каналі').uncheck()
  await publisher.getByLabel('Адміністратор', { exact: true }).check()

  await page.getByRole('button', { name: 'Додати роль' }).click()
  await expect(panels).toHaveCount(5)
  await panels.last().getByLabel('Назва ролі').fill('Координатор молитви')
  await panels.last().getByLabel('Розклад служінь').check()

  await expect(page.getByText('Є незбережені зміни')).toBeVisible()
  await page.getByRole('button', { name: 'Зберегти ролі' }).click()

  await expect.poll(() => requests.find((request) => request.path === '/admin/roles')).toBeTruthy()
  const saved = requests.find((request) => request.path === '/admin/roles')!.body as {
    roles: { id: string; name: string; publish: boolean; sendToRoles: string[]; manage: string[] }[]
  }
  expect(saved.roles.find((item) => item.id === 'publisher')).toMatchObject({
    publish: false,
    sendToRoles: ['servant', 'admin']
  })
  expect(saved.roles.at(-1)).toMatchObject({ name: 'Координатор молитви', manage: ['schedule'] })
})

test('the lists of ministries and locations', async ({ page }) => {
  const requests = await fakeWorker(page, ['directories'])
  await openDashboard(page)

  // only the sections of its functions
  await expect(page.locator('.admin-nav .v-list-item')).toHaveText(['Служіння', 'Локації'])
  await page.getByPlaceholder('Нова назва, Enter').fill('Дитяче служіння')
  await page.keyboard.press('Enter')
  await expect
    .poll(() => requests)
    .toContainEqual({
      method: 'PUT',
      path: '/admin/directories/ministries',
      body: { items: ['Музичне служіння', 'Дитяче служіння'] }
    })

  await page.locator('.admin-nav').getByText('Локації').click()
  await page.getByPlaceholder('Нова назва, Enter').fill('Філія на Салтівці')
  await page.keyboard.press('Enter')
  await expect
    .poll(() => requests)
    .toContainEqual({
      method: 'PUT',
      path: '/admin/directories/locations',
      body: { items: ['Церква', 'Філія на Салтівці'] }
    })
})

test('a role without functions of an administrator has no dashboard', async ({ page }) => {
  await fakeWorker(page, [])
  await signIn(page)
  await expect(page.getByRole('button', { name: 'Вихід' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Адміністрування' })).toHaveCount(0)

  await withStores(page, (stores) => stores.app.setPage('admin'))
  await expect(page.getByText('Ця сторінка лише для адміністраторів')).toBeVisible()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test('the header has one menu instead of a row of buttons', async ({ page }) => {
    await fakeWorker(page, ['users'])
    await signIn(page)

    // the messages, the dashboard and signing out are in the menu; the language and the translation stay
    await expect(page.getByRole('button', { name: 'Адміністрування' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Вихід' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Меню' }).click()
    const menu = page.locator('.header-menu')
    await expect(menu.locator('.v-list-item', { hasText: 'Повідомлення' })).toBeVisible()
    await expect(menu.locator('.v-list-item', { hasText: 'Вихід' })).toBeVisible()
    await expect(menu.locator('.v-list-item', { hasText: 'Синодальний переклад' })).toHaveCount(0)
    await expect(page.locator('.v-app-bar .mdi-book-cross')).toBeVisible()

    await menu.locator('.v-list-item', { hasText: 'Адміністрування' }).click()
    await expect(page.locator('.v-select', { hasText: 'Служителі' })).toBeVisible()

    // the page the user is on is marked in the menu and not opened again
    await page.getByRole('button', { name: 'Меню' }).click()
    await expect(menu.locator('.v-list-item', { hasText: 'Адміністрування' })).toHaveClass(
      /v-list-item--active/
    )
    await expect(menu.locator('.v-list-item', { hasText: 'Повідомлення' })).not.toHaveClass(
      /v-list-item--active/
    )
  })
})
