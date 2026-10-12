import { dialog, expect, openBible, readRecord, signInLocally, test, verse } from './fixtures'

const verseId = '1.000.000.001'

test.describe('signed in: verse details, notes and keywords', () => {
  test.beforeEach(async ({ page }) => {
    await openBible(page)
    await signInLocally(page)
  })

  test('links a new keyword, topic and note to a verse', async ({ page }) => {
    await verse(page, verseId).click()
    const details = dialog(page)
    await expect(details.locator('.field-set')).toBeVisible()

    // keyword: created right in the picker
    await details.getByRole('button', { name: 'Додати ключове слово до списку' }).click()
    const picker = dialog(page)
    await picker.locator('input').fill('родовід')
    await picker.locator('input').press('Enter')
    await picker.getByRole('button', { name: 'Додати', exact: true }).click()
    await expect(details.locator('.field-set')).toContainText('#родовід')

    // topic
    await details.getByRole('tab', { name: 'Теми' }).click()
    await details.getByRole('button', { name: 'Додати тему' }).click()
    await dialog(page).locator('input').fill('Родовід Ісуса')
    await dialog(page).locator('input').press('Enter')
    await dialog(page).getByRole('button', { name: 'Додати', exact: true }).click()
    await expect(details.locator('.v-window-item--active')).toContainText('Родовід Ісуса')

    // note
    await details.getByRole('tab', { name: 'Нотатки' }).click()
    await details.getByRole('button', { name: 'Написати замітку до вірша' }).last().click()
    await dialog(page).getByRole('textbox').first().fill('Тестова нотатка')
    await dialog(page).getByRole('button', { name: 'Зберегти' }).click()
    await expect(details.locator('.v-window-item--active')).toContainText('Тестова нотатка')

    const keyword = await readRecord(page, 'keywords', 'родовід')
    expect(keyword.refs).toEqual([verseId])
  })

  test('highlights selected text and keeps it', async ({ page }) => {
    await page.locator('.highlighter-bar .v-btn').nth(1).click()
    await page.evaluate((id) => {
      const text = document.getElementById(id)!.firstChild!
      const range = document.createRange()
      range.setStart(text, 0)
      range.setEnd(text, 6)
      document.getSelection()!.removeAllRanges()
      document.getSelection()!.addRange(range)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    }, verseId)

    const painted = verse(page, verseId).locator('span[style*="background"]')
    await expect(painted).toHaveText('Авраам')

    const record = await readRecord(page, 'highlights', verseId)
    expect(record.colored).toEqual([{ start: 0, end: 5, color: '#ff07' }])
  })

  test('on a phone the selection is painted once it stops changing (no mouse events)', async ({ page }) => {
    await page.locator('.highlighter-bar .v-btn').nth(2).click()
    // a long press and the handles: the selection changes, no mouseup or touchend follows
    await page.evaluate((id) => {
      const text = document.getElementById(id)!.firstChild!
      const range = document.createRange()
      range.setStart(text, 0)
      range.setEnd(text, 3)
      document.getSelection()!.removeAllRanges()
      document.getSelection()!.addRange(range)
      range.setEnd(text, 6)
    }, verseId)

    await expect(verse(page, verseId).locator('span[style*="background"]')).toHaveText('Авраам')
  })

  test('shows notes on the Notes page and opens their verses', async ({ page }) => {
    await page
      .locator('.line-actions')
      .nth(1)
      .getByRole('button', { name: 'Написати замітку до вірша' })
      .click()
    await dialog(page).getByRole('textbox').first().fill('Нотатка зі сторінки')
    await dialog(page).getByRole('button', { name: 'Зберегти' }).click()

    await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Нотатки' }).click()
    const note = page.locator('.note', { hasText: 'Нотатка зі сторінки' })
    await expect(note).toBeVisible()

    await note.locator('.mdi-chevron-down').click()
    await note.locator('.link-to-verse').click()
    await expect(verse(page, verseId)).toHaveClass(/line-text--emph/)
  })

  test('lists keywords with their verses', async ({ page }) => {
    await page
      .locator('.line-actions')
      .nth(1)
      .getByRole('button', { name: 'Вказати ключові слова для пошуку' })
      .click()
    await dialog(page).locator('input').fill('покоління')
    await dialog(page).locator('input').press('Enter')
    await dialog(page).getByRole('button', { name: 'Додати', exact: true }).click()

    await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Ключові слова' }).click()
    await page.locator('.v-expansion-panel-title', { hasText: 'покоління' }).click()
    await expect(page.locator('.v-expansion-panel-text .link-to-verse')).toHaveText(
      '(Огієнко, Від Матвія 1:2)'
    )
  })
})
