import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { isOwner, verifyIdToken, type AuthUser } from './auth'
import { handle, type Env } from './index'
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
  // claims the email of the owner, but it is not verified
  impostor: { uid: 'impostor-uid', email: 'owner@example.com', emailVerified: false, name: null }
}

function setup() {
  const env: Env = {
    TELEGRAM_BOT_TOKEN: 'TOKEN',
    TELEGRAM_CHAT_ID: '@test_channel',
    FIREBASE_PROJECT_ID: 'bible-test',
    OWNERS: 'Owner@Example.com',
    ALLOWED_ORIGINS: 'https://garevna.github.io',
    USERS: memoryStore()
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
      { verify, fetcher: fetcher as unknown as typeof fetch }
    )
    const answer = (await response.json().catch(() => null)) as Answer
    return { status: response.status, body: answer, headers: response.headers }
  }
  return { call, fetcher, env }
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
    expect((await call('GET', '/me', 'owner')).body).toEqual({ role: 'admin', telegram: true })
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
    expect(list.body.users.map((user) => [user.uid, user.role, user.owner])).toEqual(
      expect.arrayContaining([
        ['owner-uid', 'admin', true],
        ['pastor-uid', 'reader', false],
        ['reader-uid', 'reader', false]
      ])
    )

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
    expect(list.body.users.map((user) => user.uid)).toEqual(['owner-uid'])
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
      messages: ['<b>Тема</b>\n\n<blockquote>Вірш\n<i>Від Матвія 1:1</i></blockquote>']
    })
    expect(fetcher).not.toHaveBeenCalled()
    expect((await call('POST', '/telegram/publish', 'reader', topic)).body).toEqual({ sent: 1 })
    expect(fetcher).toHaveBeenCalledTimes(1)
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
