import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

const TODAY = '2026-10-13'
const TOMORROW = '2026-10-14'

const event = (id: string, fields: Record<string, unknown>) => ({
  id,
  ministry: 'Молитовне',
  title: '',
  description: '',
  location: 'Онлайн',
  day: null,
  weekdays: null,
  time: '06:45',
  until: null,
  needed: 2,
  mode: 'invite',
  responsibleUid: 'leader-uid',
  responsibleName: 'Лідер',
  deputyUid: null,
  deputyName: null,
  ...fields
})

const participant = (eventId: string, day: string, fields: Record<string, unknown>) => ({
  eventId,
  day,
  uid: 'e2e-uid',
  name: 'E2E',
  status: 'invited',
  backupUid: null,
  backupName: null,
  backupStatus: null,
  reason: null,
  ...fields
})

/** The worker (see playwright.config.ts): the schedule of a minister of the prayer ministry, or of a planner */
async function fakeWorker(page: Page, planner = false) {
  const posted: { path: string; body: unknown }[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me') {
      return route.fulfill({
        json: {
          role: planner ? 'admin' : 'servant',
          telegram: false,
          rights: {
            publish: false,
            send: false,
            sendToPeople: false,
            sendToRoles: [],
            manage: planner ? ['schedule'] : []
          },
          ministries: ['Молитовне'],
          canSend: false,
          canReceive: true,
          phone: '+380501234567',
          needsPhone: false
        }
      })
    }
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/ministries') {
      return route.fulfill({
        json: { ministries: ['Молитовне', 'Пасторське'], locations: ['Церква', 'Онлайн'] }
      })
    }
    if (path === '/schedule/people') {
      return route.fulfill({
        json: { people: [{ uid: 'e2e-uid', name: 'E2E', ministries: ['Молитовне'], phone: null }] }
      })
    }
    if (path === '/schedule') {
      return route.fulfill({
        json: {
          events: [
            event('morning', { title: 'Ранкова молитва', weekdays: [1, 2, 3, 4, 5, 6] }),
            event('evening', {
              title: 'Вечірня молитва',
              time: '19:00',
              mode: 'open',
              weekdays: [0, 1, 2, 3, 4, 5, 6]
            }),
            event('service', { ministry: 'Пасторське', location: 'Церква', time: '10:00', day: TOMORROW })
          ],
          days: [
            { eventId: 'morning', day: TODAY },
            { eventId: 'evening', day: TODAY },
            { eventId: 'morning', day: TOMORROW },
            { eventId: 'service', day: TOMORROW }
          ],
          participants: [
            participant('morning', TODAY, {}),
            participant('morning', TOMORROW, {
              uid: 'other-uid',
              name: 'Інший',
              status: 'confirmed',
              backupUid: 'e2e-uid',
              backupName: 'E2E',
              backupStatus: 'invited'
            })
          ],
          today: TODAY
        }
      })
    }
    posted.push({ path, body: request.postDataJSON() })
    return route.fulfill({ json: { ok: true } })
  })
  return posted
}

async function signIn(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
}

const occurrence = (page: Page, day: string, name: string) =>
  page
    .locator('section', { has: page.locator('.day-title', { hasText: day }) })
    .locator('.occurrence', { hasText: name })

test('a minister lands on the calendar and answers the invitations', async ({ page }) => {
  // after the init script of the fixtures
  await page.addInitScript(() => sessionStorage.removeItem('bible:calendar-landed'))
  const posted = await fakeWorker(page)
  await signIn(page)

  await expect(page.locator('.view-title', { hasText: 'Календар служінь' })).toBeVisible()
  await expect(page.locator('.day-title').first()).toContainText('Сьогодні')

  // invited to the morning prayer of today: confirm
  const morning = occurrence(page, 'Сьогодні', 'Ранкова молитва')
  await expect(morning).toHaveClass(/occurrence--mine/)
  await expect(morning).toContainText('E2E · запрошено')
  await morning.getByRole('button', { name: 'Підтвердити' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/answer',
      body: { eventId: 'morning', day: TODAY, uid: 'e2e-uid', as: 'main', answer: 'confirm' }
    })

  // the backup of tomorrow: "I can't", with the usual words
  const tomorrow = page.locator('.occurrence', { hasText: 'Ви — дублер (Інший)' })
  await tomorrow.getByRole('button', { name: 'Не можу' }).click()
  const decline = dialog(page)
  await expect(decline.getByLabel('Причина')).toHaveValue(
    'На жаль, я не маю можливості взяти участь у цьому служінні.'
  )
  await decline.getByLabel('Причина').fill('Хворію')
  await decline.getByRole('button', { name: 'Не можу' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/answer',
      body: {
        eventId: 'morning',
        day: TOMORROW,
        uid: 'other-uid',
        as: 'backup',
        answer: 'decline',
        reason: 'Хворію'
      }
    })

  // the evening prayer is open to the prayer ministry
  await occurrence(page, 'Сьогодні', 'Вечірня молитва').getByRole('button', { name: 'Подати заявку' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({ path: '/schedule/apply', body: { eventId: 'evening', day: TODAY } })

  // the pastoral service is not the user's: no buttons, and gone with "mine only"
  await expect(page.locator('.occurrence', { hasText: 'Пасторське' }).getByRole('button')).toHaveCount(0)
  await page.getByLabel('Лише мої').check()
  await expect(page.locator('.occurrence', { hasText: 'Пасторське' })).toHaveCount(0)
  await expect(page.locator('.occurrence', { hasText: 'Вечірня молитва' })).toHaveCount(0)
})

test('a planner adds an event', async ({ page }) => {
  const posted = await fakeWorker(page, true)
  await signIn(page)
  // the fixtures already "landed": the calendar is opened from the header
  await page.getByRole('button', { name: 'Календар служінь' }).click()

  await page.getByRole('button', { name: 'Додати подію' }).click()
  const form = dialog(page)
  await form.locator('.v-select', { hasText: 'Служіння' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Пасторське' }).click()
  await form.getByLabel('Назва (необов’язково)').fill('Причастя')
  await form.getByLabel('Дата', { exact: true }).fill('2026-10-18')
  await form.getByLabel('Час', { exact: true }).fill('11:00')
  await form.getByLabel('Локація').fill('Церква')
  await form.getByRole('button', { name: 'Зберегти' }).click()

  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/events',
      body: {
        ministry: 'Пасторське',
        title: 'Причастя',
        description: '',
        location: 'Церква',
        day: '2026-10-18',
        weekdays: null,
        time: '11:00',
        until: null,
        needed: 1,
        mode: 'invite',
        responsibleUid: 'e2e-uid',
        deputyUid: null
      }
    })
  await expect(form).toBeHidden()
})
