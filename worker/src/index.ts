import { verifyIdToken, type AuthUser } from './auth'
import { d1Store, HOURLY_LIMIT, MESSAGE_LIFE, parseDraft, type Message, type MessagesStore } from './messages'
import { parsePost } from './post'
import { formatTopic, sendMessages, sendPhoto, TelegramError, titleBlock } from './telegram'
import {
  getMinistries,
  isPhone,
  isRole,
  listUsers,
  parseMinistries,
  removeUser,
  RoleChangeError,
  roleOf,
  setMinistries,
  setOwnPhone,
  touchUser,
  updateUser,
  type Role,
  type UserRecord,
  type UsersStore
} from './users'

/**
 * Worker of the Bible app.
 *   GET    /me                   the role of the signed in user (and remembers the user)
 *   PUT    /me                   { phone: '+380…' | null }: the user's own mobile number
 *   POST   /telegram/preview     the messages a post becomes, and the caption of its picture (nothing is sent)
 *   POST   /telegram/publish     sends the post to the Telegram channel
 *   GET    /admin/users          users who signed in, with their roles and ministries
 *   PUT    /admin/users/:uid     { role?: 'reader' | 'publisher' | 'admin', ministries?: string[] }
 *   DELETE /admin/users/:uid     takes a user off the list
 *   GET    /ministries           the ministries of the church
 *   PUT    /admin/ministries     { ministries: string[] }
 *   GET    /messages             the messages of the last day, to and from the user
 *   GET    /messages/recipients  whom the user may write to
 *   POST   /messages             { to?, ministries?, text, attachment?, replyTo? }
 *   POST   /messages/:id/read    marks a message read
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
  DB: D1Database
}

export interface Deps {
  verify: (token: string, projectId: string) => Promise<AuthUser>
  fetcher: typeof fetch
  /** the messages; D1 when not given */
  messages?: MessagesStore
  now?: () => number
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
  /^(GET|PUT) \/me$/,
  /^POST \/telegram\/(preview|publish)$/,
  /^GET \/admin\/users$/,
  /^(PUT|DELETE) \/admin\/users\/[^/]+$/,
  /^GET \/ministries$/,
  /^PUT \/admin\/ministries$/,
  /^GET \/messages(\/recipients)?$/,
  /^POST \/messages$/,
  /^POST \/messages\/[^/]+\/read$/
]

/** publishers and administrators write to people and ministries */
const canSend = (role: Role) => role !== 'reader'
/** they and the members of ministries get messages */
const canReceive = (record: UserRecord, role: Role) => role !== 'reader' || Boolean(record.ministries?.length)

const nameOf = (record: UserRecord) => record.name ?? record.email ?? record.uid

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
  const body = async () => (await request.json().catch(() => null)) as unknown

  if (route === 'GET /me') {
    return json({
      role,
      telegram,
      ministries: me.ministries ?? [],
      canSend: canSend(role),
      canReceive: canReceive(me, role),
      phone: me.phone ?? null,
      // ministers are asked for their mobile number until they give it
      needsPhone: canReceive(me, role) && !me.phone
    })
  }

  if (route === 'PUT /me') {
    const { phone } = ((await body()) ?? {}) as { phone?: unknown }
    if (phone !== null && !isPhone(phone)) return json({ error: 'bad-request' }, 400)
    const updated = await setOwnPhone(env.USERS, me, phone)
    return json({ phone: updated.phone ?? null })
  }

  if (pathname.startsWith('/telegram/')) {
    if (role === 'reader') return json({ error: 'forbidden' }, 403)
    const post = parsePost(await body())
    if (!post) return json({ error: 'bad-request' }, 400)
    const messages = formatTopic(post)
    // with a picture the title is its caption
    const caption = post.image ? titleBlock(post) : null
    if (route === 'POST /telegram/preview') return json({ messages, caption })
    try {
      const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env
      if (post.image && caption !== null) await sendPhoto(token, chatId, post.image, caption, deps.fetcher)
      const sent = await sendMessages(token, chatId, messages, deps.fetcher)
      return json({ sent: sent + (post.image ? 1 : 0) })
    } catch (error) {
      const message = error instanceof TelegramError ? error.message : 'Telegram is unreachable'
      return json({ error: 'telegram', message }, 502)
    }
  }

  if (pathname.startsWith('/messages') || route === 'GET /ministries') {
    if (!canReceive(me, role)) return json({ error: 'forbidden' }, 403)
    if (route === 'GET /ministries') return json({ ministries: await getMinistries(env.USERS) })
    return handleMessages(request, env, deps, me, role, json, body)
  }

  // the dashboard
  if (role !== 'admin') return json({ error: 'forbidden' }, 403)
  if (route === 'GET /admin/users') {
    return json({ users: await listUsers(env.USERS, env.OWNERS), ministries: await getMinistries(env.USERS) })
  }
  if (route === 'PUT /admin/ministries') {
    const ministries = parseMinistries(((await body()) as { ministries?: unknown } | null)?.ministries)
    if (!ministries) return json({ error: 'bad-request' }, 400)
    await setMinistries(env.USERS, ministries)
    return json({ ministries })
  }

  const uid = decodeURIComponent(pathname.slice('/admin/users/'.length))
  try {
    if (request.method === 'DELETE') {
      await removeUser(env.USERS, env.OWNERS, me, uid)
      return json({ removed: uid })
    }
    const change = ((await body()) ?? {}) as { role?: unknown; ministries?: unknown; phone?: unknown }
    const ministries = change.ministries === undefined ? undefined : parseMinistries(change.ministries)
    const badPhone = change.phone !== undefined && change.phone !== null && !isPhone(change.phone)
    if ((change.role !== undefined && !isRole(change.role)) || ministries === null || badPhone) {
      return json({ error: 'bad-request' }, 400)
    }
    if (change.role === undefined && ministries === undefined && change.phone === undefined) {
      return json({ error: 'bad-request' }, 400)
    }
    const user = await updateUser(env.USERS, env.OWNERS, me, uid, {
      ...(isRole(change.role) ? { role: change.role } : {}),
      ...(ministries ? { ministries } : {}),
      ...(change.phone !== undefined ? { phone: change.phone as string | null } : {})
    })
    return json({ user })
  } catch (error) {
    if (!(error instanceof RoleChangeError)) throw error
    return json({ error: error.code }, error.code === 'not-found' ? 404 : 409)
  }
}

async function handleMessages(
  request: Request,
  env: Env,
  deps: Deps,
  me: UserRecord,
  role: Role,
  json: (body: unknown, status?: number) => Response,
  body: () => Promise<unknown>
): Promise<Response> {
  const store = deps.messages ?? d1Store(env.DB)
  const now = deps.now?.() ?? Date.now()
  const { pathname } = new URL(request.url)

  if (request.method === 'GET' && pathname === '/messages') {
    const messages = await store.forUser(me.uid, now)
    const unread = messages.filter((m) => m.toUid === me.uid && !m.readAt).length
    return json({ messages, unread })
  }

  const read = pathname.match(/^\/messages\/([^/]+)\/read$/)
  if (read) {
    await store.markRead(decodeURIComponent(read[1]!), me.uid, now)
    return json({ read: true })
  }

  // the people who get messages: publishers, administrators and the members of ministries
  const users = await listUsers(env.USERS, env.OWNERS)
  const receivers = users.filter((user) => user.uid !== me.uid && canReceive(user, user.role))

  if (pathname === '/messages/recipients') {
    if (!canSend(role)) return json({ people: [], ministries: [] })
    return json({
      people: receivers.map(({ uid, name, email, role: userRole, ministries, phone }) => ({
        uid,
        name: name ?? email ?? uid,
        role: userRole,
        ministries: ministries ?? [],
        phone: phone ?? null
      })),
      ministries: await getMinistries(env.USERS)
    })
  }

  // POST /messages
  const draft = parseDraft(await body())
  if (!draft) return json({ error: 'bad-request' }, 400)

  let recipients: { uid: string; name: string }[]
  if (canSend(role) && !draft.replyTo) {
    const chosen = new Set(draft.to)
    const unknown = draft.to.filter((uid) => !receivers.some((user) => user.uid === uid))
    if (unknown.length) return json({ error: 'unknown-recipient' }, 400)
    receivers
      .filter((user) => user.ministries?.some((ministry) => draft.ministries.includes(ministry)))
      .forEach((user) => chosen.add(user.uid))
    recipients = receivers
      .filter((user) => chosen.has(user.uid))
      .map((user) => ({ uid: user.uid, name: nameOf(user) }))
  } else {
    // an answer goes to the one who wrote, and only to a message the user got
    const original = draft.replyTo ? await store.get(draft.replyTo) : null
    if (!original || original.toUid !== me.uid || original.expiresAt <= now)
      return json({ error: 'forbidden' }, 403)
    recipients = [{ uid: original.fromUid, name: original.fromName }]
  }
  if (!recipients.length) return json({ error: 'no-recipients' }, 400)

  if ((await store.sentSince(me.uid, now - 60 * 60 * 1000)) + recipients.length > HOURLY_LIMIT) {
    return json({ error: 'too-many' }, 429)
  }

  await store.deleteExpired(now)
  const messages: Message[] = recipients.map(({ uid, name }) => ({
    id: crypto.randomUUID(),
    fromUid: me.uid,
    fromName: nameOf(me),
    toUid: uid,
    toName: name,
    text: draft.text,
    attachment: draft.attachment,
    replyTo: draft.replyTo,
    createdAt: now,
    expiresAt: now + MESSAGE_LIFE,
    readAt: null
  }))
  await store.insert(messages)
  return json({ sent: messages.length })
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
  // once a day: the expired messages go
  scheduled: async (_event: ScheduledController, env: Env) => d1Store(env.DB).deleteExpired(Date.now())
} satisfies ExportedHandler<Env>
