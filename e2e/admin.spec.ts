import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

const role = (id: string, name: string, change: Record<string, unknown> = {}) => ({
  id,
  name,
  publish: false,
  send: false,
  sendToRoles: [],
  sendToPeople: false,
  messageDays: 1,
  approve: false,
  invite: [] as string[],
  manage: [],
  ...change
})

/** the four statuses */
const ROLES = [
  role('supervisor', 'Супервайзер', {
    publish: true,
    manage: ['roles', 'users', 'directories', 'types', 'schedule']
  }),
  role('admin', 'Адміністратор', { publish: true, send: true, sendToRoles: ['servant'] }),
  role('servant', 'Служитель'),
  role('reader', 'Читач')
]

/** today in the time zone of the browser: the coming days of the events */
const today = new Date()
const TODAY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const SCHEDULE = {
  events: [
    {
      id: 'prayer',
      typeId: null,
      ministry: 'Молитовне служіння',
      title: 'Ранкова молитва',
      description: '',
      location: 'Онлайн',
      day: null,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      // late: the events of today are gone once they begin
      time: '23:58',
      times: null,
      until: null,
      needed: 2,
      slots: [],
      mode: 'invite',
      applicants: 'ministry',
      responsibleUid: 'leader-uid',
      responsibleName: 'Лідер',
      deputyUid: null,
      deputyName: null
    }
  ],
  days: [{ eventId: 'prayer', day: TODAY }],
  participants: [
    {
      eventId: 'prayer',
      day: TODAY,
      uid: 'leader-uid',
      name: 'Лідер',
      status: 'confirmed',
      backupUid: null,
      backupName: null,
      backupStatus: null,
      reason: null,
      role: null
    }
  ],
  changes: [],
  materials: [],
  types: [],
  calendar: { redDays: 2, orangeDays: 5, filters: [] },
  today: TODAY
}

/** The worker (see playwright.config.ts); signInLocally signs in as e2e-uid with the given functions */
async function fakeWorker(page: Page, manage: string[], leads: string[] = []) {
  const users = [
    {
      uid: 'e2e-uid',
      email: 'e2e@example.com',
      emailVerified: true,
      name: 'E2E',
      role: 'admin',
      phone: '+380501234567',
      telegramChatId: 555,
      owner: false,
      lastSeen: Date.now()
    },
    {
      uid: 'leader-uid',
      email: 'leader@example.com',
      emailVerified: true,
      name: 'Лідер',
      role: 'servant',
      ministries: ['Музичне служіння'],
      owner: false,
      lastSeen: Date.now()
    },
    {
      uid: 'pastor-uid',
      email: 'pastor@example.com',
      emailVerified: false,
      name: null,
      role: 'reader',
      owner: false,
      lastSeen: Date.now()
    }
  ]
  const requests: { method: string; path: string; body: unknown }[] = []
  const lists = { ministries: ['Музичне служіння', 'Молитовне служіння'], locations: ['Церква'] }
  await page.route('**/worker-test/**', async (route: Route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/worker-test', '')
    const rights = { publish: true, send: false, sendToPeople: false, sendToRoles: [], manage }
    if (path === '/me') {
      return route.fulfill({
        json: { role: 'admin', telegram: true, rights, canReceive: true, phone: '+380501234567', leads }
      })
    }
    if (path === '/types') return route.fulfill({ json: { types: [] } })
    if (path === '/messages') return route.fulfill({ json: { messages: [], unread: 0 } })
    if (path === '/admin/settings') {
      return route.fulfill({
        json: {
          roles: ROLES,
          types: [],
          ministries: ['Музичне служіння', 'Молитовне служіння'],
          locations: ['Церква'],
          eventTypes: [
            { id: 'morning-prayer', name: 'Ранкова молитва', ministry: null, roles: 'none', slots: [] }
          ],
          calendar: { redDays: 2, orangeDays: 5, filters: ['type', 'ministry', 'event', 'person', 'mine'] }
        }
      })
    }
    if (path === '/admin/users')
      return route.fulfill({ json: { users, roles: ROLES, ministries: ['Музичне служіння'] } })
    // the calendar, as the directory of the ministries shows it
    if (path === '/schedule/people') {
      return route.fulfill({
        json: {
          people: users.map((item) => ({
            uid: item.uid,
            name: item.name ?? item.email,
            ministries: [],
            phone: null
          }))
        }
      })
    }
    if (path === '/ministries')
      return route.fulfill({
        json: { ministries: ['Музичне служіння', 'Молитовне служіння'], locations: ['Церква'] }
      })
    if (path === '/schedule') return route.fulfill({ json: SCHEDULE })
    // the roles of the ministries the user leads
    if (path === '/ministry-roles') {
      return route.fulfill({
        json: {
          ministryRoles: Object.fromEntries(
            leads.map((ministry) => [
              ministry,
              [
                {
                  id: 'r-lead',
                  name: 'Лідер служіння',
                  lead: true,
                  invite: true,
                  approve: true,
                  publish: false,
                  send: true,
                  uids: ['e2e-uid']
                }
              ]
            ])
          )
        }
      })
    }
    if (path.startsWith('/ministry-roles/')) {
      const body = request.postDataJSON()
      requests.push({ method: request.method(), path: decodeURIComponent(path), body })
      return route.fulfill({ json: { roles: body.roles } })
    }
    const body = request.postData() ? request.postDataJSON() : null
    requests.push({ method: request.method(), path, body })
    if (
      [
        '/admin/roles',
        '/admin/event-types',
        '/admin/calendar',
        '/admin/ministry-roles',
        '/admin/addresses'
      ].includes(path) ||
      path.startsWith('/admin/directories/')
    ) {
      // a renamed item: the list with its new name
      const renamed = path.match(/^\/admin\/directories\/(\w+)\/rename$/)?.[1] as
        keyof typeof lists | undefined
      if (renamed) {
        lists[renamed] = lists[renamed].map((item) => (item === body.from ? body.to : item))
        return route.fulfill({ json: { items: lists[renamed] } })
      }
      const list = path.match(/^\/admin\/directories\/(\w+)$/)?.[1] as keyof typeof lists | undefined
      if (list) lists[list] = body.items
      return route.fulfill({ json: body })
    }
    const uid = decodeURIComponent(path.replace('/admin/users/', ''))
    const user = users.find((item) => item.uid === uid)!
    if (request.method() === 'DELETE') return route.fulfill({ json: { removed: uid } })
    return route.fulfill({ json: { user: { ...user, ...body, updatedBy: 'E2E' } } })
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

async function openDashboard(page: Page) {
  await signIn(page)
  await page.getByRole('button', { name: 'Адміністрування' }).click()
}

test('the sections on the left; ministers get roles, the readers are shown on request', async ({ page }) => {
  const requests = await fakeWorker(page, ['roles', 'users', 'directories'])
  await openDashboard(page)

  const nav = page.locator('.admin-nav')
  await expect(nav.locator('.v-list-item')).toHaveText(['Статуси', 'Служителі', 'Служіння', 'Локації'])

  await nav.getByText('Служителі').click()
  const rows = page.locator('.users-table tbody tr:not(.details-row)')
  // the reader is hidden until asked for
  await expect(rows).toHaveCount(2)
  await page.getByLabel('Показати читачів').check()
  await expect(rows).toHaveCount(3)
  // who finished signing up: a mobile number and Telegram (the readers need neither)
  await expect(
    rows.filter({ hasText: 'це ви' }).getByLabel('Усе заповнено, Telegram підключено')
  ).toBeVisible()
  await expect(
    rows.filter({ hasText: 'Лідер' }).getByLabel('немає номера мобільного, Telegram не підключено')
  ).toBeVisible()
  await expect(rows.filter({ hasText: 'pastor@example.com' }).locator('.readiness')).toHaveCount(0)
  // a ministry filters the table
  await page.locator('.filters .v-select', { hasText: 'Служіння' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Музичне служіння' }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Лідер')
  await page
    .locator('.filters .v-select', { hasText: 'Музичне служіння' })
    .locator('.mdi-close-circle')
    .click()
  await expect(rows).toHaveCount(3)

  // a row opens its details: the status, the name
  await rows.filter({ hasText: 'pastor@example.com' }).click()
  const details = page.locator('.details-row')
  await details.locator('.v-select', { hasText: 'Статус' }).click()
  // an administrator does not make a supervisor
  await expect(page.locator('.v-overlay--active .v-list-item', { hasText: 'Супервайзер' })).toHaveCount(0)
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Служитель' }).click()
  await expect
    .poll(() => requests)
    .toContainEqual({ method: 'PUT', path: '/admin/users/pastor-uid', body: { role: 'servant' } })
  await details.getByLabel('Ім’я').fill('Пастор Петро')
  await details.locator('.mdi-content-save-outline').click()
  await expect
    .poll(() => requests)
    .toContainEqual({ method: 'PUT', path: '/admin/users/pastor-uid', body: { name: 'Пастор Петро' } })

  // the administrator's own role is not changed here
  await rows.filter({ hasText: 'pastor@example.com' }).click()
  await expect(details).toHaveCount(0)
  await rows.filter({ hasText: 'це ви' }).click()
  await expect(details.locator('.v-select', { hasText: 'Статус' })).toHaveClass(/v-input--disabled/)
})

test('statuses: four of them, their rights changed and saved together', async ({ page }) => {
  const requests = await fakeWorker(page, ['roles', 'users', 'directories'])
  await openDashboard(page)

  const panels = page.locator('.role-panel')
  await expect(panels).toHaveCount(4)
  // none is added or removed; the supervisor has every right
  await expect(page.getByRole('button', { name: 'Додати роль' })).toHaveCount(0)
  const supervisor = panels.filter({ hasText: 'Супервайзер' })
  await supervisor.locator('.v-expansion-panel-title').click()
  await expect(supervisor).toContainText('Супервайзер має всі права')

  const admin = panels.filter({ hasText: 'Адміністратор' })
  await admin.locator('.v-expansion-panel-title').click()
  await admin.getByLabel('Назва статусу').fill('Координатор')
  await admin.getByLabel('Публікує нотатки й теми в Telegram-каналі').uncheck()
  await admin.getByLabel('Розклад служінь').check()

  await expect(page.getByText('Є незбережені зміни')).toBeVisible()
  await page.getByRole('button', { name: 'Зберегти статуси' }).click()

  await expect.poll(() => requests.find((request) => request.path === '/admin/roles')).toBeTruthy()
  const saved = requests.find((request) => request.path === '/admin/roles')!.body as {
    roles: { id: string; name: string; publish: boolean; manage: string[] }[]
  }
  expect(saved.roles.map((item) => item.id)).toEqual(['supervisor', 'admin', 'servant', 'reader'])
  expect(saved.roles.find((item) => item.id === 'admin')).toMatchObject({
    name: 'Координатор',
    publish: false,
    manage: ['schedule']
  })
})

test('events of the calendar: the colors of the days, its filters, the types with their roles', async ({
  page
}) => {
  const requests = await fakeWorker(page, ['schedule'])
  await openDashboard(page)
  await expect(page.getByRole('heading', { name: 'Календар', exact: true })).toBeVisible()

  await page.getByLabel('Червоних днів (сьогодні — перший)').fill('1')
  await page.getByLabel('Конкретна подія').uncheck()
  await page.getByRole('button', { name: 'Зберегти налаштування календаря' }).click()
  await expect
    .poll(() => requests.find((request) => request.path === '/admin/calendar')?.body)
    .toEqual({ calendar: { redDays: 1, orangeDays: 5, filters: ['type', 'ministry', 'person', 'mine'] } })

  // a type whose pastor prepares notes
  await page.getByRole('button', { name: 'Додати тип' }).click()
  const panel = page.locator('.type-panel').last()
  await panel.getByLabel('Назва типу').fill('Причастя')
  await panel.getByLabel('Ролі однакові для всіх подій типу').check()
  const save = page.getByRole('button', { name: 'Зберегти типи подій' })
  // a type of fixed roles needs a role
  await expect(save).toBeDisabled()
  await panel.getByRole('button', { name: 'Додати роль' }).click()
  await panel.getByLabel('Роль', { exact: true }).fill('Пастор')
  await panel.getByLabel('Готує матеріали').check()
  await panel.getByLabel('Що підготувати').fill('Нотатки, вірші')
  await save.click()
  await expect
    .poll(() => requests.find((request) => request.path === '/admin/event-types')?.body)
    .toMatchObject({
      eventTypes: [
        { id: 'morning-prayer', roles: 'none' },
        {
          name: 'Причастя',
          ministry: null,
          roles: 'fixed',
          slots: [{ name: 'Пастор', count: 1, materials: true, hint: 'Нотатки, вірші' }]
        }
      ]
    })
})

test('the lists of ministries and locations', async ({ page }) => {
  const requests = await fakeWorker(page, ['directories'])
  await openDashboard(page)

  // only the sections of its functions
  await expect(page.locator('.admin-nav .v-list-item')).toHaveText(['Служіння', 'Локації'])
  // a new one: added by the icon at the end of the field
  const add = page.getByRole('textbox', { name: 'Додати: нова назва' })
  await add.fill('Дитяче служіння')
  await page.locator('.new-item .mdi-plus-thick').click()
  await expect
    .poll(() => requests)
    .toContainEqual({
      method: 'PUT',
      path: '/admin/directories/ministries',
      body: { items: ['Музичне служіння', 'Молитовне служіння', 'Дитяче служіння'] }
    })

  // a ministry opens: its roles, its events and their coming days
  await page.locator('.ministries-table tbody tr', { hasText: 'Молитовне служіння' }).click()
  const details = page.locator('.details-row')
  await expect(details.locator('.event')).toContainText('Ранкова молитва')
  await expect(details.locator('.event')).toContainText('Онлайн')
  await expect(details.locator('.day')).toContainText('1 / 2')
  // a role of the ministry: added by the icon of its field, its rights by the chips, its people chosen
  await details.getByRole('textbox', { name: 'Нова роль' }).fill('Лідер служіння')
  await details.locator('.new-role .mdi-plus-thick').click()
  await expect(details.locator('.role')).toHaveCount(1)
  await details.locator('.role .v-chip', { hasText: 'Лідер служіння' }).click()
  await details.locator('.role .v-autocomplete', { hasText: 'Хто має цю роль' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Лідер' }).click()
  await expect
    .poll(() => requests.filter((request) => request.path === '/admin/ministry-roles').at(-1)?.body)
    .toMatchObject({
      ministryRoles: {
        'Молитовне служіння': [{ name: 'Лідер служіння', lead: true, invite: false, uids: ['leader-uid'] }]
      }
    })
  await page.keyboard.press('Escape')
  // the leaders: the people of the roles that lead
  await expect(
    page.locator('.ministries-table tbody tr', { hasText: 'Молитовне служіння' }).first()
  ).toContainText('Лідер')

  await page.locator('.admin-nav').getByText('Локації').click()
  await add.fill('Філія на Салтівці')
  await page.locator('.new-item .mdi-plus-thick').click()
  await expect
    .poll(() => requests)
    .toContainEqual({
      method: 'PUT',
      path: '/admin/directories/locations',
      body: { items: ['Церква', 'Філія на Салтівці'] }
    })

  // a name changed in place, saved by the icon at its end
  const branch = page.locator('.directory-item').nth(1)
  await branch.getByRole('textbox', { name: 'Назва' }).fill('Філія на Салтівці, вул. Гвардійців')
  await branch.locator('.mdi-content-save-outline').click()
  await expect
    .poll(() => requests)
    .toContainEqual({
      method: 'PUT',
      path: '/admin/directories/locations/rename',
      body: { from: 'Філія на Салтівці', to: 'Філія на Салтівці, вул. Гвардійців' }
    })

  // the address of a location: the map opens it
  const church = page.locator('.directory-item').first()
  const address = church.getByRole('textbox', { name: 'Адреса (для карти; онлайн — порожньо)' })
  await address.fill('Харків, вул. Сумська, 1')
  await church.locator('.mdi-content-save-outline').click()
  await expect
    .poll(() => requests)
    .toContainEqual({
      method: 'PUT',
      path: '/admin/addresses',
      body: { addresses: { Церква: { address: 'Харків, вул. Сумська, 1' } } }
    })

  // or found on the map (the search of OpenStreetMap, here without the internet)
  await page.route('https://nominatim.openstreetmap.org/search**', (route) =>
    route.fulfill({
      json: [
        {
          place_id: 1,
          display_name: 'Сумська вулиця, 1, Харків, Україна',
          lat: '49.9935',
          lon: '36.2304',
          address: { road: 'Сумська вулиця', house_number: '1', city: 'Харків' }
        }
      ]
    })
  )
  await church.locator('[aria-label="Знайти на карті"]').click()
  const picker = dialog(page)
  await picker.getByRole('textbox', { name: 'Пошук адреси (вулиця, будинок, місто)' }).fill('Сумська 1')
  await picker.locator('.found .v-list-item', { hasText: 'Сумська вулиця, 1, Харків' }).click()
  await picker.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => requests.at(-1))
    .toEqual({
      method: 'PUT',
      path: '/admin/addresses',
      body: { addresses: { Церква: { address: 'Сумська вулиця, 1, Харків', lat: 49.9935, lng: 36.2304 } } }
    })
})

test('a leader of a ministry gives its roles; the leaders are given by the administrators', async ({
  page
}) => {
  const requests = await fakeWorker(page, [], ['Музичне служіння'])
  await openDashboard(page)

  await expect(page.locator('.admin-nav .v-list-item')).toHaveText(['Мої служіння'])
  const ministry = page.locator('.ministry', { hasText: 'Музичне служіння' })
  // the role that leads: as the administrators gave it
  const lead = ministry.locator('.role', { hasText: 'Хто має цю роль' }).first()
  await expect(lead.getByRole('textbox', { name: 'Назва ролі' })).toBeDisabled()
  await expect(lead.locator('.mdi-minus-circle-outline')).toHaveCount(0)

  await ministry.getByRole('textbox', { name: 'Нова роль' }).fill('Музикант')
  await ministry.locator('.new-role .mdi-plus-thick').click()
  const musician = ministry.locator('.role').nth(1)
  // no other role leads
  await expect(musician.locator('.v-chip', { hasText: 'Лідер служіння' })).toHaveCount(0)
  await musician.locator('.v-chip', { hasText: 'Запрошує' }).click()
  await expect
    .poll(() => requests.filter((request) => request.path.startsWith('/ministry-roles/')).at(-1))
    .toMatchObject({
      method: 'PUT',
      path: '/ministry-roles/Музичне служіння',
      body: { roles: [{ id: 'r-lead' }, { name: 'Музикант', invite: true, lead: false }] }
    })
})

test('a role without functions of an administrator has no dashboard', async ({ page }) => {
  await fakeWorker(page, [])
  await signIn(page)
  await expect(page.getByRole('button', { name: 'E2E' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Адміністрування' })).toHaveCount(0)

  await withStores(page, (stores) => stores.app.setPage('admin'))
  await expect(page.getByText('Ця сторінка лише для адміністраторів')).toBeVisible()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } })

  test('the menu of the avatar has it all; the header keeps the language and the translation', async ({
    page
  }) => {
    await fakeWorker(page, ['users'])
    await signIn(page)

    // no row of buttons, no menu of its own: the avatar, the dashboard, the language, the translation
    await expect(page.getByRole('button', { name: 'Вихід' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Меню' })).toHaveCount(0)
    await expect(page.locator('.v-app-bar .mdi-book-cross')).toBeVisible()

    await page.getByRole('button', { name: 'E2E' }).click()
    const menu = page.locator('.v-overlay--active .v-list')
    for (const item of ['Календар служінь', 'Повідомлення', 'Змінити фото', 'Вихід'])
      await expect(menu.locator('.v-list-item', { hasText: item })).toBeVisible()
    await menu.locator('.v-list-item', { hasText: 'Календар служінь' }).click()
    await expect(page.locator('.view-title', { hasText: 'Календар служінь' })).toBeVisible()

    // the page the user is on is marked in the menu and not opened again
    await page.getByRole('button', { name: 'E2E' }).click()
    await expect(menu.locator('.v-list-item', { hasText: 'Календар служінь' })).toHaveClass(
      /v-list-item--active/
    )
    await expect(menu.locator('.v-list-item', { hasText: 'Повідомлення' })).not.toHaveClass(
      /v-list-item--active/
    )
    await page.keyboard.press('Escape')

    // the dashboard is on the panel
    await page.getByRole('button', { name: 'Адміністрування' }).click()
    await expect(page.locator('.section-pill', { hasText: 'Служителі' })).toBeVisible()

    // the ministers: the name only, a row opens by a click, no scrolling to the side
    const table = page.locator('.users-table')
    await expect(table.locator('thead th')).toHaveCount(1)
    const wrapper = table.locator('.v-table__wrapper')
    expect(
      await wrapper.evaluate((element) => element.scrollWidth - element.clientWidth)
    ).toBeLessThanOrEqual(0)
    await table.locator('tbody tr', { hasText: 'Лідер' }).click()
    await expect(table.locator('.details-row')).toBeVisible()
  })
})
