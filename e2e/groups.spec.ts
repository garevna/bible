import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** today in the time zone of the browser, and its day of the week: a group meets then */
const today = new Date()
const TODAY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const GROUPS = [
  {
    id: 'g-mine',
    name: 'Салтівка',
    leaderUid: 'e2e-uid',
    leaderName: 'E2E',
    address: 'вул. Героїв Праці, 10',
    lat: 50.03,
    lng: 36.33,
    weekday: today.getDay(),
    time: '18:30',
    description: 'Біля метро',
    members: [{ id: 'm1', name: 'Ганна', birthday: '1950-03-08', note: 'Потрібна допомога' }],
    meetingNote: 'Тема: молитва',
    own: true
  },
  {
    id: 'g-other',
    name: 'Центр',
    leaderUid: 'leader-uid',
    leaderName: 'Лідер',
    address: 'вул. Сумська, 1',
    weekday: (today.getDay() + 1) % 7,
    time: '19:00',
    description: '',
    members: [{ id: 'm2', name: 'Петро', birthday: null, note: '' }],
    meetingNote: '',
    own: false
  }
]

/** The worker (see playwright.config.ts): a servant who leads one home group and sees the others */
async function fakeWorker(page: Page) {
  const requests: { method: string; path: string; body: unknown }[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me') {
      return route.fulfill({
        json: { role: 'servant', telegram: false, canReceive: true, phone: '+380501234567', groups: true }
      })
    }
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/groups')
      return route.fulfill({ json: { groups: GROUPS, visibility: 'servants', manage: false } })
    if (path.startsWith('/groups/')) {
      const body = request.postDataJSON()
      requests.push({ method: request.method(), path, body })
      return route.fulfill({ json: { group: { ...GROUPS[0], ...body } } })
    }
    return route.fulfill({ json: {} })
  })
  return requests
}

async function openGroups(page: Page) {
  await openBible(page)
  await signInLocally(page)
  await withStores(page, async (stores) => {
    stores.firebase.authUser = { getIdToken: async () => 'test-token' }
    await stores.worker.loadRole()
  })
  await page.getByRole('button', { name: 'E2E' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Домашні групи' }).click()
}

test('the home groups: on the map, in the calendar and as a list; the leader keeps their group', async ({
  page
}) => {
  const requests = await fakeWorker(page)
  await openGroups(page)

  // a marker for the group with a point; the other is named under the map
  await expect(page.locator('[data-group]')).toHaveCount(1)
  await expect(page.getByText('Без точки на карті: Центр')).toBeVisible()
  await page.locator('[data-group="g-mine"]').click()
  const card = dialog(page)
  await expect(card).toContainText('Салтівка')
  await expect(card).toContainText('18:30')
  await expect(card).toContainText('Лідер групи: E2E')
  // the leader sees the birthdays and the notes of their group
  await expect(card).toContainText('Ганна')
  await expect(card).toContainText('8 березня 1950')
  await expect(card).toContainText('Тема: молитва')

  // a new member, saved with the rest
  await card.getByRole('button', { name: 'Змінити' }).click()
  // the 24-hour clock: the digits only, made whole when the field is left
  const time = card.getByRole('textbox', { name: 'Час' })
  await expect(time).toHaveValue('18:30')
  await time.fill('930')
  await time.press('Tab')
  await expect(time).toHaveValue('09:30')
  await time.fill('2015')
  await expect(time).toHaveValue('20:15')
  // or chosen on the clock of the app: the hour, then the minutes
  await card.locator('.mdi-clock-outline').first().click()
  await page.locator('.clock [data-hour="07"]').click()
  await page.locator('.clock [data-minute="45"]').click()
  await expect(time).toHaveValue('07:45')
  await expect(page.locator('.clock')).toHaveCount(0)

  // a birthday: in the calendar of the app, its year chosen apart; shown in words
  await expect(card.getByRole('textbox', { name: 'День народження' }).first()).toHaveValue(
    '8 березня 1950 р.'
  )
  await card.getByRole('textbox', { name: 'Новий член групи: ім’я' }).fill('Олена')
  await card.locator('.new-member .mdi-plus-thick').click()
  await card.getByRole('textbox', { name: 'День народження' }).nth(1).click()
  await page.locator('.date-card .calendar__year').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: '1985' }).click()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  await page.locator(`.date-card [data-date="1985-${month}-15"]`).click()
  const birthday = new Intl.DateTimeFormat('uk', { dateStyle: 'full' })
    .format(new Date(1985, today.getMonth(), 15))
    .split(', ')
    .slice(1)
    .join(', ')
  await expect(card.getByRole('textbox', { name: 'День народження' }).nth(1)).toHaveValue(birthday)
  await card.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => requests.at(-1))
    .toMatchObject({
      method: 'PUT',
      path: '/groups/g-mine',
      body: {
        weekday: today.getDay(),
        time: '07:45',
        members: [
          { name: 'Ганна' },
          { name: 'Олена', birthday: `1985-${String(today.getMonth() + 1).padStart(2, '0')}-15` }
        ],
        meetingNote: 'Тема: молитва'
      }
    })
  await page.keyboard.press('Escape')

  // the calendar: today one group meets
  await page.getByRole('tab', { name: 'Календар' }).click()
  await expect(page.locator(`[data-day="${TODAY}"] .count`)).toHaveText('1')
  await page.locator(`[data-day="${TODAY}"]`).click()
  await expect(page.locator('.day-list .group-row')).toHaveCount(1)
  await expect(page.locator('.day-list .group-row')).toContainText('Салтівка')

  // the list: another's group shows the names only, and no button to change it
  await page.getByRole('tab', { name: 'Список' }).click()
  await expect(page.locator('.group-row')).toHaveCount(2)
  await page.locator('.group-row', { hasText: 'Центр' }).click()
  await expect(dialog(page)).toContainText('Петро')
  await expect(dialog(page).getByRole('button', { name: 'Змінити' })).toHaveCount(0)
})
