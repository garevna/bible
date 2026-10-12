import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** The worker (see playwright.config.ts): its answers for a publisher or a reader */
async function fakeWorker(page: Page, role: 'publisher' | 'reader') {
  const posts: unknown[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    expect(request.headers().authorization).toBe('Bearer test-token')
    if (path === '/me') return route.fulfill({ json: { role, telegram: true } })
    const post = request.postDataJSON()
    if (path === '/telegram/preview') return route.fulfill({ json: { messages: [`<b>${post.title}</b>`] } })
    posts.push(post)
    return route.fulfill({ json: { sent: 1 } })
  })
  return posts
}

async function openTopic(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    await stores.topics.createTopic('Проповідь')
    const topic = stores.topics.topicList[0]
    await stores.content.addTopicToVerse(topic._id, '1.000.000.000')
    localStorage.setItem('topic', topic._id)
    await stores.app.setPage('topic')
  })
  await expect(page.locator('.topic-title')).toHaveText('Проповідь')
  // the Firebase user gives the token for the worker; the store asks the worker again
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
}

test('a publisher previews the topic and publishes it to Telegram', async ({ page }) => {
  const posts = await fakeWorker(page, 'publisher')
  await openTopic(page)

  await page.getByRole('button', { name: 'Опублікувати в Telegram' }).click()
  const publish = dialog(page)
  await expect(publish.locator('.telegram-message')).toHaveText('Проповідь')
  await publish.getByRole('button', { name: 'Опублікувати', exact: true }).click()
  await expect(publish).toContainText('Опубліковано в каналі (1)')

  expect(posts).toEqual([
    {
      title: 'Проповідь',
      items: [
        {
          kind: 'verse',
          text: 'Книга родоводу Ісуса Христа, Сина Давидового, Сина Авраамового:',
          ref: 'Від Матвія 1:1'
        }
      ]
    }
  ])

  // the reading mode has no controls, publishing too
  await page.getByRole('button', { name: 'Закрити' }).last().click()
  await page.getByRole('button', { name: 'Режим читання' }).click()
  await expect(page.getByRole('button', { name: 'Опублікувати в Telegram' })).toHaveCount(0)
})

test('a reader is not offered publishing', async ({ page }) => {
  await fakeWorker(page, 'reader')
  await openTopic(page)
  await expect(page.getByRole('button', { name: 'Додати в тему' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Опублікувати в Telegram' })).toHaveCount(0)
})
