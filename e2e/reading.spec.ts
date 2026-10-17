import { expect, openBible, test, verse } from './fixtures'

test.describe('reading the Bible', () => {
  test.beforeEach(async ({ page }) => openBible(page))

  // the free translation of P. Kulish and I. Puluj (1905) by default
  test('loads the translation and shows Matthew 1', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Євангелия від сьв. Маттея' })).toBeVisible()
    await expect(verse(page, '1.000.000.000')).toHaveText(/Книга родоводу Ісуса Христа/)
  })

  test('a guest sees the free translations only (not those that need a permission)', async ({ page }) => {
    await page.locator('.v-app-bar .mdi-book-cross').click()
    const menu = page.locator('.v-overlay--active .v-list')
    await expect(menu.locator('.v-list-item', { hasText: 'Куліша' })).toBeVisible()
    await expect(menu.locator('.v-list-item', { hasText: 'Синодальний переклад' })).toBeVisible()
    await expect(menu.locator('.v-list-item', { hasText: 'Огієнка' })).toHaveCount(0)
  })

  test('changes chapters with the pagination', async ({ page }) => {
    await page.getByRole('button', { name: 'Перейти на сторінку 2', exact: true }).click()
    await expect(verse(page, '1.000.001.000')).toBeVisible()
  })

  test('lists books and switches testaments', async ({ page }) => {
    await page.getByRole('button', { name: 'Новий заповіт' }).click()
    await expect(page.locator('.book-menu-item')).toHaveCount(27)

    await page.locator('.v-switch input').click()
    await expect(page.locator('.book-menu-item').first()).toContainText('Перва книга Мойсея')

    await page.locator('.book-menu-item', { hasText: 'Псалтир' }).click()
    await expect(page.getByRole('heading', { name: 'Псалтир' })).toBeVisible()
    await expect(verse(page, '0.018.000.000')).toBeVisible()
  })

  test('keeps the place after reload, from IndexedDB', async ({ page }) => {
    await page.getByRole('button', { name: 'Перейти на сторінку 3', exact: true }).click()
    await expect(verse(page, '1.000.002.000')).toBeVisible()

    const json = page.waitForRequest(/bible-.*\.json/, { timeout: 5_000 }).catch(() => null)
    await page.reload()
    await expect(verse(page, '1.000.002.000')).toBeVisible()
    expect(await json).toBeNull()
  })

  test('switches the interface language', async ({ page }) => {
    await page.getByRole('button', { name: 'мова' }).click()
    await page.locator('.v-list-item', { hasText: 'англійська' }).click()
    await expect(page.locator('.view-title')).toHaveText('Bible')
  })

  test('switches the translation', async ({ page }) => {
    await page.getByRole('button', { name: 'Переклад' }).click()
    await page.locator('.v-list-item', { hasText: 'Біблія короля Якова' }).click()
    await expect(verse(page, '1.000.000.000')).toHaveText(/The book of the generation of Jesus Christ/, {
      timeout: 60_000
    })
  })
})
