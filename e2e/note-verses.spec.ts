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
    // the verse of the Bible page stays plain; the picked ones keep their translation
    .toEqual(
      expect.arrayContaining([
        '1.000.000.000',
        'ohienko:1.000.004.002',
        'ohienko:1.000.004.003',
        'ohienko:1.000.004.004'
      ])
    )
  await expect(editor.locator('.field-set', { hasText: 'Вірші з Біблії' }).locator('p')).toHaveCount(6)
})

test('a verse is picked in another translation; the translation of the menu stays', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)

  await page
    .locator('.line-actions')
    .first()
    .getByRole('button', { name: 'Написати замітку до вірша' })
    .click()
  const editor = dialog(page)
  await editor.getByRole('button', { name: 'Додати вірші' }).click()
  const picker = dialog(page)

  // the picker's own switch
  await picker.locator('.field-translation').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Синодальний переклад' }).click()
  await picker.getByPlaceholder('Слова з тексту Біблії').fill('так возлюбил Бог мир')
  const result = picker.locator('.v-window-item--active .d-flex', { hasText: 'От Иоанна 3:16' })
  await expect(result).toBeVisible()
  await result.locator('input[type=checkbox]').check()
  await picker.getByRole('button', { name: 'Додати (1)' }).click()

  // the note shows the Russian text with the name of the translation, not as a link
  const verses = editor.locator('.field-set', { hasText: 'Вірші з Біблії' })
  await expect(verses).toContainText('Ибо так возлюбил Бог мир')
  await expect(verses.locator('.verse-reference')).toHaveText('(От Иоанна 3:16, Синод.)')
  expect(await withStores(page, (stores) => [...stores.notes.currentNote.refs])).toContain(
    'synodal:1.003.002.015'
  )

  // the Bible page still reads in Ukrainian
  expect(await withStores(page, (stores) => stores.user.translation)).toBe('ohienko')
})
