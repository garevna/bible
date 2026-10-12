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
          ref: 'Огієнко, Від Матвія 1:1',
          id: '1.000.000.000'
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

test('a picture is added to the head of the topic, kept, and published as a photo', async ({ page }) => {
  const posts = await fakeWorker(page, 'publisher')
  await openTopic(page)

  // a 300×200 picture, drawn in the page
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 200
    const context = canvas.getContext('2d')!
    context.fillStyle = '#36a'
    context.fillRect(0, 0, 300, 200)
    return canvas.toDataURL('image/png')
  })

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Додати картинку' }).click()
  await (
    await chooser
  ).setFiles({
    name: 'head.png',
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl.split(',')[1]!, 'base64')
  })

  await expect(page.locator('.topic-image img')).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  const saved = await withStores(page, async (stores) => {
    await stores.topics.getTopics()
    return stores.topics.topicList[0].image as string
  })
  expect(saved).toMatch(/^data:image\/jpeg;base64,/)

  // the reading mode shows the picture without the buttons
  await page.getByRole('button', { name: 'Режим читання' }).click()
  await expect(page.locator('.topic-image img')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Змінити картинку' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Режим редагування' }).click()

  await page.getByRole('button', { name: 'Опублікувати в Telegram' }).click()
  const publish = dialog(page)
  await expect(publish.locator('.telegram-photo img')).toBeVisible()
  await publish.getByRole('button', { name: 'Опублікувати', exact: true }).click()
  await expect(publish).toContainText('Опубліковано')
  expect((posts[0] as { image: string }).image).toBe(saved)
  await page.getByRole('button', { name: 'Закрити' }).last().click()

  await page.getByRole('button', { name: 'Прибрати картинку' }).click()
  await expect(page.getByRole('button', { name: 'Додати картинку' })).toBeVisible()
})

test('a note is published from the Notes page: its text and verses, no title', async ({ page }) => {
  const posts = await fakeWorker(page, 'publisher')
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    await stores.notes.startNewNote({ lineRef: '1.000.000.000' })
    stores.notes.updateCurrentNoteText('Родовід Ісуса')
    await stores.notes.saveCurrentNote()
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.app.setPage('notes')
    await stores.worker.loadRole()
  })

  const note = page.locator('.notes-list .note', { hasText: 'Родовід Ісуса' })
  await note.getByRole('button', { name: 'Опублікувати в Telegram' }).click()
  const publish = dialog(page)
  await expect(publish.locator('.telegram-message')).toBeVisible()
  await publish.getByRole('button', { name: 'Опублікувати', exact: true }).click()
  await expect(publish).toContainText('Опубліковано в каналі (1)')

  expect(posts).toEqual([
    {
      title: '',
      items: [
        {
          kind: 'note',
          text: 'Родовід Ісуса',
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
  ])
})
