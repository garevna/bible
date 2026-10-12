import { verifyIdToken, type AuthUser } from './auth'
import { parsePost } from './post'
import { formatTopic, sendMessages, sendPhoto, TelegramError, titleBlock } from './telegram'
import {
  isRole,
  listUsers,
  removeUser,
  RoleChangeError,
  roleOf,
  setRole,
  touchUser,
  type UsersStore
} from './users'

/**
 * Worker of the Bible app.
 *   GET    /me                 the role of the signed in user (and remembers the user)
 *   POST   /telegram/preview   the messages a topic becomes, and the caption of its picture (nothing is sent)
 *   POST   /telegram/publish   sends the topic to the Telegram channel
 *   GET    /admin/users        users who signed in, with their roles
 *   PUT    /admin/users/:uid   gives a role: { role: 'reader' | 'publisher' | 'admin' }
 *   DELETE /admin/users/:uid   takes a user off the list
 * Every request carries the Firebase ID token: Authorization: Bearer <token>.
 */
export interface Env {
  /** secret: the token of the bot from @BotFather */
  TELEGRAM_BOT_TOKEN: string
  /** the channel (@name or -100… id); the bot is its administrator */
  TELEGRAM_CHAT_ID: string
  FIREBASE_PROJECT_ID: string
  /** user ids and verified emails of the owners: administrators the dashboard cannot change */
  OWNERS: string
  /** origins of the app, separated by commas */
  ALLOWED_ORIGINS: string
  USERS: UsersStore
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
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin'
  }
}

const ROUTES = [
  /^GET \/me$/,
  /^POST \/telegram\/(preview|publish)$/,
  /^GET \/admin\/users$/,
  /^(PUT|DELETE) \/admin\/users\/[^/]+$/
]

export async function handle(request: Request, env: Env, deps: Deps = defaultDeps): Promise<Response> {
  const cors = corsHeaders(request, env)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const { pathname } = new URL(request.url)
  const route = `${request.method} ${pathname}`
  if (!ROUTES.some((pattern) => pattern.test(route))) return json({ error: 'not-found' }, 404)

  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return json({ error: 'unauthorized' }, 401)
  let authUser: AuthUser
  try {
    authUser = await deps.verify(token, env.FIREBASE_PROJECT_ID)
  } catch {
    return json({ error: 'unauthorized' }, 401)
  }

  const me = await touchUser(env.USERS, authUser)
  const role = roleOf(me, env.OWNERS)
  const telegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)

  if (route === 'GET /me') return json({ role, telegram })

  if (pathname.startsWith('/telegram/')) {
    if (role === 'reader') return json({ error: 'forbidden' }, 403)
    const post = parsePost(await request.json().catch(() => null))
    if (!post) return json({ error: 'bad-request' }, 400)
    const messages = formatTopic(post)
    // with a picture the title is its caption
    const caption = post.image ? titleBlock(post) : null
    if (route === 'POST /telegram/preview') return json({ messages, caption })
    try {
      const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env
      if (post.image && caption) await sendPhoto(token, chatId, post.image, caption, deps.fetcher)
      const sent = await sendMessages(token, chatId, messages, deps.fetcher)
      return json({ sent: sent + (post.image ? 1 : 0) })
    } catch (error) {
      const message = error instanceof TelegramError ? error.message : 'Telegram is unreachable'
      return json({ error: 'telegram', message }, 502)
    }
  }

  // the dashboard
  if (role !== 'admin') return json({ error: 'forbidden' }, 403)
  if (route === 'GET /admin/users') return json({ users: await listUsers(env.USERS, env.OWNERS) })

  const uid = decodeURIComponent(pathname.slice('/admin/users/'.length))
  try {
    if (request.method === 'DELETE') {
      await removeUser(env.USERS, env.OWNERS, me, uid)
      return json({ removed: uid })
    }
    const { role: newRole } = ((await request.json().catch(() => ({}))) ?? {}) as { role?: unknown }
    if (!isRole(newRole)) return json({ error: 'bad-request' }, 400)
    return json({ user: await setRole(env.USERS, env.OWNERS, me, uid, newRole) })
  } catch (error) {
    if (!(error instanceof RoleChangeError)) throw error
    return json({ error: error.code }, error.code === 'not-found' ? 404 : 409)
  }
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env)
} satisfies ExportedHandler<Env>
