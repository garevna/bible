import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** The worker (see playwright.config.ts): a publisher who writes, or a member of a ministry who reads */
async function fakeWorker(page: Page, who: 'publisher' | 'member', inbox: unknown[] = []) {
  const sent: unknown[] = []
  const read: string[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me') {
      return route.fulfill({
        json: {
          role: who === 'publisher' ? 'publisher' : 'reader',
          telegram: false,
          ministries: who === 'member' ? ['Музичне служіння'] : [],
          canSend: who === 'publisher',
          canReceive: true
        }
      })
    }
    if (path === '/messages/recipients') {
      return route.fulfill({
        json: {
          people: [
            { uid: 'musician-uid', name: 'Музикант', role: 'reader', ministries: ['Музичне служіння'] }
          ],
          ministries: ['Музичне служіння', 'Лідер домашньої групи']
        }
      })
    }
    if (path === '/messages' && request.method() === 'GET') {
      return route.fulfill({ json: { messages: inbox, unread: inbox.length } })
    }
    const readMatch = path.match(/^\/messages\/(.+)\/read$/)
    if (readMatch) {
      read.push(readMatch[1]!)
      return route.fulfill({ json: { read: true } })
    }
    sent.push(request.postDataJSON())
    return route.fulfill({ json: { sent: 1 } })
  })
  return { sent, read }
}

async function signIn(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
}

test('the pastor sends a note to a ministry from the Notes page', async ({ page }) => {
  const { sent } = await fakeWorker(page, 'publisher')
  await signIn(page)
  await withStores(page, async (stores) => {
    await stores.notes.startNewNote({ lineRef: '1.000.000.000' })
    stores.notes.updateCurrentNoteText('Пісні на неділю')
    await stores.notes.saveCurrentNote()
    await stores.app.setPage('notes')
  })

  const note = page.locator('.notes-list .note', { hasText: 'Пісні на неділю' })
  await note.getByRole('button', { name: 'Надіслати служителям' }).click()
  const send = dialog(page)
  await expect(send.locator('.attachment')).toContainText('Пісні на неділю')
  await send.locator('.v-select', { hasText: 'Усім учасникам служіння' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Музичне служіння' }).click()
  await page.keyboard.press('Escape')
  await send.getByLabel('Текст повідомлення').fill('Підготуйте, будь ласка')
  await send.getByRole('button', { name: 'Надіслати', exact: true }).click()
  await expect(page.getByText('Надіслано: 1')).toBeVisible()

  expect(sent).toEqual([
    {
      to: [],
      ministries: ['Музичне служіння'],
      text: 'Підготуйте, будь ласка',
      attachment: {
        kind: 'note',
        post: {
          title: '',
          items: [
            {
              kind: 'note',
              text: 'Пісні на неділю',
              verses: [
                {
                  text: 'Книга родоводу Ісуса Христа, Сина Давидового, Сина Авраамового:',
                  ref: 'Огієнко, Від Матвія 1:1',
                  id: '1.000.000.000'
                }
              ]
            }
          ]
        }
      }
    }
  ])
})

test('a member of a ministry reads the message, saves the note and answers', async ({ page }) => {
  const message = {
    id: 'm1',
    fromUid: 'pastor-uid',
    fromName: 'Пастор',
    toUid: 'e2e-uid',
    toName: 'E2E',
    text: 'Пісні на неділю',
    attachment: {
      kind: 'note',
      post: {
        title: '',
        items: [
          {
            kind: 'note',
            text: 'Псалом 150',
            verses: [{ text: 'Хваліте', ref: 'Пс 150:1', id: '1.000.000.001' }]
          }
        ]
      }
    },
    replyTo: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86_400_000,
    readAt: null
  }
  const { sent, read } = await fakeWorker(page, 'member', [message])
  await signIn(page)

  // the envelope shows the unread message; a member of a ministry does not write first
  const envelope = page.getByRole('button', { name: 'Повідомлення' })
  await expect(envelope).toContainText('1')
  await envelope.click()
  await expect(page.getByRole('button', { name: 'Нове повідомлення' })).toHaveCount(0)

  const card = page.locator('.message', { hasText: 'Від: Пастор' })
  await expect(card).toContainText('Пісні на неділю')
  await expect(card.locator('.attachment')).toContainText('Псалом 150')
  await expect.poll(() => read).toEqual(['m1'])

  await card.getByRole('button', { name: 'Зберегти нотатку собі' }).click()
  await expect(card.getByRole('button', { name: 'Збережено' })).toBeDisabled()
  const saved = await withStores(page, async (stores) => {
    await stores.notes.updateDate(null)
    return stores.notes.notes.map((note: { text: string; refs: string[] }) => [note.text, note.refs])
  })
  expect(saved).toContainEqual(['Псалом 150', ['1.000.000.001']])

  await card.getByRole('button', { name: 'Відповісти' }).click()
  const answer = dialog(page)
  await answer.getByLabel('Текст повідомлення').fill('Добре, підготуємо')
  await answer.getByRole('button', { name: 'Надіслати', exact: true }).click()
  await expect.poll(() => sent).toEqual([{ replyTo: 'm1', text: 'Добре, підготуємо', attachment: null }])
})
