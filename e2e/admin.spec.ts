import type { Page, Route } from '@playwright/test'

import { expect, openBible, signInLocally, test, withStores } from './fixtures'

/** The worker (see playwright.config.ts) with a few users; signInLocally signs in as e2e-uid */
async function fakeWorker(page: Page, role: 'admin' | 'reader') {
  // the worker does not list the owners
  const users = [
    {
      uid: 'e2e-uid',
      email: 'e2e@example.com',
      emailVerified: true,
      name: 'E2E',
      role,
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
  const changes: unknown[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me') return route.fulfill({ json: { role, telegram: true } })
    if (role !== 'admin') return route.fulfill({ status: 403, json: { error: 'forbidden' } })
    if (path === '/admin/users') return route.fulfill({ json: { users, ministries: ['Музичне служіння'] } })
    const uid = decodeURIComponent(path.replace('/admin/users/', ''))
    const user = users.find((item) => item.uid === uid)!
    if (request.method() === 'DELETE') {
      changes.push(['remove', uid])
      return route.fulfill({ json: { removed: uid } })
    }
    const { role: newRole } = request.postDataJSON()
    changes.push([uid, newRole])
    return route.fulfill({ json: { user: { ...user, role: newRole, updatedBy: 'E2E' } } })
  })
  return changes
}

async function signIn(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
}

test('an administrator gives a role and takes a temporary admin off the list', async ({ page }) => {
  const changes = await fakeWorker(page, 'admin')
  await signIn(page)

  await page.getByRole('button', { name: 'Адміністрування' }).click()
  const rows = page.locator('.user-row')
  await expect(rows).toHaveCount(2)

  // the administrator's own role cannot be changed
  await expect(rows.filter({ hasText: 'це ви' }).locator('.role-select')).toHaveClass(/v-input--disabled/)

  const pastor = rows.filter({ hasText: 'pastor@example.com' })
  await expect(pastor).toContainText('email не підтверджено')
  await pastor.locator('.role-select').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Адміністратор' }).click()
  await expect(pastor).toContainText('роль дав(ла) E2E')

  await page.getByPlaceholder('Ім’я або email').fill('pastor')
  await expect(rows).toHaveCount(1)

  await pastor.getByRole('button', { name: 'Прибрати зі списку' }).click()
  await page.locator('.v-overlay--active').getByRole('button', { name: 'Прибрати зі списку' }).click()
  await expect(rows).toHaveCount(0)

  expect(changes).toEqual([
    ['pastor-uid', 'admin'],
    ['remove', 'pastor-uid']
  ])
})

test('a reader has no dashboard', async ({ page }) => {
  await fakeWorker(page, 'reader')
  await signIn(page)
  await expect(page.getByRole('button', { name: 'Вихід' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Адміністрування' })).toHaveCount(0)

  await withStores(page, (stores) => stores.app.setPage('admin'))
  await expect(page.getByText('Ця сторінка лише для адміністраторів')).toBeVisible()
})
