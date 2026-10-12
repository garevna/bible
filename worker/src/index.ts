import { roleOf, verifyIdToken, type AuthUser } from './auth'
import { parsePost } from './post'
import { formatTopic, sendMessages, TelegramError } from './telegram'

/**
 * Worker of the Bible app.
 *   GET  /me                 the role of the signed in user
 *   POST /telegram/preview   the messages a topic becomes (nothing is sent)
 *   POST /telegram/publish   sends the topic to the Telegram channel (publishers only)
 * Every request carries the Firebase ID token: Authorization: Bearer <token>.
 */
export interface Env {
  /** secret: the token of the bot from @BotFather */
  TELEGRAM_BOT_TOKEN: string
  /** the channel (@name or -100… id); the bot is its administrator */
  TELEGRAM_CHAT_ID: string
  FIREBASE_PROJECT_ID: string
  /** user ids and verified emails of the publishers, separated by commas */
  PUBLISHERS: string
  /** origins of the app, separated by commas */
  ALLOWED_ORIGINS: string
}

export interface Deps {
  verify: (token: string, projectId: string) => Promise<AuthUser>
  fetcher: typeof fetch
}

const defaultDeps: Deps = { verify: (token, projectId) => verifyIdToken(token, projectId), fetcher: fetch }

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((item) => item.trim())
  if (!allowed.includes(origin)) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin'
  }
}

export async function handle(request: Request, env: Env, deps: Deps = defaultDeps): Promise<Response> {
  const cors = corsHeaders(request, env)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const { pathname } = new URL(request.url)
  const route = `${request.method} ${pathname}`
  if (!['GET /me', 'POST /telegram/preview', 'POST /telegram/publish'].includes(route)) {
    return json({ error: 'not-found' }, 404)
  }

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return json({ error: 'unauthorized' }, 401)
  let user: AuthUser
  try {
    user = await deps.verify(token, env.FIREBASE_PROJECT_ID)
  } catch {
    return json({ error: 'unauthorized' }, 401)
  }
  const role = roleOf(user, env.PUBLISHERS)

  if (route === 'GET /me')
    return json({ role, telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) })

  if (role !== 'publisher') return json({ error: 'forbidden' }, 403)

  const post = parsePost(await request.json().catch(() => null))
  if (!post) return json({ error: 'bad-request' }, 400)
  const messages = formatTopic(post)

  if (route === 'POST /telegram/preview') return json({ messages })

  try {
    const sent = await sendMessages(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, messages, deps.fetcher)
    return json({ sent })
  } catch (error) {
    const message = error instanceof TelegramError ? error.message : 'Telegram is unreachable'
    return json({ error: 'telegram', message }, 502)
  }
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env)
} satisfies ExportedHandler<Env>
