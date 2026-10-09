import { dialog, expect, openBible, test, withStores } from './fixtures'

test('sign up walks the steps and reports that Firestore is unreachable', async ({ page }) => {
  test.setTimeout(150_000)
  await openBible(page)
  await page.getByRole('button', { name: 'Реєстрація' }).click()

  const form = dialog(page)
  await form.getByLabel('Як до вас краще звертатися?').fill('E2E Tester')
  for (let step = 0; step < 3; step++) await form.getByRole('button', { name: 'Далі' }).click()

  await form.getByLabel('Логін').fill('e2e-offline-user')
  await form.getByRole('button', { name: 'Далі' }).click()

  const password = form.locator('.v-window-item--active input[type=password]')
  await password.fill('short')
  await expect(form.getByText('недостатньо надійний')).toBeVisible()
  await password.fill('shortword123')
  await form.getByRole('button', { name: 'Далі' }).click()

  await form.locator('.v-window-item--active input[type=password]').fill('shortword123')
  await form.getByRole('button', { name: 'Реєстрація' }).click()

  await expect(form.getByText('Не вдалося створити користувача')).toBeVisible({ timeout: 60_000 })
  expect(await withStores(page, (stores) => stores.user.signed)).toBe(false)
})
