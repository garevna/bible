import { test as base, expect, type Locator, type Page } from '@playwright/test'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Stores = Record<string, any>

/**
 * Every test runs offline: requests outside the dev server are aborted,
 * so nothing ever reaches the real Firestore or third party APIs.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(
      (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
      (route) => route.abort()
    )
    // ministers land on the calendar once a session: only calendar.spec.ts wants that (and clears it)
    await page.addInitScript(() => sessionStorage.setItem('bible:calendar-landed', '1'))
    await use(page)
  }
})

export { expect }

/**
 * Runs `fn(stores, arg)` in the page with the Pinia stores of the app.
 * `fn` is serialized, so it may only use its arguments.
 */
export function withStores<A, R>(page: Page, fn: (stores: Stores, arg: A) => R, arg?: A) {
  return page.evaluate(
    ([source, value]) => {
      const app = (document.querySelector('#app') as any).__vue_app__
      const stores = Object.fromEntries(app.config.globalProperties.$pinia._s)
      return new Function('stores', 'arg', `return (${source})(stores, arg)`)(stores, value)
    },
    [fn.toString(), arg] as const
  ) as Promise<Awaited<R>>
}

export const verse = (page: Page, id: string) => page.locator(`p[id="${id}"]`)

/** Opens the app and waits until the Bible text is in IndexedDB and Matthew 1 is shown */
export async function openBible(page: Page) {
  await page.goto('/')
  await expect(verse(page, '1.000.000.000')).toBeVisible({ timeout: 90_000 })
}

/**
 * Signs a fake user in, in the page only: the stores think a user is signed in,
 * Firestore is never contacted. Creates the lazily used stores too.
 */
export async function signInLocally(page: Page) {
  await withStores(page, async (stores) => {
    stores.user.setUser({ login: 'e2e-user', uid: 'e2e-uid', userName: 'E2E' })
    for (const page of ['topics', 'keywords', 'notes', 'bible']) await stores.app.setPage(page)
  })
  await expect(page.locator('.line-actions').first()).toBeVisible()
}

/** The topmost open dialog */
export const dialog = (page: Page) => page.locator('.v-overlay--active.v-dialog > .v-overlay__content').last()

/** Reads a record straight from IndexedDB */
export function readRecord<T = any>(page: Page, storeName: string, key: string) {
  return page.evaluate(
    ([storeName, key]) =>
      new Promise<T>((resolve, reject) => {
        const request = indexedDB.open('bible')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const get = request.result.transaction(storeName).objectStore(storeName).get(key)
          get.onsuccess = () => resolve(get.result)
          get.onerror = () => reject(get.error)
        }
      }),
    [storeName, key] as const
  )
}

/** Drags with real mouse moves, as SortableJS needs */
export async function dragTo(page: Page, source: Locator, target: Locator, offset = { x: 40, y: 0 }) {
  await source.scrollIntoViewIfNeeded()
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.waitForTimeout(100)
  // SortableJS reacts to separate pointer moves over time, not to one jump
  const end = { x: to.x + offset.x, y: to.y + to.height / 2 + offset.y }
  const steps = 20
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * i) / steps,
      start.y + ((end.y - start.y) * i) / steps
    )
    await page.waitForTimeout(30)
  }
  await page.mouse.up()
}
