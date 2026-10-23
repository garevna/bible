import type { Page, Route } from '@playwright/test'

import { dialog, expect, openBible, signInLocally, test, withStores } from './fixtures'

/** today of the browser: the calendar shows its month */
const local = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const TODAY = local(new Date())

const event = (id: string, fields: Record<string, unknown>) => ({
  id,
  typeId: null,
  ministry: 'Молитовне',
  title: '',
  description: '',
  location: 'Онлайн',
  day: null,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  // late: the events of today are gone once they begin, and the tests run at (nearly) any time
  time: '23:57',
  until: null,
  needed: 2,
  slots: [],
  mode: 'invite',
  responsibleUid: 'leader-uid',
  responsibleName: 'Лідер',
  deputyUid: null,
  deputyName: null,
  ...fields
})

const participant = (eventId: string, fields: Record<string, unknown>) => ({
  eventId,
  day: TODAY,
  uid: 'e2e-uid',
  name: 'E2E',
  status: 'invited',
  backupUid: null,
  backupName: null,
  backupStatus: null,
  reason: null,
  role: null,
  ...fields
})

const communion = {
  id: 'communion',
  name: 'Причастя',
  ministry: 'Пасторське',
  roles: 'fixed',
  slots: [
    { name: 'Пастор', count: 1, materials: true, kinds: ['k-sermon', 'k-plan'], hint: 'Нотатки, вірші' },
    { name: 'Учасник', count: 2, materials: false, hint: '' }
  ]
}

/** The worker (see playwright.config.ts): a minister of the prayer ministry, or a planner of the schedule */
async function fakeWorker(page: Page, planner = false) {
  const posted: { path: string; body: unknown }[] = []
  // the materials sent: the calendar has them (without their posts), the window of a kind with them
  const materials: Record<string, unknown>[] = []
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
            approve: planner,
            invite: planner ? ['*'] : [],
            manage: planner ? ['schedule'] : []
          },
          ministries: ['Молитовне'],
          canSend: false,
          canReceive: true,
          phone: '+380501234567',
          needsPhone: false,
          serviceBot: planner
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
        json: {
          people: [
            { uid: 'e2e-uid', name: 'E2E', ministries: ['Молитовне'], phone: null },
            { uid: 'pastor-uid', name: 'Пастор Іван', ministries: ['Пасторське'], phone: null },
            { uid: 'singer-uid', name: 'Співачка', ministries: ['Пасторське'], phone: null }
          ]
        }
      })
    }
    if (path === '/youtube') return route.fulfill({ json: { title: 'Слово на неділю', author: 'ХХЦ' } })
    if (path === '/schedule/materials' && request.method() === 'GET') {
      return route.fulfill({ json: { materials } })
    }
    if (path === '/schedule') {
      return route.fulfill({
        json: {
          events: [
            event('morning', { title: 'Ранкова молитва' }),
            event('evening', { title: 'Вечірня молитва', time: '23:59', mode: 'open' }),
            event('communion', {
              typeId: 'communion',
              ministry: 'Пасторське',
              location: 'Церква',
              time: '23:58',
              needed: 3,
              slots: communion.slots,
              responsibleUid: 'pastor-uid',
              responsibleName: 'Пастор Іван'
            })
          ],
          days: [
            { eventId: 'morning', day: TODAY },
            { eventId: 'communion', day: TODAY },
            { eventId: 'evening', day: TODAY }
          ],
          participants: [
            participant('morning', {}),
            participant('morning', {
              uid: 'other-uid',
              name: 'Інший',
              status: 'confirmed',
              backupUid: 'e2e-uid',
              backupName: 'E2E',
              backupStatus: 'invited'
            }),
            participant('communion', { uid: 'pastor-uid', name: 'Пастор Іван', status: 'confirmed' }),
            participant('communion', { uid: 'singer-uid', name: 'Співачка', status: 'applied' })
          ],
          materials: materials.map(({ post: _post, ...item }) => item),
          addresses: { Церква: { address: 'Харків, вул. Сумська, 1', lat: 49.99, lng: 36.23 } },
          types: [communion],
          materialKinds: [
            { id: 'k-plan', name: 'План служіння', group: 'team' },
            { id: 'k-sermon', name: 'Конспект проповіді', group: 'team' }
          ],
          calendar: { redDays: 2, orangeDays: 5, filters: ['type', 'ministry', 'event', 'person', 'mine'] },
          today: TODAY
        }
      })
    }
    posted.push({ path, body: request.postDataJSON() })
    if (path === '/schedule/materials' && request.method() === 'POST') {
      const body = request.postDataJSON()
      const title = body.post?.title || body.post?.items?.[0]?.text?.slice(0, 80) || body.title || ''
      materials.push({
        id: `m${materials.length + 1}`,
        uid: 'e2e-uid',
        name: 'E2E',
        url: null,
        ...body,
        title
      })
    }
    if (path.startsWith('/schedule/materials/') && request.method() === 'PUT') {
      const material = materials.find((item) => path.endsWith(`/${item.id}`))!
      const body = request.postDataJSON()
      Object.assign(material, { post: body.post, title: body.post.title || body.post.items[0]?.text || '' })
    }
    if (path === '/schedule/events') {
      return route.fulfill({
        json: { event: event('new', { day: TODAY, ministry: 'Пасторське', typeId: 'communion' }) }
      })
    }
    if (path === '/schedule/invitations') return route.fulfill({ json: { invited: 1 } })
    if (path === '/schedule/announce') return route.fulfill({ json: { announced: 1 } })
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

const card = (page: Page, name: string) => page.locator('.occurrence', { hasText: name })

test('a minister lands on the calendar: the day is red until settled; answers and applications', async ({
  page
}) => {
  // after the init script of the fixtures
  await page.addInitScript(() => sessionStorage.removeItem('bible:calendar-landed'))
  const posted = await fakeWorker(page)
  await signIn(page)

  await expect(page.locator('.view-title', { hasText: 'Календар служінь' })).toBeVisible()
  // nothing is settled today: red; today is chosen and its events are below
  const today = page.locator(`.cell[data-day="${TODAY}"]`)
  await expect(today).toHaveClass(/cell--red/)
  await expect(today).toHaveClass(/cell--selected/)
  await expect(page.locator('.day-title')).toContainText('Сьогодні')

  const morning = card(page, 'Ранкова молитва')
  await expect(morning).toHaveClass(/occurrence--mine/)
  await expect(morning).toContainText('Не вистачає людей')
  await morning.getByRole('button', { name: 'Підтвердити', exact: true }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/answer',
      body: { eventId: 'morning', day: TODAY, uid: 'e2e-uid', as: 'main', answer: 'confirm' }
    })

  // the backup: "I can't", with the usual words
  await morning.locator('button', { hasText: 'Не можу' }).last().click()
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
        day: TODAY,
        uid: 'other-uid',
        as: 'backup',
        answer: 'decline',
        reason: 'Хворію'
      }
    })

  // the evening prayer is open to the prayer ministry
  await card(page, 'Вечірня молитва').getByRole('button', { name: 'Подати заявку' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/apply',
      body: { eventId: 'evening', day: TODAY }
    })

  // a place with an address: the map opens in a tab of its own
  const map = card(page, 'Причастя').getByLabel('Відкрити на карті: Харків, вул. Сумська, 1')
  await expect(map).toHaveAttribute('target', '_blank')
  await expect(map).toHaveAttribute(
    'href',
    // at the point chosen on the map
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('49.99,36.23')
  )
  await expect(card(page, 'Ранкова молитва').locator('.map-link')).toHaveCount(0)

  // the communion is not the user's: nothing to approve; the filters narrow the day
  await card(page, 'Причастя').getByRole('button', { name: 'Учасники' }).click()
  await expect(card(page, 'Причастя').getByRole('button', { name: 'Затвердити обраного' })).toBeDisabled()
  await page.getByLabel('Лише мої').check()
  await expect(card(page, 'Причастя')).toHaveCount(0)
  await expect(page.locator(`.cell[data-day="${TODAY}"] .count`)).toHaveText('1')
})

test('a planner approves, gives roles, adds materials, and invites after creating an event', async ({
  page
}) => {
  const posted = await fakeWorker(page, true)
  await signIn(page)
  await withStores(page, async (stores) => {
    await stores.notes.startNewNote({ lineRef: '1.000.000.000' })
    stores.notes.updateCurrentNoteText('Хліб і вино')
    await stores.notes.saveCurrentNote()
  })
  await page.getByRole('button', { name: 'Календар служінь' }).click()

  // the applications on the left: the chosen one goes right by the arrow
  const communionCard = card(page, 'Причастя')
  await communionCard.getByRole('button', { name: 'Учасники' }).click()
  const arrow = communionCard.getByRole('button', { name: 'Затвердити обраного' })
  await expect(arrow).toBeDisabled()
  await communionCard.locator('.v-list-item', { hasText: 'Співачка' }).click()
  await arrow.click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/approve',
      body: { eventId: 'communion', day: TODAY, uid: 'singer-uid' }
    })

  // the roles: the pastor has none yet
  await communionCard.getByRole('button', { name: 'Ролі учасників' }).click()
  await communionCard.locator('[data-role-of="pastor-uid"]').click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Пастор' }).first().click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/role',
      body: { eventId: 'communion', day: TODAY, uid: 'pastor-uid', role: 'Пастор' }
    })

  // the materials of the pastor: the role and its person, then its kinds, each ready or not
  await communionCard.getByRole('button', { name: 'Методичні матеріали' }).click()
  const materials = communionCard.locator('.materials-panel')
  await expect(materials.locator('.role-head')).toContainText('Пастор:')
  // no list of the kinds in a line, no buttons and no field of kinds
  await expect(materials).not.toContainText('Нотатки, вірші')
  await expect(materials.getByRole('button', { name: 'Додати нотатку' })).toHaveCount(0)
  await expect(materials.locator('.v-select')).toHaveCount(0)
  const sermon = materials.locator('.v-list-item', { hasText: 'Конспект проповіді' })
  const plan = materials.locator('.v-list-item', { hasText: 'План служіння' })
  await expect(sermon).toContainText('Матеріалів ще немає')
  await expect(sermon.getByRole('checkbox')).not.toBeChecked()

  // a kind opens its window: a new note written right there
  await sermon.click()
  const window = dialog(page)
  await expect(window).toContainText('Конспект проповіді · Пастор')
  await window.getByLabel('Нова нотатка').fill('Хліб і вино — тіло і кров')
  await window.getByRole('button', { name: 'Зберегти нотатку' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toMatchObject({
      path: '/schedule/materials',
      body: {
        eventId: 'communion',
        day: TODAY,
        role: 'Пастор',
        kind: 'note',
        resource: 'k-sermon',
        post: { title: '', items: [{ kind: 'note', text: 'Хліб і вино — тіло і кров' }] }
      }
    })
  // there now, and changed in place
  await expect(window.locator('.material')).toContainText('Хліб і вино — тіло і кров')
  await window.getByRole('button', { name: 'Редагувати' }).click()
  await window.locator('.material textarea').first().fill('Хліб і вино: Лука 22')
  await window.getByRole('button', { name: 'Зберегти зміни' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toMatchObject({
      path: '/schedule/materials/m1',
      body: { post: { title: '', items: [{ kind: 'note', text: 'Хліб і вино: Лука 22' }] } }
    })
  // one of my notes: chosen in its own window
  await window.getByRole('button', { name: 'Вибрати з моїх нотаток' }).click()
  await dialog(page).locator('.v-list-item', { hasText: 'Хліб і вино' }).click()
  await expect.poll(() => posted.length).toBeGreaterThan(0)
  await expect
    .poll(() => posted.at(-1)?.body)
    .toMatchObject({ kind: 'note', resource: 'k-sermon', post: { items: [{ text: 'Хліб і вино' }] } })

  // a video of YouTube: its title comes by itself
  await window.getByRole('tab', { name: 'Відео YouTube' }).click()
  await window.getByRole('button', { name: 'Вставити посилання' }).click()
  const video = dialog(page)
  await video.getByRole('textbox', { name: 'Посилання на відео YouTube' }).fill('https://vimeo.com/1234567')
  await expect(video).toContainText('Це не посилання на відео YouTube')
  await video
    .getByRole('textbox', { name: 'Посилання на відео YouTube' })
    .fill('https://www.youtube.com/watch?v=SBwe2oTBqB4')
  await expect(video.getByRole('textbox', { name: 'Назва' })).toHaveValue('Слово на неділю')
  await video.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => posted.at(-1)?.body)
    .toMatchObject({
      role: 'Пастор',
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=SBwe2oTBqB4',
      title: 'Слово на неділю',
      resource: 'k-sermon'
    })
  await window.getByRole('button', { name: 'Готово' }).click()

  // the kind with materials is ready by itself; another one is ticked by hand
  await expect(sermon.getByRole('checkbox')).toBeChecked()
  await expect(sermon).toContainText('і ще 2')
  await plan.getByRole('checkbox').click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/marks',
      body: { eventId: 'communion', day: TODAY, role: 'Пастор', resource: 'k-plan', done: true }
    })

  // the evening prayer is open: a call for applications in the service channel
  const evening = card(page, 'Вечірня молитва')
  await evening.locator('[aria-label="Оголосити набір у службовому каналі"]').click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/announce',
      body: { eventId: 'evening', days: [TODAY] }
    })
  await expect(evening).toContainText('Набір оголошено в службовому каналі')

  // a guest pastor, written by name
  await communionCard.getByRole('button', { name: 'Учасники' }).click()
  await communionCard
    .getByRole('textbox', { name: 'Гість (без застосунку): ім’я, звідки' })
    .fill('Пастор Іван, Київ')
  await communionCard.locator('.mdi-plus-thick').click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/guest',
      body: { eventId: 'communion', day: TODAY, name: 'Пастор Іван, Київ' }
    })

  // this day only: another place and a word for the people
  await evening.locator('[aria-label="Змінити цей день"]').click()
  const day = dialog(page)
  await day.locator('.v-combobox input').fill('Церква')
  await day.getByLabel('Слово для учасників (необов’язково)').fill('Цього разу офлайн')
  await day.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/days',
      body: {
        eventId: 'evening',
        day: TODAY,
        time: null,
        location: 'Церква',
        needed: null,
        cancelled: false,
        note: 'Цього разу офлайн',
        slots: null
      }
    })

  // a feast: the roles of this day only, the ones of the event to begin with
  await communionCard.locator('[aria-label="Змінити цей день"]').click()
  const feast = dialog(page)
  await expect(feast.getByRole('spinbutton', { name: 'Скільки людей потрібно' })).toBeVisible()
  await feast.getByLabel('Інші ролі цього дня').check()
  // the people of the day are the places of the roles
  await expect(feast.getByRole('spinbutton', { name: 'Скільки людей потрібно' })).toHaveCount(0)
  await expect(feast.getByLabel('Роль', { exact: true }).first()).toHaveValue('Пастор')
  await feast.getByRole('button', { name: 'Додати роль' }).click()
  await feast.getByLabel('Роль', { exact: true }).last().fill('Гість')
  await feast.getByLabel('Людей').last().fill('3')
  await feast.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toMatchObject({
      path: '/schedule/days',
      body: {
        eventId: 'communion',
        day: TODAY,
        needed: null,
        slots: [
          { name: 'Пастор', count: 1, materials: true },
          { name: 'Учасник', count: 2, materials: false },
          { name: 'Гість', count: 3, materials: false, kinds: [], hint: '' }
        ]
      }
    })

  // a new event of a type: then its invitations
  await page.getByRole('button', { name: 'Додати подію' }).click()
  const form = dialog(page)
  await form.locator('.v-select', { hasText: 'Тип події' }).click()
  await page.locator('.v-overlay--active .v-list-item', { hasText: 'Причастя' }).click()
  await form.getByLabel('Час', { exact: true }).fill('11:00')
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => posted.find((item) => item.path === '/schedule/events')?.body)
    .toMatchObject({ typeId: 'communion', ministry: 'Пасторське', day: TODAY, time: '11:00' })

  const invitations = dialog(page)
  await expect(invitations).toContainText('Розсилка запрошень')
  await invitations.getByRole('button', { name: 'Усі учасники служіння' }).click()
  await invitations.getByRole('button', { name: 'Надіслати запрошення' }).click()
  await expect
    .poll(() => posted.at(-1))
    .toEqual({
      path: '/schedule/invitations',
      body: { eventId: 'new', days: [TODAY], uids: ['pastor-uid', 'singer-uid'] }
    })
  await expect(page.getByText('Запрошень надіслано: 1')).toBeVisible()
})

test('a marathon of prayer: every hour a role of its own, with its people', async ({ page }) => {
  const posted = await fakeWorker(page, true)
  await signIn(page)
  await page.getByRole('button', { name: 'Календар служінь' }).click()
  await page.getByRole('button', { name: 'Додати подію' }).click()
  const form = dialog(page)
  await form.locator('.v-select', { hasText: 'Служіння' }).first().click()
  await page.locator('.v-overlay--active .v-list-item').first().click()
  await form.getByLabel('Час', { exact: true }).fill('20:00')
  await form.getByLabel('Щогодини (марафон)').check()
  await form.getByLabel('До', { exact: true }).fill('23:00')
  await form.getByLabel('Людей щогодини').fill('2')
  // the hours, made of the times
  await expect(form.locator('.v-chip', { hasText: '–' })).toHaveText([
    '20:00–21:00 ×2',
    '21:00–22:00 ×2',
    '22:00–23:00 ×2'
  ])
  await form.getByRole('button', { name: 'Зберегти' }).click()
  await expect
    .poll(() => posted.find((item) => item.path === '/schedule/events')?.body)
    .toMatchObject({
      time: '20:00',
      times: null,
      slots: [
        { name: '20:00–21:00', count: 2, materials: false },
        { name: '21:00–22:00', count: 2, materials: false },
        { name: '22:00–23:00', count: 2, materials: false }
      ]
    })
})
