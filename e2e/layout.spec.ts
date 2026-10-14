import type { Page } from '@playwright/test'

import { expect, openBible, signInLocally, test } from './fixtures'

test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })

/** the page is never wider than the screen, or a phone zooms and shifts it */
const widths = (page: Page) =>
  page.evaluate(() => ({
    screen: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }))

test('a phone turned on its side and back: the page fits the screen, the header gets lower', async ({
  page
}) => {
  await openBible(page)
  await signInLocally(page)
  const footer = page.locator('.app-footer')
  // with its border of 1px
  const header = page.locator('.v-app-bar')

  for (const button of await footer.locator('.v-btn').all()) {
    const box = (await button.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(375)
  }
  await expect(footer).toContainText('Нотатки')
  expect((await header.boundingBox())!.height).toBe(65)
  // the chapters of a book: as many as fit
  expect(await widths(page)).toEqual({ screen: 375, page: 375 })
  expect(await page.evaluate(() => innerWidth)).toBe(375)

  await page.setViewportSize({ width: 812, height: 375 })
  await expect.poll(async () => (await header.boundingBox())!.height).toBe(49)
  await expect(footer).not.toContainText('Нотатки')
  expect(await widths(page)).toEqual({ screen: 812, page: 812 })
  expect(await page.evaluate(() => innerWidth)).toBe(812)

  await page.setViewportSize({ width: 375, height: 812 })
  await expect.poll(async () => (await header.boundingBox())!.height).toBe(65)
  expect(await widths(page)).toEqual({ screen: 375, page: 375 })
  expect(await page.evaluate(() => innerWidth)).toBe(375)
})
