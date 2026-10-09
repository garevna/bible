import { dialog, expect, openBible, test, withStores } from './fixtures'

/* The tests run offline, so they check that the dialogs say so instead of failing silently. */

test('sign up checks the login and reports that the server is unreachable', async ({ page }) => {
  await openBible(page)
  await page.getByRole('button', { name: 'Реєстрація' }).click()

  const form = dialog(page)
  await form.getByLabel('Як до вас краще звертатися?').fill('E2E Tester')
  for (let step = 0; step < 3; step++) await form.getByRole('button', { name: 'Далі' }).click()

  await form.getByRole('textbox', { name: 'Логін' }).fill('e2e-offline-user')
  await form.getByRole('button', { name: 'Далі' }).click()

  await expect(form.getByText('Немає зв’язку з сервером')).toBeVisible({ timeout: 30_000 })
  await expect(form.getByRole('textbox', { name: 'Логін' })).toBeVisible()
  expect(await withStores(page, (stores) => stores.user.signed)).toBe(false)
})

test('sign in reports that the server is unreachable', async ({ page }) => {
  await openBible(page)
  await page.getByRole('button', { name: 'Вхід' }).click()

  const form = dialog(page)
  await form.getByRole('textbox', { name: 'Логін' }).fill('someone')
  await form.getByRole('textbox', { name: 'Логін' }).press('Enter')

  await expect(form.getByText('Немає зв’язку з сервером')).toBeVisible({ timeout: 30_000 })
  expect(await withStores(page, (stores) => stores.user.signed)).toBe(false)
})
