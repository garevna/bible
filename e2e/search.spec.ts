import { expect, openBible, test, verse } from './fixtures'

test.describe('full-text search', () => {
  test.beforeEach(async ({ page }) => {
    await openBible(page)
    await page.getByRole('button', { name: 'Пошук' }).click()
  })

  const count = (page: import('@playwright/test').Page) => page.locator('.found-count')
  const query = (page: import('@playwright/test').Page) => page.getByPlaceholder('Слова з тексту Біблії')

  test('finds verses with all words and marks them', async ({ page }) => {
    await query(page).fill('сина давидового')
    await expect(count(page)).toHaveText('9')
    await expect(page.locator('.result').first().locator('mark').first()).toBeVisible()
  })

  test('ignores case and apostrophes', async ({ page }) => {
    for (const text of ['П’ЯТЬ', "п'ять", 'пять']) {
      await query(page).fill(text)
      await expect(count(page)).toHaveText('351')
    }
  })

  test('narrows the results by testament', async ({ page }) => {
    await query(page).fill('Ісус')
    await expect(count(page)).toHaveText('997')
    await page.locator('.v-chip', { hasText: 'Старий Заповіт' }).click()
    await expect(count(page)).toHaveText('64')
    await page.locator('.v-chip', { hasText: 'Новий Заповіт' }).click()
    await expect(count(page)).toHaveText('933')
  })

  test('asks for a longer query', async ({ page }) => {
    await query(page).fill('я')
    await expect(page.getByText('двох або більше літер')).toBeVisible()
  })

  test('opens the verse of a result', async ({ page }) => {
    await query(page).fill('явивсь йому вві снї ангел')
    await page.locator('.result').first().click()
    await expect(verse(page, '1.000.000.019')).toHaveClass(/line-text--emph/)
  })
})
