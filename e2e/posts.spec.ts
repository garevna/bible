import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

const post = { title: '', items: [{ kind: 'note', text: 'Бог є любов', verses: [] }] }
const submission = (change: Record<string, unknown>) => ({
  id: 's1',
  kind: 'note',
  title: 'Бог є любов',
  post,
  authorUid: 'musician-uid',
  authorName: 'Музикант',
  approverUid: 'e2e-uid',
  approverName: 'E2E',
  status: 'pending',
  comment: '',
  taskId: null,
  createdAt: Date.now(),
  decidedAt: null,
  publishedAt: null,
  publishedBy: null,
  ...change
})

/** The worker (see playwright.config.ts): the posts of the channel the user sees, and what the app sends */
async function fakeWorker(
  page: Page,
  who: { approve?: boolean; publish?: boolean; submissions?: unknown[] }
) {
  const requests: { method: string; path: string; body: unknown }[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    const body = request.postData() ? request.postDataJSON() : null
    if (request.method() !== 'GET' && path !== '/telegram/preview')
      requests.push({ method: request.method(), path, body })
    if (path === '/me')
      return route.fulfill({
        json: {
          role: 'servant',
          telegram: true,
          canReceive: true,
          phone: '+380501234567',
          rights: { publish: Boolean(who.publish), approvePosts: Boolean(who.approve), manage: [] }
        }
      })
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/posts' && request.method() === 'GET')
      return route.fulfill({
        json: {
          submissions: who.submissions ?? [],
          tasks: [],
          approvers: [{ uid: 'pastor-uid', name: 'Пастор Іван' }],
          people: [{ uid: 'musician-uid', name: 'Музикант' }],
          canApprove: Boolean(who.approve),
          canPublish: Boolean(who.publish)
        }
      })
    if (path === '/telegram/preview')
      return route.fulfill({ json: { messages: ['Бог є любов'], caption: null } })
    if (path === '/posts')
      return route.fulfill({
        json: { submission: submission({ ...body, id: 'new', approverUid: body.approverUid }) }
      })
    if (path.endsWith('/approve'))
      return route.fulfill({ json: { submission: submission({ status: 'approved' }) } })
    if (path.endsWith('/return'))
      return route.fulfill({
        json: { submission: submission({ status: 'returned', comment: body.comment }) }
      })
    if (path.endsWith('/publish'))
      return route.fulfill({
        json: { submission: submission({ status: 'published' }), channel: 'Канал ХХЦ' }
      })
    if (path === '/post-tasks')
      return route.fulfill({
        json: {
          task: {
            id: 't1',
            byUid: 'e2e-uid',
            byName: 'E2E',
            assigneeUid: body.assigneeUid,
            assigneeName: 'Музикант',
            text: body.text,
            approverUid: body.approverUid,
            approverName: null,
            due: body.due,
            status: 'open',
            createdAt: Date.now()
          }
        }
      })
    return route.fulfill({ json: {} })
  })
  return requests
}

async function signIn(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
}

async function openPosts(page: Page) {
  await page.getByRole('button', { name: 'E2E', exact: true }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Публікації' }).click()
}

test('a servant sends a note for publication; a pastor approves it', async ({ page }) => {
  const requests = await fakeWorker(page, {})
  await signIn(page)
  await withStores(page, async (stores) => {
    await stores.notes.startNewNote({ lineRef: '1.000.000.000' })
    stores.notes.updateCurrentNoteText('Бог є любов')
    await stores.notes.saveCurrentNote()
    await stores.app.setPage('notes')
  })
  const note = page.locator('.notes-list .note', { hasText: 'Бог є любов' })
  await note.getByRole('button', { name: 'Надіслати на публікацію в канал' }).click()
  const send = dialog(page)
  // the only pastor who approves is chosen already
  await expect(send.locator('.v-select', { hasText: 'Хто затверджує' })).toContainText('Пастор Іван')
  await send.getByRole('button', { name: 'Надіслати', exact: true }).click()
  await expect(send).toContainText('Надіслано на затвердження')
  expect(requests.find((request) => request.path === '/posts')).toMatchObject({
    method: 'POST',
    body: {
      kind: 'note',
      approverUid: 'pastor-uid',
      post: { items: [{ kind: 'note', text: 'Бог є любов' }] }
    }
  })
})

test('a pastor approves or returns with a word, and asks a servant to prepare a post', async ({ page }) => {
  const requests = await fakeWorker(page, { approve: true, submissions: [submission({})] })
  await signIn(page)
  await openPosts(page)
  // what waits for the pastor opens first
  await expect(page.getByRole('tab', { name: /На затвердження/ })).toHaveAttribute('aria-selected', 'true')
  const card = page.locator('.post-card', { hasText: 'Бог є любов' })
  await expect(card).toContainText('Автор: Музикант')
  await card.getByRole('button', { name: 'Повернути' }).click()
  await dialog(page).getByRole('textbox', { name: 'Що виправити (автор побачить)' }).fill('Додайте вірш')
  await dialog(page).getByRole('button', { name: 'Повернути' }).click()
  await expect
    .poll(() => requests.find((request) => request.path === '/posts/s1/return'))
    .toMatchObject({ body: { comment: 'Додайте вірш' } })

  await page.getByRole('tab', { name: /Доручення/ }).click()
  // a new task: in its own window, sent by its button
  await page.getByRole('button', { name: 'Нове доручення' }).click()
  const form = dialog(page)
  await form.locator('.v-autocomplete', { hasText: 'Кому' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Музикант' }).click()
  await form.getByRole('textbox', { name: 'Що підготувати' }).fill('Анонс молодіжної зустрічі')
  await form.getByRole('button', { name: 'Надіслати', exact: true }).click()
  // a window says what went to whom
  const sentDialog = dialog(page)
  await expect(sentDialog).toContainText('Доручення надіслано: Музикант')
  await expect(sentDialog).toContainText('«Анонс молодіжної зустрічі»')
  await sentDialog.getByRole('button', { name: 'Добре' }).click()
  await expect
    .poll(() => requests.find((request) => request.path === '/post-tasks'))
    .toMatchObject({
      body: { assigneeUid: 'musician-uid', text: 'Анонс молодіжної зустрічі', approverUid: null }
    })
})

test('the administrator of the channel publishes the approved, not the waiting', async ({ page }) => {
  const requests = await fakeWorker(page, {
    publish: true,
    submissions: [
      submission({ id: 's2', title: 'Чекає', status: 'pending' }),
      submission({ status: 'approved' })
    ]
  })
  await signIn(page)
  await openPosts(page)
  await expect(page.getByRole('tab', { name: /Черга каналу/ })).toHaveAttribute('aria-selected', 'true')
  const waiting = page.locator('.post-card', { hasText: 'Чекає' })
  await expect(waiting).toContainText('Очікує затвердження')
  await expect(waiting.getByRole('button', { name: 'Опублікувати' })).toBeDisabled()
  const ready = page.locator('.post-card', { hasText: 'Затверджено' })
  await ready.getByRole('button', { name: 'Опублікувати' }).click()
  await expect
    .poll(() => requests.find((request) => request.path === '/posts/s1/publish'))
    .toMatchObject({ method: 'POST' })
  // a window says where it went
  await expect(dialog(page)).toContainText('Повідомлення надіслано в канал «Канал ХХЦ»')
})
