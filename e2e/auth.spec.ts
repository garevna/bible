import { dialog, expect, openBible, test, withStores } from './fixtures'

/* The tests run offline: they check the form and that the dialog says the server is unreachable. */

test.describe('sign in and sign up dialog', () => {
  test.beforeEach(async ({ page }) => openBible(page))

  test('header buttons open the matching tab', async ({ page }) => {
    await page.getByRole('button', { name: 'Реєстрація' }).click()
    await expect(dialog(page).getByRole('tab', { name: 'Реєстрація' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(dialog(page).getByRole('button', { name: 'Зареєструватися через Google' })).toBeVisible()

    await dialog(page).getByRole('tab', { name: 'Вхід' }).click()
    await expect(dialog(page).getByRole('button', { name: 'Увійти через Google' })).toBeVisible()
  })

  test('sign up validates the form and reports that the server is unreachable', async ({ page }) => {
    await page.getByRole('button', { name: 'Реєстрація' }).click()
    const form = dialog(page)
    const submit = form.getByRole('button', { name: 'Зареєструватися', exact: true })

    await form.getByPlaceholder('Email').fill('not-an-email')
    await expect(form.getByText('Невірний формат email')).toBeVisible()
    await form.getByPlaceholder('Email').fill('reader@example.com')

    await form.getByPlaceholder('Пароль', { exact: true }).fill('short')
    await expect(form.getByText('Не менше 8 символів')).toBeVisible()
    await form.getByPlaceholder('Пароль', { exact: true }).fill('longpassword1')

    await form.getByPlaceholder('Повторіть пароль').fill('other')
    await expect(form.getByText('Паролі не збігаються')).toBeVisible()
    await expect(submit).toBeDisabled()

    await form.getByPlaceholder('Повторіть пароль').fill('longpassword1')
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(form.getByText('Немає зв’язку з сервером')).toBeVisible({ timeout: 30_000 })
    expect(await withStores(page, (stores) => stores.user.signed)).toBe(false)
  })

  test('sign in accepts an email or an old login and reports that the server is unreachable', async ({
    page
  }) => {
    await page.getByRole('button', { name: 'Вхід' }).click()
    const form = dialog(page)

    await form.getByPlaceholder('Email або логін').fill('old-login')
    await form.getByPlaceholder('Пароль').fill('secret123')
    await form.getByRole('button', { name: 'Увійти', exact: true }).click()

    await expect(form.getByText('Немає зв’язку з сервером')).toBeVisible({ timeout: 30_000 })
    expect(await withStores(page, (stores) => stores.user.signed)).toBe(false)
  })

  test('password reset asks for an email', async ({ page }) => {
    await page.getByRole('button', { name: 'Вхід' }).click()
    const form = dialog(page)

    await form.getByPlaceholder('Email або логін').fill('old-login')
    await form.getByRole('link', { name: 'Забули пароль?' }).click()
    await expect(form.getByText('Введіть email, і ми надішлемо лист')).toBeVisible()
  })
})
