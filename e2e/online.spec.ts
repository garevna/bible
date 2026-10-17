import { expect, openBible, test, verse } from './fixtures'

/** The worker (see playwright.config.ts): the New Russian Translation read online, a chapter at a time */
test('a translation read online: the books and one chapter from the worker, its notice, no search', async ({
  page
}) => {
  const asked: string[] = []
  await page.route('**/worker-test/bible/nrt/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/worker-test/bible/nrt/', '')
    asked.push(path)
    if (path === 'books')
      return route.fulfill({
        json: {
          title: 'Новый русский перевод',
          copyright: '© Biblica, Inc. Используется с разрешения.',
          covenants: [
            { title: 'Ветхий Завет', books: [{ code: 'GEN', title: 'Бытие', chapters: [31] }] },
            { title: 'Новый Завет', books: [{ code: 'MAT', title: 'От Матфея', chapters: [25, 23] }] }
          ]
        }
      })
    if (path === '1/0/0')
      return route.fulfill({
        json: { verses: ['Родословие Иисуса Христа, сына Давида, сына Авраама:', 'Авраам был отцом Исаака'] }
      })
    return route.fulfill({ status: 404, json: {} })
  })

  await openBible(page)
  await page.locator('.v-app-bar .mdi-book-cross').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Новий російський переклад' }).click()

  await expect(page.getByRole('heading', { name: 'От Матфея' })).toBeVisible()
  await expect(verse(page, '1.000.000.000')).toHaveText(
    'Родословие Иисуса Христа, сына Давида, сына Авраама:'
  )
  await expect(page.locator('.remote-notice')).toHaveText('© Biblica, Inc. Используется с разрешения.')
  // the chapter, not the whole translation
  expect(asked).toEqual(expect.arrayContaining(['books', '1/0/0']))
  expect(asked.every((path) => path === 'books' || /^\d\/\d+\/\d+$/.test(path))).toBe(true)

  await page.getByRole('button', { name: 'Пошук' }).click()
  await expect(page.getByText('Цей переклад читається онлайн')).toBeVisible()
})
