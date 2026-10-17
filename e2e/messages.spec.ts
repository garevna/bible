import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** The worker (see playwright.config.ts): a publisher who writes, or a member of a ministry who reads */
async function fakeWorker(
  page: Page,
  who: 'publisher' | 'member',
  inbox: unknown[] = [],
  phone: string | null = '+380501234567'
) {
  const sent: unknown[] = []
  const read: string[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me' && request.method() === 'PUT') {
      phone = request.postDataJSON().phone
      return route.fulfill({ json: { phone } })
    }
    if (path === '/me') {
      return route.fulfill({
        json: {
          role: who === 'publisher' ? 'publisher' : 'servant',
          telegram: false,
          rights: {
            publish: false,
            send: who === 'publisher',
            sendToPeople: who === 'publisher',
            sendToRoles: [],
            manage: []
          },
          ministries: who === 'member' ? ['Музичне служіння'] : [],
          canSend: who === 'publisher',
          canReceive: true,
          phone,
          needsPhone: !phone
        }
      })
    }
    if (path === '/types') return route.fulfill({ json: { types: [] } })
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
      roles: [],
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
                  text: 'Книга родоводу Ісуса Христа, сина Давидового, сина Авраамового.',
                  ref: 'Куліш, Євангелия від сьв. Маттея 1:1',
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

test('an answer is shown inside the message it answers; answered and waiting messages are marked', async ({
  page
}) => {
  const now = Date.now()
  const message = (id: string, fields: Record<string, unknown>) => ({
    id,
    fromUid: 'pastor-uid',
    fromName: 'Пастор',
    toUid: 'e2e-uid',
    toName: 'E2E',
    text: '',
    attachment: null,
    replyTo: null,
    createdAt: now,
    expiresAt: now + 86_400_000,
    readAt: now,
    ...fields
  })
  const inbox = [
    message('waiting', { text: 'Хто веде в суботу?', createdAt: now - 1000 }),
    message('asked', { text: 'Пісні на неділю', createdAt: now - 3000 }),
    message('answer', {
      fromUid: 'e2e-uid',
      fromName: 'E2E',
      toUid: 'pastor-uid',
      toName: 'Пастор',
      text: 'Добре, підготуємо',
      replyTo: 'asked',
      createdAt: now - 2000
    })
  ]
  await fakeWorker(page, 'member', inbox)
  await signIn(page)
  await page.getByRole('button', { name: 'Повідомлення' }).click()

  // two threads: the answer is inside the message it answers
  await expect(page.locator('.message')).toHaveCount(2)
  const asked = page.locator('.message', { hasText: 'Пісні на неділю' })
  await expect(asked.locator('.reply')).toContainText('Добре, підготуємо')
  await expect(asked.getByLabel('Ви відповіли')).toBeVisible()
  const waiting = page.locator('.message', { hasText: 'Хто веде в суботу?' })
  await expect(waiting.getByLabel('Чекає на відповідь')).toBeVisible()
})

test('an invitation is answered right in the message, a day at a time', async ({ page }) => {
  const now = Date.now()
  const asks = [
    { eventId: 'prayer', day: '2026-11-02', uid: 'e2e-uid', as: 'main' },
    { eventId: 'prayer', day: '2026-11-03', uid: 'e2e-uid', as: 'main' }
  ]
  const invitation = {
    id: 'invitation',
    fromUid: 'pastor-uid',
    fromName: 'Пастор',
    toUid: 'e2e-uid',
    toName: 'E2E',
    text: 'Запрошення на служіння: Ранкова молитва',
    attachment: null,
    replyTo: null,
    asks,
    createdAt: now,
    expiresAt: now + 86_400_000,
    readAt: now
  }
  await fakeWorker(page, 'member', [invitation])
  // the calendar: who answered what (the answers change it)
  const status: Record<string, string> = { '2026-11-02': 'invited', '2026-11-03': 'invited' }
  const answers: unknown[] = []
  await page.route('**/worker-test/schedule**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      const body = request.postDataJSON()
      answers.push(body)
      status[body.day] = body.answer === 'confirm' ? 'confirmed' : 'declined'
      return route.fulfill({ json: { answered: true } })
    }
    return route.fulfill({
      json: {
        events: [],
        days: [],
        today: '2026-11-01',
        participants: Object.entries(status).map(([day, value]) => ({
          eventId: 'prayer',
          day,
          uid: 'e2e-uid',
          name: 'E2E',
          status: value,
          backupUid: null,
          backupName: null,
          backupStatus: null,
          reason: null,
          role: null
        }))
      }
    })
  })
  await signIn(page)
  await page.getByRole('button', { name: 'Повідомлення' }).click()

  const card = page.locator('.message', { hasText: 'Ранкова молитва' })
  await expect(card.getByLabel('Чекає на відповідь')).toBeVisible()
  const days = card.locator('.ask')
  await expect(days).toHaveCount(2)

  await days.first().getByRole('button', { name: 'Підтвердити' }).click()
  await expect(days.first()).toContainText('✅ Ви підтвердили')
  await days.last().getByRole('button', { name: 'Не можу' }).click()
  await dialog(page).getByRole('button', { name: 'Не можу' }).click()
  await expect(days.last()).toContainText('❌ Ви не можете')
  // every day answered: the message is answered
  await expect(card.getByLabel('Ви відповіли')).toBeVisible()
  // the time in the words of the app: "16 жовтня о 20:16"
  await expect(card.locator('header small')).toHaveText(/^\d{1,2} \p{L}+ о \d{2}:\d{2}$/u)
  // nothing more to answer: it is cleared away
  await page.getByRole('button', { name: 'Прибрати неактуальні (1)' }).click()
  await expect(card).toHaveCount(0)
  expect(answers).toEqual([
    { eventId: 'prayer', day: '2026-11-02', uid: 'e2e-uid', as: 'main', answer: 'confirm' },
    {
      eventId: 'prayer',
      day: '2026-11-03',
      uid: 'e2e-uid',
      as: 'main',
      answer: 'decline',
      reason: 'На жаль, я не маю можливості взяти участь у цьому служінні.'
    }
  ])
})

test('a minister without a mobile number is asked for it; an empty group cannot be chosen', async ({
  page
}) => {
  await fakeWorker(page, 'publisher', [], null)
  await signIn(page)

  // asked once after signing in
  const phone = dialog(page)
  await expect(phone).toContainText('Номер мобільного')
  await phone.getByLabel('Номер', { exact: true }).fill('050 123')
  await expect(phone.getByRole('button', { name: 'Зберегти' })).toBeDisabled()
  await phone.getByLabel('Номер', { exact: true }).fill('0501234567')
  await expect(phone.getByLabel('Номер правильний')).toBeVisible()
  await phone.getByRole('button', { name: 'Зберегти' }).click()
  await expect.poll(() => withStores(page, (stores) => stores.worker.phone)).toBe('+380501234567')
  await expect(page.locator('.v-badge--dot .v-badge__badge')).toBeHidden()

  // the home group leaders have nobody yet
  await withStores(page, (stores) => stores.app.setPage('messages'))
  await page.getByRole('button', { name: 'Нове повідомлення' }).click()
  await dialog(page).locator('.v-select', { hasText: 'Усім учасникам служіння' }).click()
  const empty = page.locator('.v-overlay--active .v-list-item', { hasText: 'Лідер домашньої групи' })
  await expect(empty).toHaveClass(/v-list-item--disabled/)
  await expect(empty).toContainText('Служителів: 0')
  await expect(
    page.locator('.v-overlay--active .v-list-item', { hasText: 'Музичне служіння' })
  ).toContainText('Служителів: 1')
})
