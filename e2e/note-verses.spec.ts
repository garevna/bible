import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

test('verses are added to a note by text search and by reference', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)

  await page
    .locator('.line-actions')
    .first()
    .getByRole('button', { name: 'Написати замітку до вірша' })
    .click()
  const editor = dialog(page)
  const refs = () => withStores(page, (stores) => [...stores.notes.currentNote.refs])
  expect(await refs()).toEqual(['1.000.000.000'])

  // by search: tick two results
  await editor.getByRole('button', { name: 'Додати вірші' }).click()
  const picker = dialog(page)
  await picker.getByPlaceholder('Слова з тексту Біблії').fill('давидового')
  const boxes = picker.locator('.v-window-item--active input[type=checkbox]')
  await expect(boxes.first()).toBeVisible()
  await boxes.nth(0).check()
  await boxes.nth(1).check()
  await picker.getByRole('button', { name: 'Додати (2)' }).click()
  await expect.poll(refs).toHaveLength(3)

  // by reference: Matthew 5:3-5
  await editor.getByRole('button', { name: 'Додати вірші' }).click()
  await dialog(page).getByRole('tab', { name: 'За посиланням' }).click()
  const choose = async (label: string, value: string) => {
    await dialog(page)
      .locator('.v-window-item--active .v-field')
      .filter({ has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) })
      .click()
    await page.locator('.v-overlay--active .v-list-item', { hasText: new RegExp(`^${value}$`) }).click()
  }
  await choose('Розділ', '5')
  await choose('Вірш', '3')
  await choose('по вірш', '5')
  await expect(dialog(page).getByText('Блаженні вбогі духом')).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Додати (3)' }).click()

  await expect
    .poll(refs)
    .toEqual(expect.arrayContaining(['1.000.000.000', '1.000.004.002', '1.000.004.003', '1.000.004.004']))
  await expect(editor.locator('.field-set', { hasText: 'Вірші з Біблії' }).locator('p')).toHaveCount(6)
})
