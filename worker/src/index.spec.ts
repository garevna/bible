import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { isOwner, verifyIdToken, type AuthUser } from './auth'
import { handle, type Env } from './index'
import { memoryStore as memoryMessages } from './messages'
import { memorySchedule } from './schedule'
import { webhookSecret } from './serviceBot'
import type { UserView, UsersStore } from './users'

/** the answers of the worker in these tests */
interface Answer {
  users: UserView[]
  user: UserView
  [name: string]: unknown
}

/** KV in memory: values with their metadata */
function memoryStore(): UsersStore {
  const data = new Map<string, { value: string; metadata: unknown }>()
  return {
    // as KV: the text, or with 'json' the parsed value
    get: (async (name: string, type?: unknown) => {
      const item = data.get(name)
      if (!item) return null
      return type === 'json' || (type as { type?: string })?.type === 'json'
        ? JSON.parse(item.value)
        : item.value
    }) as UsersStore['get'],
    put: (async (name: string, value: string, options?: { metadata?: unknown }) => {
      data.set(name, { value, metadata: options?.metadata })
    }) as UsersStore['put'],
    delete: (async (name: string) => {
      data.delete(name)
    }) as UsersStore['delete'],
    list: (async ({ prefix = '' } = {}) => ({
      keys: [...data]
        .filter(([name]) => name.startsWith(prefix))
        .map(([name, item]) => ({ name, metadata: item.metadata })),
      list_complete: true,
      cacheStatus: null
    })) as unknown as UsersStore['list']
  }
}

const users: Record<string, AuthUser> = {
  owner: { uid: 'owner-uid', email: 'owner@example.com', emailVerified: true, name: 'Ірина' },
  pastor: { uid: 'pastor-uid', email: 'pastor@example.com', emailVerified: false, name: null },
  reader: { uid: 'reader-uid', email: 'reader@example.com', emailVerified: true, name: 'Читач' },
  musician: { uid: 'musician-uid', email: 'music@example.com', emailVerified: true, name: 'Музикант' },
  leader: { uid: 'leader-uid', email: 'leader@example.com', emailVerified: true, name: 'Лідер' },
  // claims the email of the owner, but it is not verified
  impostor: { uid: 'impostor-uid', email: 'owner@example.com', emailVerified: false, name: null }
}

function setup() {
  const messages = memoryMessages()
  const schedule = memorySchedule()
  const clock = { now: Date.now() }
  const env: Env = {
    TELEGRAM_BOT_TOKEN: 'TOKEN',
    TELEGRAM_CHAT_ID: '@test_channel',
    FIREBASE_PROJECT_ID: 'bible-test',
    OWNERS: 'Owner@Example.com',
    ALLOWED_ORIGINS: 'https://garevna.github.io',
    USERS: memoryStore(),
    // the messages are kept in memory (Deps.messages)
    DB: undefined as unknown as D1Database
  }
  const fetcher = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response('{"ok":true}'))
  const verify = async (token: string) => {
    if (!users[token]) throw new Error('bad token')
    return users[token]
  }
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const response = await handle(
      new Request(`https://worker.test${path}`, {
        method,
        headers: {
          origin: 'https://garevna.github.io',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'content-type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      }),
      env,
      { verify, fetcher: fetcher as unknown as typeof fetch, messages, schedule, now: () => clock.now }
    )
    const answer = (await response.json().catch(() => null)) as Answer
    return { status: response.status, body: answer, headers: response.headers }
  }
  return { call, fetcher, env, clock, messages, schedule }
}

const topic = { title: 'Тема', items: [{ kind: 'verse', text: 'Вірш', ref: 'Від Матвія 1:1' }] }

describe('worker', () => {
  it('answers the preflight request of the app only', async () => {
    const { call, env } = setup()
    const response = await call('OPTIONS', '/admin/users/x')
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://garevna.github.io')
    expect(response.headers.get('access-control-allow-methods')).toContain('PUT')

    const other = await handle(
      new Request('https://worker.test/me', { method: 'OPTIONS', headers: { origin: 'https://evil.test' } }),
      env
    )
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('needs a valid token', async () => {
    const { call } = setup()
    expect((await call('GET', '/me')).status).toBe(401)
    expect((await call('GET', '/me', 'forged')).status).toBe(401)
  })

  it('the owner is an admin; a new user is a reader; an unverified email is not the owner', async () => {
    const { call } = setup()
    expect((await call('GET', '/me', 'owner')).body).toMatchObject({
      role: 'owner',
      telegram: true,
      canSend: true
    })
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ role: 'reader' })
    expect((await call('GET', '/me', 'impostor')).body).toMatchObject({ role: 'reader' })
  })

  it('an administrator names a user; signing in keeps that name; empty gives the account name back', async () => {
    const { call } = setup()
    await call('GET', '/me', 'owner')
    await call('GET', '/me', 'pastor')
    const named = await call('PUT', '/admin/users/pastor-uid', 'owner', { name: 'Пастор Петро' })
    expect(named.body.user).toMatchObject({ name: 'Пастор Петро', nameSet: true })
    // the next request of the pastor does not take it back
    await call('GET', '/me', 'pastor')
    const users = (await call('GET', '/admin/users', 'owner')).body.users
    expect(users.find((item) => item.uid === 'pastor-uid')).toMatchObject({ name: 'Пастор Петро' })
    expect((await call('PUT', '/admin/users/pastor-uid', 'owner', { name: 'x'.repeat(81) })).status).toBe(400)

    await call('PUT', '/admin/users/pastor-uid', 'owner', { name: '' })
    await call('GET', '/me', 'pastor')
    const again = (await call('GET', '/admin/users', 'owner')).body.users
    // the account of the pastor has no name: the email is shown
    expect(again.find((item) => item.uid === 'pastor-uid')).toMatchObject({ name: null, nameSet: false })
  })

  it('an admin gives roles to the users who signed in; the new admin can give roles too', async () => {
    const { call } = setup()
    await call('GET', '/me', 'owner')
    await call('GET', '/me', 'pastor')
    await call('GET', '/me', 'reader')

    expect((await call('GET', '/admin/users', 'pastor')).status).toBe(403)

    const list = await call('GET', '/admin/users', 'owner')
    // the owners are not listed
    expect(list.body.users.map((user) => [user.uid, user.role]).sort()).toEqual([
      ['pastor-uid', 'reader'],
      ['reader-uid', 'reader']
    ])

    const given = await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'admin' })
    expect(given.body.user).toMatchObject({ uid: 'pastor-uid', role: 'admin', updatedBy: 'Ірина' })
    expect((await call('GET', '/me', 'pastor')).body).toMatchObject({ role: 'admin' })

    expect((await call('PUT', '/admin/users/reader-uid', 'pastor', { role: 'publisher' })).status).toBe(200)
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ role: 'publisher' })
  })

  it('nobody changes the owner or their own role; unknown users and roles are rejected', async () => {
    const { call } = setup()
    await call('GET', '/me', 'owner')
    await call('GET', '/me', 'pastor')
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'admin' })

    expect(await call('PUT', '/admin/users/owner-uid', 'pastor', { role: 'reader' })).toMatchObject({
      status: 409,
      body: { error: 'owner' }
    })
    expect(await call('DELETE', '/admin/users/owner-uid', 'pastor')).toMatchObject({ status: 409 })
    expect(await call('PUT', '/admin/users/pastor-uid', 'pastor', { role: 'reader' })).toMatchObject({
      status: 409,
      body: { error: 'self' }
    })
    expect((await call('PUT', '/admin/users/nobody', 'owner', { role: 'admin' })).status).toBe(404)
    expect((await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'god' })).status).toBe(400)
  })

  it('a temporary admin is taken off the list and comes back as a reader', async () => {
    const { call } = setup()
    await call('GET', '/me', 'owner')
    await call('GET', '/me', 'pastor')
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'admin' })

    expect(await call('DELETE', '/admin/users/pastor-uid', 'owner')).toMatchObject({ status: 200 })
    const list = await call('GET', '/admin/users', 'owner')
    expect(list.body.users).toEqual([])
    expect((await call('GET', '/me', 'pastor')).body).toMatchObject({ role: 'reader' })
  })

  it('lets publishers and admins preview and publish, not readers', async () => {
    const { call, fetcher } = setup()
    await call('GET', '/me', 'owner')
    await call('GET', '/me', 'reader')
    expect((await call('POST', '/telegram/publish', 'reader', topic)).status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()

    await call('PUT', '/admin/users/reader-uid', 'owner', { role: 'publisher' })
    expect((await call('POST', '/telegram/preview', 'reader', topic)).body).toEqual({
      messages: ['<b>Тема</b>\n\n<blockquote>Вірш\n<i>Від Матвія 1:1</i></blockquote>'],
      caption: null
    })
    expect(fetcher).not.toHaveBeenCalled()
    expect((await call('POST', '/telegram/publish', 'reader', topic)).body).toEqual({ sent: 1 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('a topic with a picture goes as a photo with the title, then the texts without it', async () => {
    const { call, fetcher } = setup()
    // a JPEG header is enough: Telegram is faked
    const withImage = { ...topic, image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }

    expect((await call('POST', '/telegram/preview', 'owner', withImage)).body).toEqual({
      messages: ['<blockquote>Вірш\n<i>Від Матвія 1:1</i></blockquote>'],
      caption: '<b>Тема</b>'
    })
    expect((await call('POST', '/telegram/publish', 'owner', withImage)).body).toEqual({ sent: 2 })

    const [photo, message] = fetcher.mock.calls as unknown as [string, RequestInit][]
    expect(photo![0]).toMatch(/\/sendPhoto$/)
    const form = photo![1].body as FormData
    expect(form.get('caption')).toBe('<b>Тема</b>')
    expect(form.get('photo')).toBeInstanceOf(Blob)
    expect(message![0]).toMatch(/\/sendMessage$/)

    const notImage = { ...topic, image: 'data:text/html;base64,PHNjcmlwdD4=' }
    expect((await call('POST', '/telegram/publish', 'owner', notImage)).status).toBe(400)
  })

  it('rejects a body that is not a topic and unknown routes', async () => {
    const { call } = setup()
    expect((await call('POST', '/telegram/publish', 'owner', { title: '' })).status).toBe(400)
    expect((await call('GET', '/telegram/publish', 'owner')).status).toBe(404)
  })

  it('passes the error of Telegram to the app', async () => {
    const { call, fetcher } = setup()
    fetcher.mockResolvedValueOnce(
      new Response('{"description":"Forbidden: bot is not a member"}', { status: 403 })
    )
    expect(await call('POST', '/telegram/publish', 'owner', topic)).toMatchObject({
      status: 502,
      body: { error: 'telegram', message: 'Forbidden: bot is not a member' }
    })
  })
})

describe('roles kept by the administrators', () => {
  const role = (id: string, change: Record<string, unknown> = {}) => ({
    id,
    name: id,
    publish: false,
    send: false,
    sendToRoles: [],
    sendToPeople: false,
    messageDays: 1,
    manage: [],
    ...change
  })

  it('a role has the functions of an administrator it is given, no more', async () => {
    const { call } = setup()
    for (const user of ['owner', 'pastor', 'musician']) await call('GET', '/me', user)
    const defaults = (await call('GET', '/admin/settings', 'owner')).body.roles as { id: string }[]
    expect(defaults.map((item) => item.id)).toEqual(['reader', 'servant', 'publisher', 'admin'])

    // a coordinator of people: gives roles, does not change the roles themselves
    const roles = [role('reader'), role('servant'), role('coordinator', { manage: ['users'] })]
    expect((await call('PUT', '/admin/roles', 'owner', { roles })).status).toBe(200)
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'coordinator' })

    expect((await call('GET', '/me', 'pastor')).body).toMatchObject({
      role: 'coordinator',
      rights: { manage: ['users'] }
    })
    expect((await call('GET', '/admin/users', 'pastor')).status).toBe(200)
    expect((await call('PUT', '/admin/users/musician-uid', 'pastor', { role: 'servant' })).status).toBe(200)
    expect((await call('PUT', '/admin/roles', 'pastor', { roles })).status).toBe(403)
    expect((await call('PUT', '/admin/directories/locations', 'pastor', { items: ['Церква'] })).status).toBe(
      403
    )
    // no role that is not on the list
    expect((await call('PUT', '/admin/users/musician-uid', 'pastor', { role: 'bishop' })).status).toBe(400)
  })

  it('whom a role writes to, and how long its messages are kept', async () => {
    const { call, clock } = setup()
    for (const user of ['owner', 'pastor', 'musician', 'leader']) await call('GET', '/me', user)
    const roles = [
      role('reader'),
      role('servant'),
      role('leader'),
      role('pastor', { send: true, sendToRoles: ['leader'], messageDays: 3 })
    ]
    await call('PUT', '/admin/roles', 'owner', { roles })
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'pastor' })
    await call('PUT', '/admin/users/musician-uid', 'owner', { role: 'servant' })
    await call('PUT', '/admin/users/leader-uid', 'owner', { role: 'leader' })

    const answer = (await call('GET', '/messages/recipients', 'pastor')).body
    expect((answer.people as { uid: string }[]).map((person) => person.uid)).toEqual(['leader-uid'])
    expect(answer.roles).toEqual([{ id: 'leader', name: 'leader' }])
    expect((await call('POST', '/messages', 'pastor', { to: ['musician-uid'], text: 'Ні' })).status).toBe(400)

    expect((await call('POST', '/messages', 'pastor', { roles: ['leader'], text: 'Лідерам' })).body).toEqual({
      sent: 1
    })
    clock.now += 2 * 24 * 60 * 60 * 1000
    expect((await call('GET', '/messages', 'leader')).body.messages).toHaveLength(1)
    clock.now += 2 * 24 * 60 * 60 * 1000
    expect((await call('GET', '/messages', 'leader')).body.messages).toHaveLength(0)

    // a role without sending writes to nobody
    expect((await call('POST', '/messages', 'musician', { to: ['leader-uid'], text: 'Привіт' })).status).toBe(
      403
    )
  })

  it('the reader has no rights; a removed role is a reader', async () => {
    const { call } = setup()
    for (const user of ['owner', 'pastor']) await call('GET', '/me', user)
    const saved = await call('PUT', '/admin/roles', 'owner', {
      roles: [role('reader', { publish: true, manage: ['roles'] }), role('helper', { publish: true })]
    })
    expect((saved.body.roles as { id: string; publish: boolean }[])[0]).toMatchObject({
      id: 'reader',
      publish: false
    })
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'helper' })
    expect((await call('GET', '/me', 'pastor')).body).toMatchObject({ rights: { publish: true } })

    await call('PUT', '/admin/roles', 'owner', { roles: [role('reader')] })
    expect((await call('GET', '/me', 'pastor')).body).toMatchObject({
      role: 'helper',
      rights: { publish: false },
      canReceive: false
    })
    expect((await call('POST', '/telegram/preview', 'pastor', topic)).status).toBe(403)
  })
})

describe('the schedule of ministries', () => {
  // Monday, 2026-10-12, 09:00 in Kyiv
  const MONDAY = Date.parse('2026-10-12T06:00:00Z')

  async function church() {
    const context = setup()
    const { call, clock } = context
    clock.now = MONDAY
    for (const user of ['owner', 'pastor', 'musician', 'leader', 'reader']) await call('GET', '/me', user)
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'publisher' })
    await call('PUT', '/admin/users/musician-uid', 'owner', { ministries: ['Музичне служіння'] })
    await call('PUT', '/admin/users/leader-uid', 'owner', { ministries: ['Молитовне служіння'] })
    return context
  }

  const prayer = {
    ministry: 'Молитовне служіння',
    title: 'Ранкова молитва',
    location: 'Онлайн',
    weekdays: [1, 2, 3, 4, 5, 6],
    time: '06:45',
    responsibleUid: 'pastor-uid'
  }

  it('the morning prayer: planned by the schedule role, every day but Sunday', async () => {
    const { call } = await church()
    expect((await call('POST', '/schedule/events', 'pastor', prayer)).status).toBe(403)
    const created = await call('POST', '/schedule/events', 'owner', prayer)
    expect(created.body.event).toMatchObject({ responsibleName: 'pastor@example.com', mode: 'invite' })

    const { body } = await call('GET', '/schedule?from=2026-10-12&to=2026-10-19', 'leader')
    // Monday 09:00: the prayer of 06:45 today is over and gone
    expect((body.days as { day: string }[]).map((item) => item.day)).toEqual([
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-19'
    ])
    // readers see the open events for everyone only
    expect((await call('GET', '/schedule', 'reader')).body.days).toEqual([])
    expect((await call('POST', '/schedule/team', 'reader', {})).status).toBe(403)
  })

  it('the backup agrees when invited; when the main one cannot, the backup leads', async () => {
    const { call } = await church()
    const eventId = ((await call('POST', '/schedule/events', 'owner', prayer)).body.event as { id: string })
      .id
    const day = '2026-10-13'

    // the responsible person invites, with a backup
    expect(
      (
        await call('POST', '/schedule/team', 'pastor', {
          eventId,
          day,
          uid: 'musician-uid',
          backupUid: 'leader-uid'
        })
      ).status
    ).toBe(200)
    expect(((await call('GET', '/messages', 'musician')).body.messages as unknown[])[0]).toMatchObject({
      text: expect.stringContaining('Запрошення на служіння')
    })

    await call('POST', '/schedule/answer', 'leader', {
      eventId,
      day,
      uid: 'musician-uid',
      as: 'backup',
      answer: 'confirm'
    })
    const declined = await call('POST', '/schedule/answer', 'musician', {
      eventId,
      day,
      uid: 'musician-uid',
      as: 'main',
      answer: 'decline',
      reason: 'захворів'
    })
    expect(declined.body).toEqual({ answered: true, replacedBy: 'leader-uid' })

    const team = (await call('GET', `/schedule?from=${day}&to=${day}`, 'leader')).body.participants as {
      uid: string
      status: string
    }[]
    expect(team.map(({ uid, status }) => [uid, status]).sort()).toEqual([
      ['leader-uid', 'confirmed'],
      ['musician-uid', 'declined']
    ])
    const toPastor = (await call('GET', '/messages', 'pastor')).body.messages as { text: string }[]
    expect(toPastor.map((message) => message.text)).toContainEqual(
      expect.stringContaining('Причина: захворів')
    )
    // only the invited one answers for themselves
    expect(
      (
        await call('POST', '/schedule/answer', 'pastor', {
          eventId,
          day,
          uid: 'leader-uid',
          as: 'main',
          answer: 'decline'
        })
      ).status
    ).toBe(403)
  })

  it('nobody left: an emergency to the responsible person and the planners', async () => {
    const { call } = await church()
    // the leader plans the schedule too
    await call('PUT', '/admin/roles', 'owner', {
      roles: [
        {
          id: 'reader',
          name: 'Читач',
          publish: false,
          send: false,
          sendToRoles: [],
          sendToPeople: false,
          messageDays: 1,
          manage: []
        },
        {
          id: 'publisher',
          name: 'Публікатор',
          publish: true,
          send: true,
          sendToRoles: [],
          sendToPeople: true,
          messageDays: 1,
          manage: []
        },
        {
          id: 'planner',
          name: 'Координатор',
          publish: false,
          send: false,
          sendToRoles: [],
          sendToPeople: false,
          messageDays: 1,
          manage: ['schedule']
        },
        {
          id: 'servant',
          name: 'Служитель',
          publish: false,
          send: false,
          sendToRoles: [],
          sendToPeople: false,
          messageDays: 1,
          manage: []
        }
      ]
    })
    await call('PUT', '/admin/users/leader-uid', 'owner', { role: 'planner' })
    await call('PUT', '/admin/users/musician-uid', 'owner', { role: 'servant' })
    const eventId = (
      (await call('POST', '/schedule/events', 'leader', { ...prayer, weekdays: null, day: '2026-10-14' }))
        .body.event as { id: string }
    ).id

    await call('POST', '/schedule/team', 'leader', { eventId, day: '2026-10-14', uid: 'musician-uid' })
    const answer = await call('POST', '/schedule/answer', 'musician', {
      eventId,
      day: '2026-10-14',
      uid: 'musician-uid',
      as: 'main',
      answer: 'decline'
    })
    expect(answer.body).toEqual({ answered: true, emergency: true })
    for (const user of ['pastor', 'leader']) {
      const texts = ((await call('GET', '/messages', user)).body.messages as { text: string }[]).map(
        (m) => m.text
      )
      expect(texts).toContainEqual(expect.stringContaining('ТЕРМІНОВО'))
    }
  })

  it('an open event: the members of its ministry apply, the responsible person takes them', async () => {
    const { call } = await church()
    const eventId = (
      (
        await call('POST', '/schedule/events', 'owner', {
          ministry: 'Музичне служіння',
          title: 'Неділя',
          day: '2026-10-18',
          time: '10:00',
          mode: 'open',
          needed: 3,
          responsibleUid: 'pastor-uid'
        })
      ).body.event as { id: string }
    ).id
    const day = '2026-10-18'

    expect((await call('POST', '/schedule/apply', 'leader', { eventId, day })).status).toBe(403)
    expect((await call('POST', '/schedule/apply', 'musician', { eventId, day })).status).toBe(200)
    expect((await call('POST', '/schedule/apply', 'musician', { eventId, day })).status).toBe(409)
    expect(
      (await call('POST', '/schedule/approve', 'pastor', { eventId, day, uid: 'musician-uid' })).status
    ).toBe(200)
    const [participant] = (await call('GET', `/schedule?from=${day}&to=${day}`, 'musician')).body
      .participants as {
      status: string
    }[]
    expect(participant).toMatchObject({ status: 'confirmed' })

    // no past days, no days the event does not have
    expect((await call('POST', '/schedule/apply', 'musician', { eventId, day: '2026-10-19' })).status).toBe(
      404
    )
  })

  it('the responsible person who applies serves at once; an approved person goes back to the applications', async () => {
    const { call } = await church()
    const event = { ministry: 'Музичне служіння', day: '2026-10-18', time: '10:00', mode: 'open' }
    const eventId = (
      (await call('POST', '/schedule/events', 'owner', { ...event, responsibleUid: 'pastor-uid' })).body
        .event as { id: string }
    ).id
    const day = '2026-10-18'
    expect(
      (await call('POST', '/schedule/apply', 'pastor', { eventId, day })).body.participant
    ).toMatchObject({
      status: 'confirmed'
    })
    await call('POST', '/schedule/apply', 'musician', { eventId, day })
    await call('POST', '/schedule/approve', 'pastor', { eventId, day, uid: 'musician-uid' })
    expect(
      (await call('POST', '/schedule/unapprove', 'musician', { eventId, day, uid: 'musician-uid' })).status
    ).toBe(403)
    await call('POST', '/schedule/unapprove', 'pastor', { eventId, day, uid: 'musician-uid' })
    const team = (await call('GET', `/schedule?from=${day}&to=${day}`, 'pastor')).body.participants as {
      uid: string
      status: string
    }[]
    expect(team.map(({ uid, status }) => [uid, status]).sort()).toEqual([
      ['musician-uid', 'applied'],
      ['pastor-uid', 'confirmed']
    ])
  })

  it('a type with fixed roles: the roles are given one by one, materials are sent for a role', async () => {
    const { call } = await church()
    const types = (await call('GET', '/schedule', 'owner')).body.types as { id: string; slots: unknown[] }[]
    const communion = types.find((type) => type.id === 'communion')!
    const created = await call('POST', '/schedule/events', 'owner', {
      typeId: 'communion',
      ministry: 'Пасторське служіння',
      day: '2026-10-18',
      time: '11:00',
      needed: 1,
      // a type with fixed roles keeps its own
      slots: [{ name: 'Хтось', count: 9, materials: false, hint: '' }],
      responsibleUid: 'pastor-uid'
    })
    const event = created.body.event as { id: string; slots: unknown[]; needed: number }
    expect(event.slots).toEqual(communion.slots)
    expect(event.needed).toBe(6)
    const eventId = event.id
    const day = '2026-10-18'

    for (const uid of ['musician-uid', 'leader-uid']) {
      await call('POST', '/schedule/team', 'pastor', { eventId, day, uid })
    }
    const role = (uid: string, name: string | null, token = 'pastor') =>
      call('POST', '/schedule/role', token, { eventId, day, uid, role: name })
    expect((await role('musician-uid', 'Пастор', 'leader')).status).toBe(403)
    expect((await role('musician-uid', 'Пастор')).status).toBe(200)
    // one pastor: taken, until it is freed
    expect((await role('leader-uid', 'Пастор')).status).toBe(409)
    expect((await role('leader-uid', 'Диякон')).status).toBe(400)
    const toMusician = (await call('GET', '/messages', 'musician')).body.messages as { text: string }[]
    expect(toMusician.map((message) => message.text)).toContainEqual(
      expect.stringContaining('Підготуйте, будь ласка: Нотатки, вірші з Біблії')
    )

    // the person of the role sends notes; another member cannot, the responsible person can
    const post = { title: '', items: [{ kind: 'note', text: 'Хліб і вино', verses: [] }] }
    const material = { eventId, day, role: 'Пастор', kind: 'note', post }
    expect((await call('POST', '/schedule/materials', 'leader', material)).status).toBe(403)
    expect((await call('POST', '/schedule/materials', 'musician', material)).body.material).toMatchObject({
      role: 'Пастор',
      title: 'Хліб і вино'
    })
    await call('POST', '/schedule/materials', 'pastor', {
      ...material,
      post: { ...post, title: 'Від пастора' }
    })
    const list = (await call('GET', `/schedule?from=${day}&to=${day}`, 'leader')).body.materials as {
      name: string
      post?: unknown
    }[]
    expect(list.map((item) => item.name)).toEqual(['Музикант', 'pastor@example.com'])
    expect(list[0]).not.toHaveProperty('post')
    const full = (await call('GET', `/schedule/materials?eventId=${eventId}&day=${day}`, 'leader')).body
      .materials as { post: unknown }[]
    expect(full[0]!.post).toEqual(post)

    // the pastor is freed and given to another
    await role('musician-uid', null)
    expect((await role('leader-uid', 'Пастор')).status).toBe(200)
  })

  it('invitations to some days go in one message; a role invites to its own ministries only', async () => {
    const { call } = await church()
    const eventId = ((await call('POST', '/schedule/events', 'owner', prayer)).body.event as { id: string })
      .id
    const days = ['2026-10-13', '2026-10-14']
    const invited = await call('POST', '/schedule/invitations', 'owner', {
      eventId,
      days,
      uids: ['musician-uid', 'leader-uid']
    })
    expect(invited.body).toEqual({ invited: 4 })
    // again: nobody twice
    expect(
      (await call('POST', '/schedule/invitations', 'owner', { eventId, days, uids: ['musician-uid'] })).body
    ).toEqual({ invited: 0 })
    const toMusician = (await call('GET', '/messages', 'musician')).body.messages as { text: string }[]
    expect(toMusician).toHaveLength(1)
    expect(toMusician[0]!.text).toContain('2026-10-13, 2026-10-14')
    // the message has the days to answer by its buttons in the app
    expect((toMusician[0] as unknown as { asks: unknown[] }).asks).toEqual([
      { eventId, day: '2026-10-13', uid: 'musician-uid', as: 'main' },
      { eventId, day: '2026-10-14', uid: 'musician-uid', as: 'main' }
    ])
    // not a day of the event (Sunday)
    expect(
      (
        await call('POST', '/schedule/invitations', 'owner', {
          eventId,
          days: ['2026-10-18'],
          uids: ['leader-uid']
        })
      ).status
    ).toBe(404)

    // a servant whose role invites to the music ministry only
    const roles = (await call('GET', '/admin/settings', 'owner')).body.roles as {
      id: string
      invite: string[]
    }[]
    expect(roles.find((role) => role.id === 'publisher')!.invite).toEqual(['*'])
    await call('PUT', '/admin/roles', 'owner', {
      roles: roles.map((role) => (role.id === 'servant' ? { ...role, invite: ['Музичне служіння'] } : role))
    })
    const invite = (token: string) =>
      call('POST', '/schedule/invitations', token, { eventId, days: ['2026-10-15'], uids: ['musician-uid'] })
    expect((await invite('leader')).status).toBe(403)
    const music = (
      (
        await call('POST', '/schedule/events', 'owner', {
          ...prayer,
          ministry: 'Музичне служіння',
          responsibleUid: 'owner-uid'
        })
      ).body.event as { id: string }
    ).id
    expect(
      (
        await call('POST', '/schedule/invitations', 'leader', {
          eventId: music,
          days: ['2026-10-15'],
          uids: ['musician-uid']
        })
      ).body
    ).toEqual({ invited: 1 })
  })

  it('the addresses of the locations: kept by the administrators, given with the schedule', async () => {
    const { call } = await church()
    expect(
      (await call('PUT', '/admin/addresses', 'pastor', { addresses: { Церква: 'Харків' } })).status
    ).toBe(403)
    expect(
      (await call('PUT', '/admin/addresses', 'owner', { addresses: { Невідома: 'Харків' } })).status
    ).toBe(400)
    const saved = await call('PUT', '/admin/addresses', 'owner', {
      addresses: { Церква: ' Харків, вул. Сумська, 1 ', Онлайн: '' }
    })
    expect(saved.body).toEqual({ addresses: { Церква: 'Харків, вул. Сумська, 1' } })
    expect((await call('GET', '/schedule', 'leader')).body.addresses).toEqual({
      Церква: 'Харків, вул. Сумська, 1'
    })
    expect((await call('GET', '/ministries', 'leader')).body.addresses).toEqual({
      Церква: 'Харків, вул. Сумська, 1'
    })
  })

  it('a leader of a ministry plans its events, not the events of another ministry', async () => {
    const { call } = await church()
    // the leader (a servant) leads the prayer ministry
    expect(
      (await call('PUT', '/admin/leaders', 'owner', { leaders: { 'Молитовне служіння': ['leader-uid'] } }))
        .status
    ).toBe(200)
    expect(
      (await call('PUT', '/admin/leaders', 'owner', { leaders: { Невідоме: ['leader-uid'] } })).status
    ).toBe(400)
    expect((await call('GET', '/me', 'leader')).body.leads).toEqual(['Молитовне служіння'])

    const created = await call('POST', '/schedule/events', 'leader', {
      ...prayer,
      responsibleUid: 'leader-uid'
    })
    expect(created.status).toBe(200)
    const eventId = (created.body.event as { id: string }).id
    // another ministry: no
    expect(
      (await call('POST', '/schedule/events', 'leader', { ...prayer, ministry: 'Музичне служіння' })).status
    ).toBe(403)
    // the events of the ministry: invitations and the change of a day
    expect(
      (
        await call('POST', '/schedule/invitations', 'leader', {
          eventId,
          days: ['2026-10-13'],
          uids: ['musician-uid']
        })
      ).status
    ).toBe(200)
    expect(
      (await call('PUT', '/schedule/days', 'musician', { eventId, day: '2026-10-13', cancelled: true }))
        .status
    ).toBe(403)
  })

  it('the time of a weekday; a day changed or cancelled, and the team is told', async () => {
    const { call } = await church()
    // Monday to Friday at 06:45, Saturday at 08:00
    const eventId = (
      (await call('POST', '/schedule/events', 'owner', { ...prayer, times: { 6: '08:00' } })).body.event as {
        id: string
        times: unknown
      }
    ).id
    const { body } = await call('GET', '/schedule?from=2026-10-16&to=2026-10-17', 'leader')
    expect((body.events as { times: unknown }[])[0]!.times).toEqual({ 6: '08:00' })

    await call('POST', '/schedule/invitations', 'owner', {
      eventId,
      days: ['2026-10-17'],
      uids: ['musician-uid']
    })
    // Saturday: another place, then cancelled
    const moved = await call('PUT', '/schedule/days', 'owner', {
      eventId,
      day: '2026-10-17',
      time: '09:00',
      location: 'Церква',
      note: 'Цього разу офлайн'
    })
    expect(moved.body.change).toMatchObject({ time: '09:00', location: 'Церква', cancelled: false })
    const told = (await call('GET', '/messages', 'musician')).body.messages as { text: string }[]
    expect(told.map((message) => message.text)).toContainEqual(
      expect.stringContaining('Зміни: Молитовне служіння: Ранкова молитва — 2026-10-17 09:00, Церква')
    )
    await call('PUT', '/schedule/days', 'owner', { eventId, day: '2026-10-17', cancelled: true })
    const cancelled = (await call('GET', '/messages', 'musician')).body.messages as { text: string }[]
    expect(cancelled.map((message) => message.text)).toContainEqual(expect.stringContaining('Скасовано'))
    // a cancelled day takes no answers
    expect(
      (
        await call('POST', '/schedule/answer', 'musician', {
          eventId,
          day: '2026-10-17',
          uid: 'musician-uid',
          as: 'main',
          answer: 'confirm'
        })
      ).status
    ).toBe(409)
    // all empty: the day is as the event again
    expect(
      (await call('PUT', '/schedule/days', 'owner', { eventId, day: '2026-10-17' })).body.change
    ).toBeNull()
  })

  it('a guest is written by name; who applies is the choice of the event', async () => {
    const { call } = await church()
    const open = (applicants: string) =>
      call('POST', '/schedule/events', 'owner', {
        ...prayer,
        title: applicants,
        mode: 'open',
        applicants,
        responsibleUid: 'owner-uid'
      }).then((answer) => (answer.body.event as { id: string }).id)
    const day = '2026-10-13'

    const ministry = await open('ministry')
    expect((await call('POST', '/schedule/apply', 'musician', { eventId: ministry, day })).status).toBe(403)
    const servants = await open('servants')
    expect((await call('POST', '/schedule/apply', 'musician', { eventId: servants, day })).status).toBe(200)
    expect((await call('POST', '/schedule/apply', 'reader', { eventId: servants, day })).status).toBe(403)
    const everyone = await open('everyone')
    expect((await call('POST', '/schedule/apply', 'reader', { eventId: everyone, day })).status).toBe(200)
    // the reader sees that event, no other
    const seen = (await call('GET', `/schedule?from=${day}&to=${day}`, 'reader')).body.events as {
      id: string
    }[]
    expect(seen.map((event) => event.id)).toEqual([everyone])

    const guest = await call('POST', '/schedule/guest', 'owner', {
      eventId: ministry,
      day,
      name: 'Пастор Іван, Київ'
    })
    expect(guest.body.participant).toMatchObject({ name: 'Пастор Іван, Київ', status: 'confirmed' })
    expect(
      (await call('POST', '/schedule/guest', 'musician', { eventId: ministry, day, name: 'Хтось' })).status
    ).toBe(403)
  })

  it('administrators keep the types of events and the settings of the calendar', async () => {
    const { call } = await church()
    const calendar = { redDays: 1, orangeDays: 3, filters: ['ministry', 'mine'] }
    expect((await call('PUT', '/admin/calendar', 'pastor', { calendar })).status).toBe(403)
    expect((await call('PUT', '/admin/calendar', 'owner', { calendar })).body).toEqual({ calendar })
    const eventTypes = [{ id: 'prayer', name: 'Молитва', ministry: null, roles: 'none', slots: [] }]
    expect((await call('PUT', '/admin/event-types', 'owner', { eventTypes })).body).toEqual({ eventTypes })
    const { body } = await call('GET', '/schedule', 'leader')
    expect(body).toMatchObject({ calendar, types: eventTypes })
  })
})

describe('types of notes and topics', () => {
  it('everyone who signed in reads them; administrators change them', async () => {
    const { call } = setup()
    await call('GET', '/me', 'owner')
    const { body } = await call('GET', '/types', 'reader')
    expect((body.types as { id: string }[]).map((type) => type.id)).toEqual([
      'news',
      'announcement',
      'sermon',
      'prayer',
      'internal'
    ])

    const types = [
      {
        id: 'sermon',
        name: ' Проповідь ',
        color: '#6A1B9A',
        publish: 'author',
        send: true,
        days: null,
        deleteAfterPublish: false,
        authorSetsTerm: false
      }
    ]
    expect((await call('PUT', '/admin/types', 'reader', { types })).status).toBe(403)
    expect((await call('PUT', '/admin/types', 'owner', { types })).body).toEqual({
      types: [{ ...types[0], name: 'Проповідь' }]
    })
    expect(((await call('GET', '/types', 'reader')).body.types as unknown[]).length).toBe(1)

    // no types, two with one id, a wrong color or term are refused
    for (const bad of [
      [],
      [types[0], types[0]],
      [{ ...types[0], color: 'red' }],
      [{ ...types[0], days: 0 }]
    ]) {
      expect((await call('PUT', '/admin/types', 'owner', { types: bad })).status).toBe(400)
    }
  })
})

describe('messages between ministers', () => {
  /** the owner makes the pastor a publisher and puts two people into ministries */
  async function church() {
    const context = setup()
    const { call } = context
    for (const user of ['owner', 'pastor', 'reader', 'musician', 'leader']) await call('GET', '/me', user)
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'publisher' })
    await call('PUT', '/admin/users/musician-uid', 'owner', { ministries: ['Музичне служіння'] })
    await call('PUT', '/admin/users/leader-uid', 'owner', { ministries: ['Лідер домашньої групи'] })
    return context
  }

  const note = {
    kind: 'note',
    post: {
      title: '',
      items: [
        {
          kind: 'note',
          text: 'Пісні на неділю',
          verses: [{ text: 'Хваліте', ref: 'Пс 150:1', id: 'ohienko:0.018.149.000' }]
        }
      ],
      image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    }
  }

  it('ministries: a list kept by the administrators, given to users', async () => {
    const { call } = await church()
    expect((await call('GET', '/me', 'musician')).body).toMatchObject({
      role: 'servant',
      ministries: ['Музичне служіння'],
      canSend: false,
      canReceive: true
    })
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ canSend: false, canReceive: false })

    expect((await call('PUT', '/admin/directories/ministries', 'pastor', { items: ['x'] })).status).toBe(403)
    expect(
      (await call('PUT', '/admin/directories/ministries', 'owner', { items: [' Хор ', 'Хор', 'Діти'] })).body
    ).toEqual({ items: ['Хор', 'Діти'] })
    expect((await call('GET', '/ministries', 'musician')).body).toMatchObject({ ministries: ['Хор', 'Діти'] })
    expect((await call('PUT', '/admin/directories/ministries', 'owner', { items: [''] })).status).toBe(400)
  })

  it('the pastor writes to a ministry; the note goes without its picture; read marks', async () => {
    const { call } = await church()
    const recipients = await call('GET', '/messages/recipients', 'pastor')
    expect((recipients.body.people as { uid: string }[]).map((person) => person.uid).sort()).toEqual([
      'leader-uid',
      'musician-uid'
    ])

    expect(
      (
        await call('POST', '/messages', 'pastor', {
          ministries: ['Музичне служіння'],
          text: 'На неділю',
          attachment: note
        })
      ).body
    ).toEqual({ sent: 1 })

    const inbox = await call('GET', '/messages', 'musician')
    expect(inbox.body.unread).toBe(1)
    const [message] = inbox.body.messages as { id: string; fromName: string; attachment: { post: object } }[]
    expect(message).toMatchObject({ fromName: 'pastor@example.com', text: 'На неділю' })
    expect(message!.attachment.post).not.toHaveProperty('image')

    await call('POST', `/messages/${message!.id}/read`, 'musician')
    expect((await call('GET', '/messages', 'musician')).body.unread).toBe(0)
    // the leader got nothing; the pastor sees the sent message
    expect((await call('GET', '/messages', 'leader')).body.messages).toEqual([])
    expect((await call('GET', '/messages', 'pastor')).body.messages).toHaveLength(1)
  })

  it('a member of a ministry only answers; a reader neither writes nor reads', async () => {
    const { call } = await church()
    expect(
      (await call('POST', '/messages', 'musician', { to: ['pastor-uid'], text: 'Питання' })).status
    ).toBe(403)
    expect((await call('GET', '/messages', 'reader')).status).toBe(403)
    expect((await call('POST', '/messages', 'pastor', { to: ['reader-uid'], text: 'Привіт' })).status).toBe(
      400
    )

    await call('POST', '/messages', 'pastor', { to: ['musician-uid', 'leader-uid'], text: 'Нарада' })
    const [toMusician] = (await call('GET', '/messages', 'musician')).body.messages as { id: string }[]
    const [toLeader] = (await call('GET', '/messages', 'leader')).body.messages as { id: string }[]

    expect(
      (
        await call('POST', '/messages', 'musician', {
          replyTo: toMusician!.id,
          to: ['leader-uid'],
          text: 'Буду'
        })
      ).body
    ).toEqual({ sent: 1 })
    const answers = (await call('GET', '/messages', 'pastor')).body.messages as {
      toUid: string
      fromUid: string
    }[]
    expect(answers.filter((m) => m.toUid === 'pastor-uid').map((m) => m.fromUid)).toEqual(['musician-uid'])
    // not to a message of someone else
    expect((await call('POST', '/messages', 'musician', { replyTo: toLeader!.id, text: 'Ні' })).status).toBe(
      403
    )
  })

  it('ministers are asked for a mobile number; they or an administrator give it', async () => {
    const { call } = await church()
    expect((await call('GET', '/me', 'musician')).body).toMatchObject({ phone: null, needsPhone: true })
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ needsPhone: false })

    expect((await call('PUT', '/me', 'musician', { phone: '050 123' })).status).toBe(400)
    expect((await call('PUT', '/me', 'musician', { phone: '+380501234567' })).body).toEqual({
      phone: '+380501234567'
    })
    expect((await call('GET', '/me', 'musician')).body).toMatchObject({ needsPhone: false })

    expect((await call('PUT', '/admin/users/leader-uid', 'owner', { phone: '+380671112233' })).status).toBe(
      200
    )
    const people = (await call('GET', '/messages/recipients', 'pastor')).body.people as {
      uid: string
      phone: string | null
    }[]
    expect(people.map(({ uid, phone }) => [uid, phone]).sort()).toEqual([
      ['leader-uid', '+380671112233'],
      ['musician-uid', '+380501234567']
    ])

    expect((await call('PUT', '/me', 'musician', { phone: null })).body).toEqual({ phone: null })
  })

  it('messages live for a day; a person sends at most 100 in an hour', async () => {
    const { call, clock } = await church()
    await call('POST', '/messages', 'pastor', { to: ['musician-uid'], text: 'Сьогодні' })
    clock.now += 25 * 60 * 60 * 1000
    expect((await call('GET', '/messages', 'musician')).body.messages).toEqual([])

    for (let index = 0; index < 50; index++) {
      await call('POST', '/messages', 'pastor', { to: ['musician-uid', 'leader-uid'], text: `№${index}` })
    }
    expect((await call('POST', '/messages', 'pastor', { to: ['musician-uid'], text: 'ще' })).status).toBe(429)
  })
})

/** a request of the service bot to the Telegram API, as the tests read it */
interface Sent {
  chat_id?: number | string
  text: string
  reply_markup?: { inline_keyboard?: { text: string; callback_data: string }[][]; [name: string]: unknown }
  [name: string]: unknown
}

describe('the service bot', () => {
  const DAY = '2026-10-13'

  async function linked() {
    const context = setup()
    const { call, fetcher, env, clock, messages, schedule } = context
    clock.now = Date.parse('2026-10-12T06:00:00Z')
    env.SERVICE_BOT_TOKEN = 'SVC'
    env.SERVICE_CHAT_ID = '-100777'
    fetcher.mockImplementation(async (url: unknown) =>
      String(url).endsWith('/getMe')
        ? new Response('{"ok":true,"result":{"username":"kcc_service_bot"}}')
        : new Response('{"ok":true}')
    )
    for (const user of ['owner', 'pastor', 'leader', 'reader']) await call('GET', '/me', user)
    await call('PUT', '/admin/users/pastor-uid', 'owner', { role: 'publisher' })
    await call('PUT', '/admin/users/leader-uid', 'owner', { ministries: ['Молитовне служіння'] })

    const secret = await webhookSecret('SVC')
    const webhook = (update: unknown, header = secret) =>
      handle(
        new Request('https://worker.test/telegram/webhook', {
          method: 'POST',
          headers: { 'x-telegram-bot-api-secret-token': header, 'content-type': 'application/json' },
          body: JSON.stringify(update)
        }),
        env,
        {
          verify: async () => {
            throw new Error('no token')
          },
          fetcher: fetcher as unknown as typeof fetch,
          messages,
          schedule,
          now: () => clock.now
        }
      )
    /** what the bot sent with a method of the Telegram API */
    const sent = (method: string) =>
      fetcher.mock.calls
        .filter(([url]) => String(url).endsWith(`/bot${'SVC'}/${method}`))
        .map(([, init]) => JSON.parse(String(init?.body)) as Sent)

    const link = (await call('POST', '/telegram/link', 'leader')).body.url as string
    expect(link).toMatch(/^https:\/\/t\.me\/kcc_service_bot\?start=[0-9a-f]{32}$/)
    expect(sent('setWebhook')[0]).toMatchObject({
      url: 'https://worker.test/telegram/webhook',
      secret_token: secret
    })
    const start = (token: string) =>
      webhook({ message: { chat: { id: 555, type: 'private' }, text: `/start ${token}` } })
    await start(link.split('start=')[1]!)
    return { ...context, webhook, sent, start, link }
  }

  it('a minister links Telegram by Start in the bot; the link works once; readers have no bot', async () => {
    const { call, sent, start, link, webhook } = await linked()
    expect(sent('sendMessage').at(-1)).toMatchObject({
      chat_id: 555,
      text: expect.stringContaining('Готово, Лідер')
    })
    expect((await call('GET', '/me', 'leader')).body).toMatchObject({
      serviceBot: true,
      telegramLinked: true
    })
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ serviceBot: false })
    expect((await call('POST', '/telegram/link', 'reader')).status).toBe(403)

    await start(link.split('start=')[1]!)
    expect(sent('sendMessage').at(-1)!.text).toContain('Посилання застаріло')
    // Telegram's secret header, nothing else
    expect(
      (await webhook({ message: { chat: { id: 1, type: 'private' }, text: '/stop' } }, 'wrong')).status
    ).toBe(403)

    await webhook({ message: { chat: { id: 555, type: 'private' }, text: '/stop' } })
    expect((await call('GET', '/me', 'leader')).body).toMatchObject({ telegramLinked: false })
  })

  it('a minister links by the number of their own Telegram account, the one of the app', async () => {
    const { call, sent, webhook } = await linked()
    await call('GET', '/me', 'musician')
    await call('PUT', '/admin/users/musician-uid', 'owner', {
      ministries: ['Музичне служіння'],
      phone: '+380501112233'
    })
    const contact = (phone: string, userId = 900, from = 900) =>
      webhook({
        message: {
          chat: { id: from, type: 'private' },
          from: { id: from },
          contact: { phone_number: phone, user_id: userId }
        }
      })

    // the first message: the button that shares the number
    await webhook({ message: { chat: { id: 900, type: 'private' }, from: { id: 900 }, text: '/start' } })
    expect(sent('sendMessage').at(-1)!.reply_markup).toMatchObject({
      keyboard: [[{ request_contact: true }]]
    })
    // somebody else's contact is not taken; an unknown number is not either
    await contact('380501112233', 1)
    expect(sent('sendMessage').at(-1)!.text).toContain('власний номер')
    await contact('380999999999')
    expect(sent('sendMessage').at(-1)!.text).toContain('не знайдено')

    await contact('380501112233')
    expect(sent('sendMessage').at(-1)!.text).toContain('Готово, Музикант')
    expect((await call('GET', '/me', 'musician')).body).toMatchObject({ telegramLinked: true })
    await webhook({ message: { chat: { id: 900, type: 'private' }, from: { id: 900 }, text: '/me' } })
    expect(sent('sendMessage').at(-1)!.text).toContain('Ви підключені як: Музикант (+380501112233)')
  })

  it('an invitation comes with buttons; a button answers it; messages come too', async () => {
    const { call, sent, webhook } = await linked()
    const eventId = (
      (
        await call('POST', '/schedule/events', 'owner', {
          ministry: 'Молитовне служіння',
          title: 'Ранкова молитва',
          weekdays: [1, 2, 3, 4, 5, 6],
          time: '06:45',
          responsibleUid: 'pastor-uid'
        })
      ).body.event as { id: string }
    ).id
    await call('POST', '/schedule/invitations', 'owner', {
      eventId,
      days: [DAY, '2026-10-14'],
      uids: ['leader-uid']
    })
    const invitation = sent('sendMessage').find(
      (body) => body.chat_id === 555 && body.reply_markup?.inline_keyboard
    )!
    expect(invitation.text).toContain('Запрошення на служіння')
    // the service channel: the same, with whom it is for, and buttons of its own
    const post = sent('sendMessage').find(
      (body) => body.chat_id === '-100777' && body.reply_markup?.inline_keyboard
    )!
    // whom it is for first, then the message
    expect(post.text).toMatch(/^👤 Кому: Лідер\n─+\nЗапрошення на служіння/)
    expect(post.reply_markup!.inline_keyboard!).toHaveLength(2)
    // a row for each day
    const rows = invitation.reply_markup!.inline_keyboard!
    expect(rows.map((row) => row.map((button) => button.text))).toEqual([
      ['✅ 13.10: Підтвердити', '❌ 13.10: Не можу'],
      ['✅ 14.10: Підтвердити', '❌ 14.10: Не можу']
    ])

    await webhook({
      callback_query: {
        id: 'cb1',
        data: rows[0]![0]!.callback_data,
        from: { id: 555 },
        message: { chat: { id: 555 }, message_id: 7, text: invitation.text }
      }
    })
    expect(sent('answerCallbackQuery').at(-1)).toEqual({
      callback_query_id: 'cb1',
      text: '✅ Підтверджено. Дякуємо!'
    })
    // the answered day goes from the buttons, the other stays
    expect(sent('editMessageText').at(-1)).toMatchObject({
      chat_id: 555,
      message_id: 7,
      text: expect.stringContaining('✅ 13.10: підтверджено')
    })
    const team = (await call('GET', `/schedule?from=${DAY}&to=${DAY}`, 'leader')).body.participants as {
      status: string
    }[]
    expect(team).toMatchObject([{ status: 'confirmed' }])

    // a button of a private chat does not answer in another chat
    await webhook({
      callback_query: {
        id: 'cb2',
        data: rows[1]![0]!.callback_data,
        from: { id: 555 },
        message: { chat: { id: 556 }, message_id: 8 }
      }
    })
    expect(sent('answerCallbackQuery').at(-1)).toMatchObject({
      callback_query_id: 'cb2',
      text: 'Це запрошення вже неактуальне'
    })

    // in the channel: somebody who did not link Telegram, the invited one who did
    const channelRows = post.reply_markup!.inline_keyboard!
    const inChannel = (id: string, data: string, from: number) =>
      webhook({
        callback_query: {
          id,
          data,
          from: { id: from },
          message: { chat: { id: -100777 }, message_id: 9, text: post.text, reply_markup: post.reply_markup }
        }
      })
    await inChannel('cb3', channelRows[1]![1]!.callback_data, 999)
    expect(sent('answerCallbackQuery').at(-1)!.text).toContain('Спершу підключіть Telegram')
    await inChannel('cb4', channelRows[1]![1]!.callback_data, 555)
    expect(sent('editMessageText').at(-1)).toMatchObject({
      chat_id: -100777,
      text: expect.stringContaining('❌ 14.10: Лідер не може'),
      reply_markup: { inline_keyboard: [channelRows[0]] }
    })
    // nobody left: an emergency, in the channel too
    expect(
      sent('sendMessage').some((body) => body.chat_id === '-100777' && body.text.includes('ТЕРМІНОВО'))
    ).toBe(true)

    // a message between ministers goes in private only, not to the channel
    const posts = sent('sendMessage').filter((body) => body.chat_id === '-100777').length
    await call('POST', '/messages', 'pastor', { to: ['leader-uid'], text: 'Привіт' })
    expect(sent('sendMessage').filter((body) => body.chat_id === '-100777')).toHaveLength(posts)
    expect(sent('sendMessage').at(-1)).toMatchObject({
      chat_id: 555,
      text: expect.stringContaining('Привіт')
    })
  })

  it('a new open event calls for applications in the channel; its ministry applies by the button', async () => {
    const { call, sent, webhook, start } = await linked()
    // the pastor (who approves) and a musician (another ministry) link Telegram too
    await call('GET', '/me', 'musician')
    await call('PUT', '/admin/users/musician-uid', 'owner', { ministries: ['Музичне служіння'] })
    for (const [token, chat] of [
      ['pastor', 777],
      ['musician', 888]
    ] as const) {
      const url = (await call('POST', '/telegram/link', token)).body.url as string
      await webhook({
        message: { chat: { id: chat, type: 'private' }, text: `/start ${url.split('start=')[1]}` }
      })
    }
    void start

    const created = await call('POST', '/schedule/events', 'owner', {
      ministry: 'Молитовне служіння',
      title: 'Вечірня молитва',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      time: '19:00',
      mode: 'open',
      responsibleUid: 'owner-uid'
    })
    const eventId = (created.body.event as { id: string }).id
    const call_ = sent('sendMessage').find(
      (body) => body.chat_id === '-100777' && body.text.includes('Набір')
    )!
    // today (Monday 09:00) and the six days after it
    const rows = call_.reply_markup!.inline_keyboard!
    expect(rows).toHaveLength(7)
    expect(rows[0]![0]!.text).toBe('🙋 12.10: Подати заявку')

    const press = (id: string, from: number) =>
      webhook({
        callback_query: {
          id,
          data: rows[1]![0]!.callback_data,
          from: { id: from },
          message: {
            chat: { id: -100777 },
            message_id: 11,
            text: call_.text,
            reply_markup: call_.reply_markup
          }
        }
      })
    await press('a1', 888)
    expect(sent('answerCallbackQuery').at(-1)!.text).toBe('Заявки приймаються від учасників цього служіння')
    // the one who approves joins at once
    await press('a0', 777)
    expect(sent('answerCallbackQuery').at(-1)!.text).toBe('✅ Ви в команді')
    await press('a2', 555)
    expect(sent('editMessageText').at(-1)).toMatchObject({
      text: expect.stringContaining('🙋 13.10: Лідер — заявка'),
      // the button stays for the others
      reply_markup: { inline_keyboard: rows }
    })
    await press('a3', 555)
    expect(sent('answerCallbackQuery').at(-1)!.text).toBe('Ви вже в команді цього дня')
    const team = (await call('GET', '/schedule?from=2026-10-13&to=2026-10-13', 'owner')).body
      .participants as {
      uid: string
      status: string
    }[]
    expect(team.map(({ uid, status }) => [uid, status]).sort()).toEqual([
      ['leader-uid', 'applied'],
      ['pastor-uid', 'confirmed']
    ])

    // again, by hand, for one day
    expect(
      (await call('POST', '/schedule/announce', 'owner', { eventId, days: ['2026-10-15'] })).body
    ).toEqual({
      announced: 1
    })
    expect((await call('POST', '/schedule/announce', 'leader', { eventId })).status).toBe(403)
  })
})

describe('Firebase ID tokens', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256')
  const keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] })
  const sign = (claims: Record<string, unknown>, project = 'bible-test') =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(`https://securetoken.google.com/${project}`)
      .setAudience(project)
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey)

  it('gives the user of a valid token', async () => {
    expect(
      await verifyIdToken(await sign({ email: 'a@b.c', email_verified: true, name: 'A' }), 'bible-test', keys)
    ).toEqual({
      uid: 'user-1',
      email: 'a@b.c',
      emailVerified: true,
      name: 'A'
    })
  })

  it('rejects a token of another project', async () => {
    await expect(verifyIdToken(await sign({}, 'other'), 'bible-test', keys)).rejects.toThrow()
  })

  it('owners: by user id (case sensitive) or by a verified email', () => {
    expect(isOwner({ uid: 'x', email: 'a@b.c', emailVerified: false }, 'a@b.c')).toBe(false)
    expect(isOwner({ uid: 'x', email: 'A@B.c', emailVerified: true }, 'a@b.c')).toBe(true)
    expect(isOwner({ uid: 'Pastor-UID', email: null, emailVerified: false }, 'pastor-uid')).toBe(false)
    expect(isOwner({ uid: 'pastor-uid', email: null, emailVerified: false }, 'pastor-uid')).toBe(true)
  })
})
