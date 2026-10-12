import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { isOwner, verifyIdToken, type AuthUser } from './auth'
import { handle, type Env } from './index'
import { memoryStore as memoryMessages } from './messages'
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
    get: (async (name: string) => {
      const item = data.get(name)
      return item ? JSON.parse(item.value) : null
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
  const fetcher = vi.fn(async () => new Response('{"ok":true}'))
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
      { verify, fetcher: fetcher as unknown as typeof fetch, messages, now: () => clock.now }
    )
    const answer = (await response.json().catch(() => null)) as Answer
    return { status: response.status, body: answer, headers: response.headers }
  }
  return { call, fetcher, env, clock }
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
      role: 'admin',
      telegram: true,
      canSend: true
    })
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ role: 'reader' })
    expect((await call('GET', '/me', 'impostor')).body).toMatchObject({ role: 'reader' })
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
      role: 'reader',
      ministries: ['Музичне служіння'],
      canSend: false,
      canReceive: true
    })
    expect((await call('GET', '/me', 'reader')).body).toMatchObject({ canSend: false, canReceive: false })

    expect((await call('PUT', '/admin/ministries', 'pastor', { ministries: ['x'] })).status).toBe(403)
    expect(
      (await call('PUT', '/admin/ministries', 'owner', { ministries: [' Хор ', 'Хор', 'Діти'] })).body
    ).toEqual({ ministries: ['Хор', 'Діти'] })
    expect((await call('GET', '/ministries', 'musician')).body).toEqual({ ministries: ['Хор', 'Діти'] })
    expect((await call('PUT', '/admin/ministries', 'owner', { ministries: [''] })).status).toBe(400)
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
