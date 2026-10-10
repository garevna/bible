import { dialog, expect, openBible, readRecord, signInLocally, test, verse, withStores } from './fixtures'

test.describe('creating keywords, topics and notes', () => {
  test.beforeEach(async ({ page }) => {
    await openBible(page)
    await signInLocally(page)
  })

  test('a keyword can be created even when a longer one contains it', async ({ page }) => {
    await withStores(page, (stores) => stores.keywords.createKeyword('Боже'))

    await page
      .locator('.line-actions')
      .first()
      .getByRole('button', { name: 'Вказати ключові слова для пошуку' })
      .click()
    const picker = dialog(page)
    await picker.locator('input').fill('Бог')

    // the "+" button next to the text
    await picker.getByRole('button', { name: 'Додати ключове слово «Бог»' }).click()
    await picker.getByRole('button', { name: 'Додати', exact: true }).click()

    expect((await readRecord(page, 'keywords', 'Бог')).refs).toEqual(['1.000.000.000'])
    expect((await readRecord(page, 'keywords', 'Боже')).refs).toEqual([])
  })

  test('OK creates a typed topic that does not exist yet', async ({ page }) => {
    await page.locator('.line-actions').nth(1).getByRole('button', { name: 'Додати тему' }).click()
    const picker = dialog(page)
    await picker.locator('input').fill('Нова тема')
    await expect(picker.getByRole('button', { name: 'Додати', exact: true })).toBeEnabled()
    await picker.getByRole('button', { name: 'Додати', exact: true }).click()

    const topics = await withStores(page, async (stores) => {
      await stores.topics.getTopics()
      return stores.topics.topicList.map((topic: { title: string; refs: string[] }) => [
        topic.title,
        topic.refs
      ])
    })
    expect(topics).toEqual([['Нова тема', ['1.000.000.001']]])
  })

  test('a note without verses is created on the Notes page and shown at once', async ({ page }) => {
    await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Нотатки' }).click()
    await expect(page.getByText('Умови пошуку не визначені')).toHaveCount(0)

    await page.getByRole('button', { name: 'Нова нотатка' }).click()
    await dialog(page).getByRole('textbox').first().fill('Нотатка без віршів')
    await dialog(page).getByRole('button', { name: 'Зберегти' }).click()

    const note = page.locator('.note', { hasText: 'Нотатка без віршів' })
    await expect(note).toBeVisible()
    // no verses: no toggle to show them
    await expect(note.getByRole('button', { name: 'Вірші з Біблії' })).toHaveCount(0)
  })

  test('the Keywords page creates a keyword and adds verses and notes to it', async ({ page }) => {
    await page.locator('.v-bottom-navigation').getByRole('button', { name: 'Ключові слова' }).click()

    await page.getByRole('button', { name: 'Нове ключове слово' }).click()
    await dialog(page).locator('input').fill('блаженство')
    await dialog(page).getByRole('button', { name: 'Додати', exact: true }).click()
    await expect(page.locator('.v-expansion-panel-title', { hasText: '#блаженство' })).toBeVisible()

    // verses by reference: Matthew 5:3-4
    await page.getByRole('button', { name: 'Додати вірші' }).click()
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
    await choose('по вірш', '4')
    await dialog(page).getByRole('button', { name: 'Додати (2)' }).click()

    await expect(page.locator('.keyword-verse')).toHaveCount(2)
    expect((await readRecord(page, 'keywords', 'блаженство')).refs).toEqual([
      '1.000.004.002',
      '1.000.004.003'
    ])

    // a note with the keyword
    await page.getByRole('tab', { name: 'Нотатки' }).click()
    await page.getByRole('button', { name: 'Нова нотатка' }).click()
    await dialog(page).getByRole('textbox').first().fill('Про блаженства')
    await dialog(page).getByRole('button', { name: 'Зберегти' }).click()
    const note = page.locator('.note', { hasText: 'Про блаженства' })
    await expect(note).toBeVisible()
    await expect(note.locator('.v-chip', { hasText: '#блаженство' })).toBeVisible()
  })

  test('the Topic page adds verses to the topic', async ({ page }) => {
    await withStores(page, async (stores) => {
      await stores.topics.createTopic('Блаженства')
      localStorage.setItem('topic', stores.topics.topicList[0]._id)
      await stores.app.setPage('topic')
    })

    await page.getByRole('button', { name: 'Додати вірші' }).click()
    await dialog(page).getByPlaceholder('Слова з тексту Біблії').fill('блаженні вбогі')
    await dialog(page).locator('.v-window-item--active input[type=checkbox]').first().check()
    await dialog(page).getByRole('button', { name: 'Додати (1)' }).click()

    await expect(page.locator('.nested-list > .draggable-item')).toHaveCount(1)
    await expect(verse(page, '1.000.004.002')).toHaveCount(0)
    await expect(page.locator('.nested-list')).toContainText('Блаженні вбогі духом')
  })
})

test.describe('existing notes in topics', () => {
  test('notes are found by text or keyword and added to a topic; the list shows their number', async ({
    page
  }) => {
    await openBible(page)
    await signInLocally(page)
    await withStores(page, async (stores) => {
      await stores.keywords.createKeyword('віра')
      for (const [text, keyword] of [
        ['Про віру Авраама', 'віра'],
        ['Про надію', null],
        ['Ще одна думка', 'віра']
      ]) {
        await stores.notes.startNewNote(keyword ? { keywordId: keyword } : {})
        stores.notes.updateCurrentNoteText(text)
        await stores.notes.saveCurrentNote()
        await new Promise((resolve) => setTimeout(resolve, 5)) // note ids are timestamps
      }
      await stores.topics.createTopic('Віра')
      localStorage.setItem('topic', stores.topics.topicList[0]._id)
      await stores.app.setPage('topic')
    })

    await page.getByRole('button', { name: 'Додати нотатки' }).click()
    const picker = dialog(page)
    const candidates = picker.locator('.candidate')
    // nothing is listed until a search is set
    await expect(candidates).toHaveCount(0)

    // by the creation date: all three notes are from today, which is marked in the calendar
    await picker.getByRole('tab', { name: 'Дата' }).click()
    const today = picker.locator('.calendar__day--today')
    await expect(today).toHaveClass(/calendar__day--available/)
    await today.click()
    await expect(candidates).toHaveCount(3)

    await picker.getByRole('tab', { name: 'Текст' }).click()
    await picker.getByPlaceholder('Слова з тексту нотатки').fill('авраама')
    await expect(candidates).toHaveCount(1)

    await picker.getByRole('tab', { name: 'Ключове слово' }).click()
    await picker.locator('input').first().fill('віра')
    await page.locator('.v-overlay--active .v-list-item', { hasText: /^віра$/ }).click()
    await expect(candidates).toHaveCount(2)

    await candidates.locator('input[type=checkbox]').first().check()
    await candidates.locator('input[type=checkbox]').last().check()
    await picker.getByRole('button', { name: 'Додати (2)' }).click()

    await expect(page.locator('.nested-list > .draggable-item')).toHaveCount(2)

    await page
      .getByRole('button', { name: 'Повернутися' })
      .or(page.locator('.mdi-page-previous'))
      .first()
      .click()
    await expect(page.locator('.topic-row .v-chip')).toHaveText('2')
  })
})

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test('the add actions of a topic are in a menu', async ({ page }) => {
    await openBible(page)
    await signInLocally(page)
    await withStores(page, async (stores) => {
      await stores.topics.createTopic('Тема на телефоні')
      localStorage.setItem('topic', stores.topics.topicList[0]._id)
      await stores.app.setPage('topic')
    })

    await expect(page.getByRole('button', { name: 'Нова нотатка' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Додати', exact: true }).click()
    await page.locator('.v-overlay--active .v-list-item', { hasText: 'Додати вірші' }).click()
    await expect(dialog(page)).toContainText('За посиланням')
  })
})
