import { dialog, expect, openBible, readRecord, signInLocally, test, withStores } from './fixtures'

test('deleting a topic or keyword warns about linked notes and unlinks them', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)

  const noteId = await withStores(page, async (stores) => {
    const topic = await stores.topics.createTopic('Тема для видалення')
    await stores.keywords.createKeyword('слово')
    await stores.notes.startNewNote({ topicId: topic._id, keywordId: 'слово' })
    stores.notes.updateCurrentNoteText('нотатка')
    return (await stores.notes.saveCurrentNote())._id as string
  })

  await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Теми' }).click()
  await page.getByRole('button', { name: 'Видалити тему', exact: true }).click()
  await expect(dialog(page)).toContainText('Посилання на «Тема для видалення» є в нотатках: 1')
  await dialog(page).getByRole('button', { name: 'Видалити' }).click()
  await expect(page.locator('.topic-row')).toHaveCount(0)

  await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Ключові слова' }).click()
  await page.getByRole('button', { name: 'Видалити ключове слово', exact: true }).click()
  await expect(dialog(page)).toContainText('Посилання на «#слово» є в нотатках: 1')
  await dialog(page).getByRole('button', { name: 'Видалити' }).click()
  await expect(page.locator('.v-expansion-panel')).toHaveCount(0)

  const note = await readRecord(page, 'notes', noteId)
  expect(note.topics).toEqual([])
  expect(note.keywords).toEqual([])
  expect(note.text).toBe('нотатка')
})

test('cancel keeps the topic', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, (stores) => stores.topics.createTopic('Залишиться'))

  await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Теми' }).click()
  await page.getByRole('button', { name: 'Видалити тему', exact: true }).click()
  await expect(dialog(page)).toContainText('Видалити «Залишиться»?')
  await dialog(page).getByRole('button', { name: 'Скасувати' }).click()
  await expect(page.locator('.topic-title')).toHaveText('Залишиться')
})
