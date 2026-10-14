import { verifyIdToken, type AuthUser } from './auth'
import {
  getCalendar,
  getEventTypes,
  parseCalendar,
  parseEventTypes,
  setCalendar,
  setEventTypes
} from './eventTypes'
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
import { d1Schedule, localDay, type ScheduleStore } from './schedule'
import { handleSchedule, type ScheduleContext } from './scheduleRoutes'
import {
  answered,
  askOf,
  forgetChat,
  linkUrl,
  rememberChat,
  reply,
  shortDay,
  serviceBot,
  takeLink,
  toast,
  uidOfChat,
  webhookSecret,
  type ButtonsMessage,
  type ServiceBot
} from './serviceBot'
import { formatTopic, sendMessages, sendPhoto, TelegramError, titleBlock } from './telegram'
import { getTypes, parseTypes, setTypes } from './types'
import {
  DIRECTORIES,
  getDirectory,
  getUser,
  getMinistries,
  isPhone,
  listUsers,
  parseMinistries,
  removeUser,
  RoleChangeError,
  roleOf,
  setDirectory,
  setOwnPhone,
  setTelegramChat,
  touchUser,
  updateUser,
  type Directory,
  type UserRecord,
  type UsersStore,
  type UserView
} from './users'

/**
 * Worker of the Bible app.
 *   GET    /me                      the role and the rights of the signed in user (and remembers the user)
 *   PUT    /me                      { phone: '+380…' | null }: the user's own mobile number
 *   POST   /telegram/preview        the messages a post becomes, and the caption of its picture (nothing is sent)
 *   POST   /telegram/publish        sends the post to the Telegram channel
 *   POST   /telegram/link           a one-time link to the service bot: Telegram is linked by Start in it
 *   DELETE /telegram/link           unlinks Telegram
 *   POST   /telegram/webhook        the updates of the service bot (Telegram calls it, with the secret header)
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
  /** secret: the token of the service bot, which writes to the ministers in private (not the channel's bot) */
  SERVICE_BOT_TOKEN?: string
  /** the service chat of the ministers (a channel or a group, the service bot in it): the emergencies */
  SERVICE_CHAT_ID?: string
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
  /** the schedule of ministries; D1 when not given */
  schedule?: ScheduleStore
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
  /^POST \/telegram\/(preview|publish|webhook)$/,
  /^(POST|DELETE) \/telegram\/link$/,
  /^GET \/(types|ministries)$/,
  /^GET \/messages(\/recipients)?$/,
  /^POST \/messages$/,
  /^POST \/messages\/[^/]+\/read$/,
  /^GET \/admin\/(settings|users)$/,
  /^PUT \/admin\/(roles|types|event-types|calendar)$/,
  /^PUT \/admin\/directories\/(ministries|locations)$/,
  /^(PUT|DELETE) \/admin\/users\/[^/]+$/,
  /^GET \/schedule(\/people|\/materials)?$/,
  /^POST \/schedule\/materials$/,
  /^DELETE \/schedule\/materials\/[^/]+$/,
  /^(POST|PUT|DELETE) \/schedule\/events(\/[^/]+)?$/,
  /^(POST|DELETE) \/schedule\/team$/,
  /^POST \/schedule\/invitations$/,
  /^POST \/schedule\/(apply|approve|unapprove|role|answer)$/
]

const DAY = 24 * 60 * 60 * 1000

const nameOf = (record: UserRecord) => record.name ?? record.email ?? record.uid

/** what the people of a role may do; the owners may do everything */
const rightsOf = (roles: RoleDef[], roleId: string) =>
  roleId === 'owner' ? OWNER_ROLE : roleDefOf(roles, roleId)

/** everyone but the readers serves: they get messages and see the ministries (a removed role is a reader) */
const serves = (roles: RoleDef[], roleId: string) =>
  roleId === 'owner' || (roleId !== READER && roles.some((role) => role.id === roleId))

/** the service bot, writing to the linked users of the list */
const botFor = (env: Env, deps: Deps, users: UserView[]): ServiceBot =>
  serviceBot(
    env.SERVICE_BOT_TOKEN,
    env.SERVICE_CHAT_ID,
    env.USERS,
    (uid) => users.find((user) => user.uid === uid)?.telegramChatId,
    deps.fetcher
  )

/** What the schedule needs for one user; null for a user who does not serve (a reader) */
async function scheduleContext(me: UserRecord, env: Env, deps: Deps): Promise<ScheduleContext | null> {
  const roles = await getRoles(env.USERS)
  const roleId = roleOf(me, env.OWNERS)
  if (!serves(roles, roleId)) return null
  const users = await listUsers(env.USERS, env.OWNERS)
  return {
    me,
    rights: rightsOf(roles, roleId),
    servants: users.filter((user) => serves(roles, user.role)),
    planners: users
      .filter((user) => rightsOf(roles, user.role).manage.includes('schedule'))
      .map((user) => user.uid),
    eventTypes: await getEventTypes(env.USERS),
    calendar: await getCalendar(env.USERS),
    schedule: deps.schedule ?? d1Schedule(env.DB),
    messages: deps.messages ?? d1Store(env.DB),
    bot: botFor(env, deps, users),
    now: deps.now?.() ?? Date.now()
  }
}

const NOT_ACTUAL = 'Це запрошення вже неактуальне'
const NOT_LINKED = 'Спершу підключіть Telegram у застосунку: меню аватара → «Підключити Telegram»'
const NOT_YOURS = 'Це запрошення не вам'

/**
 * The updates of the service bot: /start <token> links the chat to the user of the token, /stop unlinks it,
 * a button of an invitation answers it as the app would (the backup takes the place, or an emergency).
 */
async function handleWebhook(
  request: Request,
  env: Env,
  deps: Deps,
  json: (body: unknown, status?: number) => Response
): Promise<Response> {
  const token = env.SERVICE_BOT_TOKEN
  if (!token || request.headers.get('x-telegram-bot-api-secret-token') !== (await webhookSecret(token)))
    return json({ error: 'forbidden' }, 403)
  const update = (await request.json().catch(() => null)) as {
    message?: { chat: { id: number; type: string }; text?: string; from?: { first_name?: string } }
    callback_query?: {
      id: string
      data?: string
      from: { id: number }
      message?: ButtonsMessage
    }
  } | null
  const { fetcher } = deps
  const store = env.USERS

  const message = update?.message
  if (message?.chat.type === 'private' && typeof message.text === 'string') {
    const chatId = message.chat.id
    const [command, argument] = message.text.trim().split(/\s+/)
    if (command === '/start' && argument) {
      const uid = await takeLink(store, argument)
      const record = uid ? await getUser(store, uid) : null
      if (!record) {
        await reply(
          token,
          fetcher,
          chatId,
          'Посилання застаріло. Відкрийте застосунок і натисніть «Підключити Telegram» ще раз.'
        )
        return json({ ok: true })
      }
      // one chat for a user, one user for a chat
      if (record.telegramChatId && record.telegramChatId !== chatId)
        await forgetChat(store, record.telegramChatId)
      const previous = await uidOfChat(store, chatId)
      const other = previous && previous !== record.uid ? await getUser(store, previous) : null
      if (other) await setTelegramChat(store, other, null)
      await setTelegramChat(store, record, chatId)
      await rememberChat(store, chatId, record.uid)
      await reply(
        token,
        fetcher,
        chatId,
        `Готово${record.name ? `, ${record.name}` : ''}! Сюди приходитимуть запрошення на служіння (відповісти можна кнопками) і повідомлення застосунку. Відключити: /stop`
      )
    } else if (command === '/stop') {
      const uid = await uidOfChat(store, chatId)
      const record = uid ? await getUser(store, uid) : null
      if (record) await setTelegramChat(store, record, null)
      await forgetChat(store, chatId)
      await reply(token, fetcher, chatId, 'Telegram відключено. Підключити знову можна в застосунку.')
    } else {
      await reply(
        token,
        fetcher,
        chatId,
        'Це службовий бот церкви. Підключіть його в застосунку: меню аватара → «Підключити Telegram».'
      )
    }
    return json({ ok: true })
  }

  const callback = update?.callback_query
  if (callback?.data) {
    // a private chat, or the service channel; who pressed is told by their own private chat with the bot
    const chatId = callback.message?.chat.id ?? callback.from.id
    const [key = '', choice] = callback.data.split('|')
    const ask = await askOf(store, key, chatId)
    const uid = await uidOfChat(store, callback.from.id)
    const me = uid ? await getUser(store, uid) : null
    const context = me ? await scheduleContext(me, env, deps) : null
    if (!ask || (me && !context)) {
      await toast(token, fetcher, callback.id, NOT_ACTUAL)
      return json({ ok: true })
    }
    if (!me || !context) {
      await toast(token, fetcher, callback.id, NOT_LINKED)
      return json({ ok: true })
    }
    const confirm = choice === 'c'
    const answer = new Request(new URL('/schedule/answer', request.url), {
      method: 'POST',
      body: JSON.stringify({
        eventId: ask.eventId,
        day: ask.day,
        uid: ask.uid,
        as: ask.as,
        answer: confirm ? 'confirm' : 'decline',
        reason: confirm ? undefined : 'Відповідь через Telegram'
      })
    })
    const response = await handleSchedule(answer, context, json)
    if (!response.ok) {
      await toast(token, fetcher, callback.id, response.status === 403 ? NOT_YOURS : NOT_ACTUAL)
      return json({ ok: true })
    }
    // the message gets a line of the answer: in the channel with the name, everybody sees it
    const name = me.name ?? me.email ?? ''
    const channel = chatId !== callback.from.id
    const what = confirm ? (ask.as === 'backup' ? 'згоден(на) бути дублером' : 'підтвердив(ла)') : 'не може'
    const line = `${confirm ? '✅' : '❌'} ${shortDay(ask.day)}: ${channel ? `${name} ${what}` : confirm ? 'підтверджено' : 'відмову передано відповідальному'}`
    await answered(
      token,
      fetcher,
      callback.id,
      callback.message,
      callback.data,
      confirm ? '✅ Підтверджено. Дякуємо!' : '❌ Відмову передано відповідальному',
      line
    )
  }
  return json({ ok: true })
}

export async function handle(request: Request, env: Env, deps: Deps = defaultDeps): Promise<Response> {
  const cors = corsHeaders(request, env)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const { pathname } = new URL(request.url)
  const route = `${request.method} ${pathname}`
  if (!ROUTES.some((pattern) => pattern.test(route))) return json({ error: 'not-found' }, 404)

  // Telegram calls the webhook with its secret header, not with a user's token
  if (route === 'POST /telegram/webhook') return handleWebhook(request, env, deps, json)

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
        approve: rights.approve,
        invite: rights.invite,
        manage: rights.manage
      },
      canSend: rights.send,
      canReceive: serves(roles, roleId),
      phone: me.phone ?? null,
      // the service bot: offered to the ministers, and whether the user linked it
      serviceBot: Boolean(env.SERVICE_BOT_TOKEN) && serves(roles, roleId),
      telegramLinked: Boolean(me.telegramChatId),
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

  if (pathname === '/telegram/link') {
    if (!env.SERVICE_BOT_TOKEN || !serves(roles, roleId)) return json({ error: 'forbidden' }, 403)
    if (request.method === 'DELETE') {
      if (me.telegramChatId) await forgetChat(env.USERS, me.telegramChatId)
      await setTelegramChat(env.USERS, me, null)
      return json({ linked: false })
    }
    const webhook = new URL('/telegram/webhook', request.url).toString()
    const url = await linkUrl(env.SERVICE_BOT_TOKEN, env.USERS, me.uid, webhook, deps.fetcher)
    return url ? json({ url }) : json({ error: 'telegram' }, 502)
  }

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

  if (pathname.startsWith('/schedule')) {
    const context = await scheduleContext(me, env, deps)
    return context ? handleSchedule(request, context, json) : json({ error: 'forbidden' }, 403)
  }

  if (pathname.startsWith('/messages') || route === 'GET /ministries') {
    if (!serves(roles, roleId)) return json({ error: 'forbidden' }, 403)
    if (route === 'GET /ministries') {
      // the locations too: the schedule chooses from them
      return json({
        ministries: await getMinistries(env.USERS),
        locations: await getDirectory(env.USERS, 'locations')
      })
    }
    return handleMessages(request, env, deps, me, roles, rights, json, body)
  }

  // the dashboard
  if (route === 'GET /admin/settings') {
    if (!rights.manage.length) return json({ error: 'forbidden' }, 403)
    return json({
      roles,
      types: await getTypes(env.USERS),
      ministries: await getDirectory(env.USERS, 'ministries'),
      locations: await getDirectory(env.USERS, 'locations'),
      eventTypes: await getEventTypes(env.USERS),
      calendar: await getCalendar(env.USERS)
    })
  }

  // the types of events and the settings of the calendar: the ones who plan the schedule
  if (route === 'PUT /admin/event-types') {
    if (!can('schedule')) return json({ error: 'forbidden' }, 403)
    const eventTypes = parseEventTypes(((await body()) as { eventTypes?: unknown } | null)?.eventTypes)
    if (!eventTypes) return json({ error: 'bad-request' }, 400)
    await setEventTypes(env.USERS, eventTypes)
    return json({ eventTypes })
  }

  if (route === 'PUT /admin/calendar') {
    if (!can('schedule')) return json({ error: 'forbidden' }, 403)
    const calendar = parseCalendar(((await body()) as { calendar?: unknown } | null)?.calendar)
    if (!calendar) return json({ error: 'bad-request' }, 400)
    await setCalendar(env.USERS, calendar)
    return json({ calendar })
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
  // the same in Telegram for the linked ones: the text, and what is attached
  const bot = botFor(env, deps, users)
  const attached = draft.attachment
    ? `

📎 ${draft.attachment.post.title || (draft.attachment.kind === 'topic' ? 'Тема' : 'Нотатка')} — у застосунку`
    : ''
  await Promise.all(
    messages.map((message) =>
      bot.send(
        message.toUid,
        `✉ ${message.fromName}:
${message.text}${attached}`
      )
    )
  )
  return json({ sent: messages.length })
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
  // once a day: the expired messages and the past events go
  scheduled: async (_event: ScheduledController, env: Env) => {
    await d1Store(env.DB).deleteExpired(Date.now())
    await d1Schedule(env.DB).deletePast(localDay(Date.now()))
  }
} satisfies ExportedHandler<Env>
