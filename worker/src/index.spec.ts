import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import { roleOf, verifyIdToken, type AuthUser } from './auth'
import { handle, type Env } from './index'

const env: Env = {
  TELEGRAM_BOT_TOKEN: 'TOKEN',
  TELEGRAM_CHAT_ID: '@test_channel',
  FIREBASE_PROJECT_ID: 'bible-test',
  PUBLISHERS: 'pastor-uid, Admin@Example.com',
  ALLOWED_ORIGINS: 'https://garevna.github.io'
}

const users: Record<string, AuthUser> = {
  pastor: { uid: 'pastor-uid', email: null },
  admin: { uid: 'admin-uid', email: 'admin@example.com' },
  reader: { uid: 'reader-uid', email: 'reader@example.com' }
}

function setup() {
  const fetcher = vi.fn(async () => new Response('{"ok":true}'))
  const verify = async (token: string) => {
    if (!users[token]) throw new Error('bad token')
    return users[token]
  }
  const call = (method: string, path: string, token?: string, body?: unknown) =>
    handle(
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
  return { call, fetcher }
}

const topic = { title: 'Тема', items: [{ kind: 'verse', text: 'Вірш', ref: 'Від Матвія 1:1' }] }

describe('worker', () => {
  it('answers the preflight request of the app only', async () => {
    const { call } = setup()
    const response = await call('OPTIONS', '/telegram/publish')
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://garevna.github.io')

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

  it('tells the role: by user id, or by a verified email', async () => {
    const { call } = setup()
    expect(await (await call('GET', '/me', 'pastor')).json()).toEqual({ role: 'publisher', telegram: true })
    expect(await (await call('GET', '/me', 'admin')).json()).toMatchObject({ role: 'publisher' })
    expect(await (await call('GET', '/me', 'reader')).json()).toMatchObject({ role: 'reader' })
  })

  it('lets only publishers preview and publish', async () => {
    const { call, fetcher } = setup()
    expect((await call('POST', '/telegram/publish', 'reader', topic)).status).toBe(403)
    expect(fetcher).not.toHaveBeenCalled()

    const preview = await call('POST', '/telegram/preview', 'pastor', topic)
    expect(await preview.json()).toEqual({
      messages: ['<b>Тема</b>\n\n<blockquote>Вірш\n<i>Від Матвія 1:1</i></blockquote>']
    })
    expect(fetcher).not.toHaveBeenCalled()

    const published = await call('POST', '/telegram/publish', 'pastor', topic)
    expect(await published.json()).toEqual({ sent: 1 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects a body that is not a topic and unknown routes', async () => {
    const { call } = setup()
    expect((await call('POST', '/telegram/publish', 'pastor', { title: '' })).status).toBe(400)
    expect((await call('GET', '/telegram/publish', 'pastor')).status).toBe(404)
  })

  it('passes the error of Telegram to the app', async () => {
    const { call, fetcher } = setup()
    fetcher.mockResolvedValueOnce(
      new Response('{"description":"Forbidden: bot is not a member"}', { status: 403 })
    )
    const response = await call('POST', '/telegram/publish', 'pastor', topic)
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'telegram', message: 'Forbidden: bot is not a member' })
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

  it('gives the user of a valid token; the email only when it is verified', async () => {
    expect(
      await verifyIdToken(await sign({ email: 'a@b.c', email_verified: true }), 'bible-test', keys)
    ).toEqual({
      uid: 'user-1',
      email: 'a@b.c'
    })
    expect(
      await verifyIdToken(await sign({ email: 'a@b.c', email_verified: false }), 'bible-test', keys)
    ).toEqual({
      uid: 'user-1',
      email: null
    })
  })

  it('rejects a token of another project', async () => {
    await expect(verifyIdToken(await sign({}, 'other'), 'bible-test', keys)).rejects.toThrow()
  })

  it('an unverified email does not make a publisher', () => {
    expect(roleOf({ uid: 'x', email: null }, 'admin@example.com')).toBe('reader')
    expect(roleOf({ uid: 'Pastor-UID', email: null }, 'pastor-uid')).toBe('reader')
  })
})
