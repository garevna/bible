import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** today in the time zone of the browser: its day of the week has a group */
const today = new Date()

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
    name: '',
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

/**
 * The worker (see playwright.config.ts): a user who leads one home group; an administrator (the
 * directories) keeps all of them in the dashboard
 */
async function fakeWorker(page: Page, admin = false) {
  const requests: { method: string; path: string; body: unknown }[] = []
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    if (path === '/me' && request.method() === 'GET') {
      return route.fulfill({
        json: {
          role: admin ? 'admin' : 'servant',
          telegram: false,
          canReceive: true,
          phone: '+380501234567',
          rights: { manage: admin ? ['directories'] : [] }
        }
      })
    }
    if (path === '/admin/settings')
      return route.fulfill({
        json: {
          roles: [],
          types: [],
          ministries: [],
          locations: [],
          eventTypes: [],
          calendar: { redDays: 2, orangeDays: 5, filters: [] }
        }
      })
    if (path === '/schedule/people')
      return route.fulfill({
        json: { people: [{ uid: 'leader-uid', name: 'Лідер', ministries: [], phone: null }] }
      })
    if (path === '/schedule')
      return route.fulfill({ json: { events: [], days: [], participants: [], changes: [] } })
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/me' && request.method() === 'PUT') {
      const body = request.postDataJSON()
      requests.push({ method: 'PUT', path, body })
      return route.fulfill({ json: body })
    }
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/groups' && request.method() === 'GET')
      return route.fulfill({ json: { groups: GROUPS, visibility: 'servants', manage: admin } })
    if (path === '/groups') {
      const body = request.postDataJSON()
      requests.push({ method: 'POST', path, body })
      return route.fulfill({
        json: {
          group: {
            ...body,
            id: 'g-new',
            leaderName: body.leaderName,
            description: '',
            members: [],
            meetingNote: '',
            own: true
          }
        }
      })
    }
    if (path.startsWith('/groups/')) {
      const body = request.postDataJSON()
      requests.push({ method: request.method(), path, body })
      return route.fulfill({ json: { group: { ...GROUPS[0], ...body } } })
    }
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

/** the home groups are kept in the dashboard */
async function openGroups(page: Page) {
  await signIn(page)
  await page.getByRole('button', { name: 'Адміністрування' }).click()
  await page.locator('.admin-nav').getByText('Домашні групи').click()
}

test('the home groups: by the week, on the map and as a list; the leader keeps their group', async ({
  page
}) => {
  const requests = await fakeWorker(page, true)
  await openGroups(page)

  // the week: the days with their numbers of groups; a day opens its hours, an hour its groups
  const day = page.locator(`[data-weekday="${today.getDay()}"]`)
  await expect(day.locator('.count')).toHaveText('1')
  await day.click()
  await expect(page.locator('[data-hour="18"] .count')).toHaveText('1')
  // an hour without groups is not chosen
  await expect(page.locator('[data-hour="9"]')).toBeDisabled()
  await page.locator('[data-hour="18"]').click()
  await expect(page.locator('.list-title')).toContainText('18:00')
  await expect(page.locator('.week .group-row')).toHaveCount(1)
  await expect(page.locator('.week .group-row')).toContainText('Салтівка · E2E')

  // the map: a marker for the group with a point; its hint says when, and the leader
  await page.getByRole('tab', { name: 'Карта' }).click()
  await expect(page.locator('[data-group]')).toHaveCount(1)
  await expect(page.getByText('Без точки на карті: Лідер')).toBeVisible()
  await page.locator('[data-group="g-mine"]').hover()
  await expect(page.locator('.group-hint')).toContainText('18:30')
  await expect(page.locator('.group-hint')).toContainText('E2E')
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

  // the list: another's group (no name: its leader); an administrator changes its day, time and leader
  await page.getByRole('tab', { name: 'Список' }).click()
  await expect(page.locator('.group-row')).toHaveCount(2)
  await page.locator('.group-row', { hasText: 'Лідер' }).click()
  const other = dialog(page)
  await expect(other).toContainText('Петро')
  await other.getByRole('button', { name: 'Змінити' }).click()
  // the people and the notes stay the leader's
  await expect(other.getByText('Члени групи', { exact: true })).toHaveCount(0)
  await other.getByRole('textbox', { name: 'Час' }).fill('1930')
  await other.locator('.v-combobox input').fill('Іваненко Іван')
  await other.getByRole('textbox', { name: 'Час' }).click()
  await other.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => requests.at(-1))
    .toMatchObject({
      method: 'PUT',
      path: '/groups/g-other',
      body: { time: '19:30', leaderUid: '', leaderName: 'Іваненко Іван' }
    })
  await page.keyboard.press('Escape')

  // a new group: its leader (a name typed in), the day, the time and the place
  await page.getByRole('button', { name: 'Нова група' }).click()
  const fresh = dialog(page)
  await fresh.locator('.v-combobox input').fill('Коваленко Олена')
  await fresh.locator('.v-select', { hasText: 'День тижня' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'четвер' }).click()
  await fresh.getByRole('textbox', { name: 'Час' }).fill('1800')
  await fresh.getByRole('textbox', { name: 'Де збирається' }).fill('вул. Пушкінська, 5')
  await fresh.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => requests.find((request) => request.method === 'POST'))
    .toMatchObject({
      path: '/groups',
      body: {
        leaderUid: '',
        leaderName: 'Коваленко Олена',
        weekday: 4,
        time: '18:00',
        address: 'вул. Пушкінська, 5'
      }
    })
})

test('a group for a new member: the days and hours that suit, the nearest first', async ({ page }) => {
  await fakeWorker(page, true)
  // the address is found by OpenStreetMap: near the Saltivka group
  await page.route('**/nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({
      json: [
        {
          place_id: 1,
          display_name: 'Академіка Павлова, 120, Харків',
          lat: '50.025',
          lon: '36.330',
          address: { road: 'вулиця Академіка Павлова', house_number: '120', city: 'Харків' }
        }
      ]
    })
  )
  await openGroups(page)
  await page.getByRole('tab', { name: 'Пошук групи' }).click()
  await expect(page.getByText('Знайдено груп: 2')).toBeVisible()

  // the day of the Saltivka group only
  const name = new Intl.DateTimeFormat('uk', { weekday: 'short' }).format(today)
  await page.locator('.search .v-chip', { hasText: name }).click()
  await expect(page.getByText('Знайдено груп: 1')).toBeVisible()
  // not before 19:00: none
  await page.getByRole('textbox', { name: 'Не раніше' }).fill('1900')
  await expect(page.getByText('Знайдено груп: 0')).toBeVisible()
  await page.getByRole('textbox', { name: 'Не раніше' }).fill('1800')
  await expect(page.getByText('Знайдено груп: 1')).toBeVisible()

  // near the home: the distance to the group
  await page.getByRole('textbox', { name: 'Адреса біля дому' }).fill('Павлова 120')
  await page.getByRole('textbox', { name: 'Адреса біля дому' }).press('Enter')
  await page.locator('.places .v-list-item', { hasText: 'Академіка Павлова' }).click()
  await expect(page.locator('.result .distance')).toHaveText('0,6 км')
})

test('my home group: chosen by the day and the time, by the leader or by the place; the one I lead', async ({
  page
}) => {
  const requests = await fakeWorker(page)
  await signIn(page)
  // a servant has no page of the groups: their own group is in the menu of the avatar
  await page.getByRole('button', { name: 'E2E', exact: true }).click()
  await expect(page.locator('.v-overlay--active .v-list-item', { hasText: /^Домашні групи$/ })).toHaveCount(0)
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Моя домашня група' }).click()
  const choose = dialog(page)
  await expect(choose).toContainText('Групу ще не вибрано')

  // by the day and the time, then from the list
  const tomorrow = new Intl.DateTimeFormat('uk', { weekday: 'long' }).format(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  )
  await choose.locator('.v-select', { hasText: 'День тижня' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: tomorrow }).click()
  await choose.locator('.v-select', { hasText: 'Час' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: '19:00' }).click()
  await expect(choose.locator('.choice')).toHaveCount(1)
  await expect(choose.locator('.choice')).toContainText('вул. Сумська, 1')

  // by the place
  await choose.getByRole('button', { name: 'За адресою' }).click()
  await choose.locator('.v-autocomplete').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'вул. Героїв Праці, 10' }).click()
  await expect(choose.locator('.choice')).toContainText('Салтівка · E2E')

  // by the leader
  await choose.getByRole('button', { name: 'За лідером' }).click()
  await choose.locator('.v-autocomplete').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Лідер' }).click()
  await choose.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => requests.find((request) => request.path === '/me'))
    .toMatchObject({ method: 'PUT', body: { homeGroupId: 'g-other' } })

  // the leader opens the group they lead
  await page.getByRole('button', { name: 'E2E', exact: true }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Моя домашня група' }).click()
  await dialog(page).getByRole('button', { name: 'Група, яку я веду' }).click()
  await expect(dialog(page)).toContainText('Тема: молитва')
  await expect(dialog(page).getByRole('button', { name: 'Змінити' })).toBeVisible()
})
