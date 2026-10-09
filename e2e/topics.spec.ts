import { dialog, dragTo, expect, openBible, readRecord, signInLocally, test, withStores } from './fixtures'

test('topic: notes and verses are reordered by drag and drop and saved', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)

  // create the topic in the UI
  await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Теми' }).click()
  await page.getByRole('button', { name: 'Додати тему' }).click()
  await dialog(page).locator('input').fill('Родовід')
  await dialog(page).getByRole('button', { name: 'OK' }).click()
  await expect(page.locator('.topic-title')).toHaveText('Родовід')

  // two verses and a note with one verse in the topic
  const { noteId, topicId } = await withStores(page, async (stores) => {
    const topic = stores.topics.topicList[0]
    await stores.content.addTopicToVerse(topic, '1.000.000.001')
    await stores.content.addTopicToVerse(topic, '1.000.000.002')
    await stores.notes.startNewNote({ topicId: topic._id, lineRef: '1.000.000.000' })
    stores.notes.updateCurrentNoteText('Нотатка теми')
    return { noteId: (await stores.notes.saveCurrentNote())._id as string, topicId: topic._id as string }
  })

  await page.locator('.topic-title').click()
  const top = page.locator('.nested-list:not(.nested-list--note) > .draggable-item')
  const inNote = page.locator('.nested-list--note > .draggable-item')
  await expect(top).toHaveCount(3)
  await expect(inNote).toHaveCount(1)

  // drag the last verse into the note (the emulated drag is repeated if SortableJS missed it)
  await expect(async () => {
    if ((await inNote.count()) < 2) {
      await dragTo(page, top.last().locator('.drag-handle'), page.locator('.nested-list--note'))
    }
    await expect(inNote).toHaveCount(2, { timeout: 2_000 })
  }).toPass({ timeout: 20_000 })
  await expect(top).toHaveCount(2)

  await page.getByRole('button', { name: 'Зберегти' }).click()

  // one of the two topic verses moved into the note and is no longer a verse of the topic itself
  const saved = async () => ({
    note: [...(await readRecord(page, 'notes', noteId)).refs].sort(),
    topic: [...(await readRecord(page, 'topics', topicId)).refs]
  })
  await expect.poll(async () => (await saved()).note).toHaveLength(2)
  const { note, topic } = await saved()
  expect(note[0]).toBe('1.000.000.000')
  expect(topic).toHaveLength(1)
  expect([note[1], topic[0]].sort()).toEqual(['1.000.000.001', '1.000.000.002'])

  // the structure survives a reload (the fake sign in lives in memory, so sign in again)
  await page.reload()
  await expect(page.locator('p[id="1.000.000.000"]')).toBeVisible()
  await signInLocally(page)
  await withStores(page, (stores) => stores.app.setPage('topic'))
  await expect(page.locator('.nested-list--note > .draggable-item')).toHaveCount(2)
})

test('topics can be renamed', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, (stores) => stores.topics.createTopic('Стара назва'))

  await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Теми' }).click()
  await page.getByRole('button', { name: 'Перейменувати тему' }).click()
  const input = page.locator('.topic-row input')
  await input.fill('Нова назва')
  await input.press('Enter')
  await expect(page.locator('.topic-title')).toHaveText('Нова назва')
})
