import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

test('notes are filtered by an interval of days chosen in the calendar', async ({ page }) => {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    // note ids are creation timestamps
    for (const [day, text] of [
      ['2026-03-02', 'Перший день'],
      ['2026-03-04', 'Третій день'],
      ['2026-03-20', 'Пізніше']
    ]) {
      const _id = String(new Date(`${day}T12:00:00`).getTime())
      await stores.notes.putNote({ _id, text, keywords: [], topics: [], refs: [] })
    }
    await stores.notes.getAvailableDates()
    await stores.notes.updateDate('2026-03-02')
    await stores.app.setPage('notes')
  })

  const notes = page.locator('.notes-list .note')
  await expect(notes).toHaveCount(1)

  await page.getByRole('button', { name: 'Виберіть дату' }).click()
  const picker = dialog(page)
  await picker.locator('.v-switch input').check()
  await expect(picker.locator('.calendar__day[aria-pressed=true]')).toHaveCount(5)
  await picker.getByRole('button', { name: 'Застосувати' }).click()

  await expect(notes).toHaveCount(2)
  await expect(page.getByText('2026-03-02 — 2026-03-06')).toBeVisible()

  // opened again, the calendar shows the interval
  await page.getByRole('button', { name: 'Виберіть дату' }).click()
  await expect(picker.locator('.v-switch input')).toBeChecked()
  await expect(picker.locator('.calendar__day[aria-pressed=true]')).toHaveCount(5)
})
