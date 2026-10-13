import { verifyIdToken, type AuthUser } from './auth'
import { d1Store, HOURLY_LIMIT, parseDraft, type Message, type MessagesStore } from './messages'
import { parsePost } from './post'
import {
  getRoles,
  OWNER_ROLE,
  parseRoles,
  READER,
  roleDefOf,
  setRoles,
  type Manage,
  type RoleDef
} from './roles'
import { formatTopic, sendMessages, sendPhoto, TelegramError, titleBlock } from './telegram'
import { getTypes, parseTypes, setTypes } from './types'
import {
  DIRECTORIES,
  getDirectory,
  getMinistries,
  isPhone,
  listUsers,
  parseMinistries,
  removeUser,
  RoleChangeError,
  roleOf,
  setDirectory,
  setOwnPhone,
  touchUser,
  updateUser,
  type Directory,
  type UserRecord,
  type UsersStore
} from './users'

/**
 * Worker of the Bible app.
 *   GET    /me                      the role and the rights of the signed in user (and remembers the user)
 *   PUT    /me                      { phone: '+380…' | null }: the user's own mobile number
 *   POST   /telegram/preview        the messages a post becomes, and the caption of its picture (nothing is sent)
 *   POST   /telegram/publish        sends the post to the Telegram channel
 *   GET    /types                   the types of notes and topics
 *   GET    /ministries              the ministries of the church
 *   GET    /messages                the messages to and from the user that have not expired
 *   GET    /messages/recipients     whom the user may write to
 *   POST   /messages                { to?, ministries?, roles?, text, attachment?, replyTo? }
 *   POST   /messages/:id/read       marks a message read
 * The dashboard, each part for the roles that have its function (the owners have all):
 *   GET    /admin/settings          the roles, types, ministries and locations
 *   PUT    /admin/roles             { roles }                                        roles
 *   GET    /admin/users             the users who signed in                          users
 *   PUT    /admin/users/:uid        { role?, ministries?, phone? }                   users
 *   DELETE /admin/users/:uid        takes a user off the list                        users
 *   PUT    /admin/directories/:name { items }: 'ministries' or 'locations'           directories
 *   PUT    /admin/types             { types }                                        types
 * Every request carries the Firebase ID token: Authorization: Bearer <token>.
 */
export interface Env {
  /** secret: the token of the bot from @BotFather */
  TELEGRAM_BOT_TOKEN: string
  /** the channel (@name or -100… id); the bot is its administrator */
  TELEGRAM_CHAT_ID: string
  FIREBASE_PROJECT_ID: string
  /** user ids and verified emails of the owners: every right, the dashboard cannot change them */
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
  /^GET \/(types|ministries)$/,
  /^GET \/messages(\/recipients)?$/,
  /^POST \/messages$/,
  /^POST \/messages\/[^/]+\/read$/,
  /^GET \/admin\/(settings|users)$/,
  /^PUT \/admin\/(roles|types)$/,
  /^PUT \/admin\/directories\/(ministries|locations)$/,
  /^(PUT|DELETE) \/admin\/users\/[^/]+$/
]

const DAY = 24 * 60 * 60 * 1000

const nameOf = (record: UserRecord) => record.name ?? record.email ?? record.uid

/** what the people of a role may do; the owners may do everything */
const rightsOf = (roles: RoleDef[], roleId: string) =>
  roleId === 'owner' ? OWNER_ROLE : roleDefOf(roles, roleId)

/** everyone but the readers serves: they get messages and see the ministries (a removed role is a reader) */
const serves = (roles: RoleDef[], roleId: string) =>
  roleId === 'owner' || (roleId !== READER && roles.some((role) => role.id === roleId))

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
  const roles = await getRoles(env.USERS)
  const roleId = roleOf(me, env.OWNERS)
  const rights = rightsOf(roles, roleId)
  const can = (function_: Manage) => rights.manage.includes(function_)
  const telegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
  const body = async () => (await request.json().catch(() => null)) as unknown

  if (route === 'GET /me') {
    return json({
      role: roleId,
      roleName: rights.name,
      telegram,
      ministries: me.ministries ?? [],
      rights: {
        publish: rights.publish,
        send: rights.send,
        sendToPeople: rights.sendToPeople,
        sendToRoles: rights.sendToRoles,
        manage: rights.manage
      },
      canSend: rights.send,
      canReceive: serves(roles, roleId),
      phone: me.phone ?? null,
      // ministers are asked for their mobile number until they give it
      needsPhone: serves(roles, roleId) && !me.phone
    })
  }

  if (route === 'PUT /me') {
    const { phone } = ((await body()) ?? {}) as { phone?: unknown }
    if (phone !== null && !isPhone(phone)) return json({ error: 'bad-request' }, 400)
    const updated = await setOwnPhone(env.USERS, me, phone)
    return json({ phone: updated.phone ?? null })
  }

  // the types of notes and topics: everyone who signed in reads them
  if (route === 'GET /types') return json({ types: await getTypes(env.USERS) })

  if (pathname.startsWith('/telegram/')) {
    if (!rights.publish) return json({ error: 'forbidden' }, 403)
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
    if (!serves(roles, roleId)) return json({ error: 'forbidden' }, 403)
    if (route === 'GET /ministries') return json({ ministries: await getMinistries(env.USERS) })
    return handleMessages(request, env, deps, me, roles, rights, json, body)
  }

  // the dashboard
  if (route === 'GET /admin/settings') {
    if (!rights.manage.length) return json({ error: 'forbidden' }, 403)
    return json({
      roles,
      types: await getTypes(env.USERS),
      ministries: await getDirectory(env.USERS, 'ministries'),
      locations: await getDirectory(env.USERS, 'locations')
    })
  }

  if (route === 'PUT /admin/roles') {
    if (!can('roles')) return json({ error: 'forbidden' }, 403)
    const parsed = parseRoles(((await body()) as { roles?: unknown } | null)?.roles)
    if (!parsed) return json({ error: 'bad-request' }, 400)
    await setRoles(env.USERS, parsed)
    return json({ roles: parsed })
  }

  if (route === 'PUT /admin/types') {
    if (!can('types')) return json({ error: 'forbidden' }, 403)
    const types = parseTypes(((await body()) as { types?: unknown } | null)?.types)
    if (!types) return json({ error: 'bad-request' }, 400)
    await setTypes(env.USERS, types)
    return json({ types })
  }

  const directory = pathname.match(/^\/admin\/directories\/(\w+)$/)?.[1] as Directory | undefined
  if (directory && DIRECTORIES.includes(directory)) {
    if (!can('directories')) return json({ error: 'forbidden' }, 403)
    const items = parseMinistries(((await body()) as { items?: unknown } | null)?.items)
    if (!items) return json({ error: 'bad-request' }, 400)
    await setDirectory(env.USERS, directory, items)
    return json({ items })
  }

  // the users
  if (!can('users')) return json({ error: 'forbidden' }, 403)
  if (route === 'GET /admin/users') {
    return json({
      users: await listUsers(env.USERS, env.OWNERS),
      roles,
      ministries: await getMinistries(env.USERS)
    })
  }

  const uid = decodeURIComponent(pathname.slice('/admin/users/'.length))
  try {
    if (request.method === 'DELETE') {
      await removeUser(env.USERS, env.OWNERS, me, uid)
      return json({ removed: uid })
    }
    const change = ((await body()) ?? {}) as { role?: unknown; ministries?: unknown; phone?: unknown }
    const role =
      typeof change.role === 'string' && roles.some((item) => item.id === change.role) ? change.role : null
    const ministries = change.ministries === undefined ? undefined : parseMinistries(change.ministries)
    const badPhone = change.phone !== undefined && change.phone !== null && !isPhone(change.phone)
    if ((change.role !== undefined && !role) || ministries === null || badPhone) {
      return json({ error: 'bad-request' }, 400)
    }
    if (change.role === undefined && ministries === undefined && change.phone === undefined) {
      return json({ error: 'bad-request' }, 400)
    }
    const user = await updateUser(env.USERS, env.OWNERS, me, uid, {
      ...(role ? { role } : {}),
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
  roles: RoleDef[],
  rights: RoleDef,
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

  // whom the role of the user may write to: anyone who serves, or the people of its roles
  const users = await listUsers(env.USERS, env.OWNERS)
  const reachable = (user: (typeof users)[number]) =>
    user.uid !== me.uid &&
    serves(roles, user.role) &&
    (rights.sendToPeople || rights.sendToRoles.includes(user.role))
  const receivers = rights.send ? users.filter(reachable) : []

  if (pathname === '/messages/recipients') {
    return json({
      people: receivers.map(({ uid, name, email, role, ministries, phone }) => ({
        uid,
        name: name ?? email ?? uid,
        role,
        ministries: ministries ?? [],
        phone: phone ?? null
      })),
      ministries: rights.send ? await getMinistries(env.USERS) : [],
      roles: roles
        .filter((role) => rights.sendToRoles.includes(role.id))
        .map(({ id, name }) => ({ id, name }))
    })
  }

  // POST /messages
  const draft = parseDraft(await body())
  if (!draft) return json({ error: 'bad-request' }, 400)

  let recipients: { uid: string; name: string }[]
  if (rights.send && !draft.replyTo) {
    const chosen = new Set(draft.to)
    const unknown = draft.to.filter((uid) => !receivers.some((user) => user.uid === uid))
    if (unknown.length) return json({ error: 'unknown-recipient' }, 400)
    receivers
      .filter(
        (user) =>
          user.ministries?.some((ministry) => draft.ministries.includes(ministry)) ||
          (draft.roles.includes(user.role) && rights.sendToRoles.includes(user.role))
      )
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
  // the role of the one who writes says how long the messages are kept
  const expiresAt = now + rights.messageDays * DAY
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
    expiresAt,
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
