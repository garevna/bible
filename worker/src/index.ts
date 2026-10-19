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
  effectiveRights,
  SUPERVISOR,
  type RoleDef,
  type Rights
} from './roles'
import { d1Schedule, localDay, type ScheduleStore } from './schedule'
import { cached, remoteBooks, remoteChapter, REMOTE_BIBLES, RemoteError } from './remoteBible'
import { handleSchedule, type ScheduleContext } from './scheduleRoutes'
import {
  type Ask,
  answered,
  chatTitle,
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
import {
  getGroups,
  getGroupsVisibility,
  newGroup,
  parseGroupHead,
  parseLeaderChange,
  publicGroup,
  setGroups,
  setGroupsVisibility,
  type HomeGroup
} from './groups'
import { getHandovers, parseUntil, renameHandover, setHandovers, type Handovers } from './handovers'
import {
  byLeader,
  deputiesOf,
  roleLeadersOf,
  getMinistryRoles,
  leadersOf,
  ministryRightsOf,
  parseMinistryRoles,
  renameMinistry,
  setMinistryRoles,
  type MinistryRoles
} from './ministryRoles'
import { escape, formatTopic, sendMessages, sendPhoto, TelegramError, titleBlock } from './telegram'
import { getTypes, parseTypes, setTypes } from './types'
import {
  DIRECTORIES,
  getAddresses,
  getDirectory,
  getTranslationMinistries,
  getUser,
  getMinistries,
  isPhone,
  listUsers,
  parseAddresses,
  parseMinistries,
  removeUser,
  renameUsersMinistry,
  RoleChangeError,
  roleOf,
  setAddresses,
  setDirectory,
  setTranslationMinistries,
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
 *   DELETE /messages                { ids }: the messages are hidden from the user (the other side keeps them)
 *   GET    /groups                  the home groups the user may see (the private part: their leaders, the supervisors)
 *   POST   /groups                  { name, leaderUid }: a new home group           directories
 *   PUT    /groups/:id              its leader: the day, the place, the members…; directories: the name, the leader
 *   DELETE /groups/:id              removes it                                       directories
 *   PUT    /groups-visibility       { visibility: 'servants' | 'admins' }            directories
 *   POST   /handover                { ministry, toUid, until? }: the leader (or an administrator) asks a deputy
 *   POST   /handover/answer         { ministry, answer: 'accept' | 'decline' }: the deputy answers
 *   DELETE /handover                { ministry }: the duties go back (the leader, the deputy, an administrator)
 *   GET    /ministry-roles          the roles of the ministries the user leads (all: the keepers of the directories)
 *   PUT    /ministry-roles/:name    { roles }: a leader gives the roles of the ministry, not the leaders
 * The dashboard, each part for the statuses that have its function (the owners have all):
 *   GET    /admin/settings          the statuses, types, ministries and their roles, locations
 *   PUT    /admin/roles             { roles }: the four statuses                     roles
 *   GET    /admin/users             the users who signed in                          users
 *   PUT    /admin/users/:uid        { role?, ministries?, phone?, name? }            users (a supervisor: by a supervisor)
 *   DELETE /admin/users/:uid        takes a user off the list                        users
 *   PUT    /admin/directories/:name { items }: 'ministries' or 'locations'           directories
 *   PUT    /admin/ministry-roles    { ministryRoles }: the roles in the ministries    directories
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
  /** the key of the app on the YouVersion Platform: the translations read online (remoteBible.ts) */
  YOUR_VERSION_API_KEY?: string
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
  /^GET \/bible\/[a-z]+\/books$/,
  /^GET \/bible\/[a-z]+\/[01]\/\d{1,2}\/\d{1,3}$/,
  /^(GET|PUT) \/me$/,
  /^POST \/telegram\/(preview|publish|webhook)$/,
  /^(POST|DELETE) \/telegram\/link$/,
  /^GET \/(types|ministries)$/,
  /^GET \/messages(\/recipients)?$/,
  /^POST \/messages$/,
  /^POST \/messages\/[^/]+\/read$/,
  /^DELETE \/messages$/,
  /^(GET|POST) \/groups$/,
  /^(PUT|DELETE) \/groups\/[^/]+$/,
  /^PUT \/groups-visibility$/,
  /^(POST|DELETE) \/handover$/,
  /^POST \/handover\/answer$/,
  /^GET \/ministry-roles$/,
  /^PUT \/ministry-roles\/[^/]+$/,
  /^PUT \/admin\/directories\/(ministries|locations)\/rename$/,
  /^GET \/admin\/(settings|users)$/,
  /^PUT \/admin\/(roles|types|event-types|calendar|ministry-roles|addresses|translation-ministries)$/,
  /^PUT \/admin\/directories\/(ministries|locations)$/,
  /^(PUT|DELETE) \/admin\/users\/[^/]+$/,
  /^GET \/schedule(\/people|\/materials)?$/,
  /^POST \/schedule\/materials$/,
  /^DELETE \/schedule\/materials\/[^/]+$/,
  /^(POST|PUT|DELETE) \/schedule\/events(\/[^/]+)?$/,
  /^(POST|DELETE) \/schedule\/team$/,
  /^POST \/schedule\/invitations$/,
  /^POST \/schedule\/(apply|approve|unapprove|role|answer|announce|guest)$/,
  /^PUT \/schedule\/days$/
]

const DAY = 24 * 60 * 60 * 1000

const nameOf = (record: UserRecord) => record.name ?? record.email ?? record.uid

/** what the people of a role may do; the owners may do everything */
const rightsOf = (roles: RoleDef[], roleId: string) =>
  roleId === 'owner' ? OWNER_ROLE : roleDefOf(roles, roleId)

/** what a user may do: their status, and their roles in the ministries */
const rightsFor = (
  roles: RoleDef[],
  ministryRoles: MinistryRoles,
  roleId: string,
  uid: string,
  handovers: Handovers = {}
): Rights => effectiveRights(rightsOf(roles, roleId), ministryRightsOf(ministryRoles, uid, handovers))

/**
 * A notice of the app from the user to some people, and the same in Telegram for the linked ones
 * (with buttons for the asks); it is kept a week
 */
async function tell(env: Env, deps: Deps, me: UserRecord, uids: string[], text: string, asks?: Ask[]) {
  const to = [...new Set(uids)].filter((uid) => uid !== me.uid)
  if (!to.length) return
  const users = await listUsers(env.USERS, env.OWNERS, true)
  const now = deps.now?.() ?? Date.now()
  const nameOfUid = (uid: string) => {
    const user = users.find((item) => item.uid === uid)
    return user?.name ?? user?.email ?? uid
  }
  const list: Message[] = to.map((uid) => ({
    id: crypto.randomUUID(),
    fromUid: me.uid,
    fromName: nameOf(me),
    toUid: uid,
    toName: nameOfUid(uid),
    text,
    attachment: null,
    replyTo: null,
    asks: null,
    createdAt: now,
    expiresAt: now + 7 * DAY,
    readAt: null
  }))
  await (deps.messages ?? d1Store(env.DB)).insert(list)
  const bot = botFor(env, deps, users)
  await Promise.all(to.map((uid) => bot.send(uid, escape(text), asks)))
}

/** "до 1 листопада 2026 р." of a last day, or nothing */
const untilText = (until: string | null) =>
  until
    ? ` до ${new Intl.DateTimeFormat('uk', { dateStyle: 'full', timeZone: 'UTC' })
        .format(new Date(`${until}T12:00:00Z`))
        .split(', ')
        .slice(1)
        .join(', ')}`
    : ''

/** The deputy answers a handover: accepted, the deputy leads; declined, it is gone */
async function answerHandover(
  env: Env,
  deps: Deps,
  me: UserRecord,
  ministry: string,
  accept: boolean
): Promise<'ok' | 'not-found'> {
  const today = localDay(deps.now?.() ?? Date.now())
  const handovers = await getHandovers(env.USERS, today)
  const handover = handovers[ministry]
  if (!handover || handover.toUid !== me.uid || handover.status !== 'pending') return 'not-found'
  if (accept) {
    await setHandovers(env.USERS, { ...handovers, [ministry]: { ...handover, status: 'accepted' } })
    await tell(
      env,
      deps,
      me,
      [handover.fromUid, handover.byUid],
      `✅ ${nameOf(me)} прийняв(ла) обов'язки лідера служіння «${ministry}»${untilText(handover.until)}.`
    )
  } else {
    const { [ministry]: _gone, ...rest } = handovers
    await setHandovers(env.USERS, rest)
    await tell(
      env,
      deps,
      me,
      [handover.fromUid, handover.byUid],
      `❌ ${nameOf(me)} не може прийняти обов'язки лідера служіння «${ministry}». Попросіть іншого заступника.`
    )
  }
  return 'ok'
}

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

/**
 * What the schedule needs for one user; null for a user who does not serve (a reader), unless readers
 * are let in (to see and apply to the open events for everyone)
 */
async function scheduleContext(
  me: UserRecord,
  env: Env,
  deps: Deps,
  readers = false
): Promise<ScheduleContext | null> {
  const roles = await getRoles(env.USERS)
  const roleId = roleOf(me, env.OWNERS)
  const reader = !serves(roles, roleId)
  if (reader && !readers) return null
  // the owners serve too: they are invited, and get the notices
  const users = await listUsers(env.USERS, env.OWNERS, true)
  const ministryRoles = await getMinistryRoles(env.USERS)
  const handovers = await getHandovers(env.USERS, localDay(deps.now?.() ?? Date.now()))
  return {
    me,
    rights: rightsFor(roles, ministryRoles, roleId, me.uid, handovers),
    servants: users.filter((user) => serves(roles, user.role)),
    planners: users
      .filter((user) => rightsOf(roles, user.role).manage.includes('schedule'))
      .map((user) => user.uid),
    eventTypes: await getEventTypes(env.USERS),
    calendar: await getCalendar(env.USERS),
    schedule: deps.schedule ?? d1Schedule(env.DB),
    messages: deps.messages ?? d1Store(env.DB),
    bot: botFor(env, deps, users),
    leaders: leadersOf(ministryRoles, handovers),
    addresses: await getAddresses(env.USERS),
    reader,
    now: deps.now?.() ?? Date.now()
  }
}

/**
 * A location or a ministry gets another name, everywhere it is: the list, the events (and the changes
 * of days), the addresses of the locations; the leaders, the ministries of the users, the ministries
 * the roles invite to, the types of events
 */
async function renameEverywhere(env: Env, deps: Deps, directory: Directory, from: string, to: string) {
  const store = env.USERS
  const swap = <T>(record: Record<string, T>) =>
    Object.fromEntries(Object.entries(record).map(([key, value]) => [key === from ? to : key, value]))
  const items = await getDirectory(store, directory)
  await setDirectory(
    store,
    directory,
    items.map((item) => (item === from ? to : item))
  )
  await (deps.schedule ?? d1Schedule(env.DB)).rename(
    directory === 'locations' ? 'location' : 'ministry',
    from,
    to
  )
  if (directory === 'locations') {
    await setAddresses(store, swap(await getAddresses(store)))
    return
  }
  await setMinistryRoles(store, renameMinistry(await getMinistryRoles(store), from, to))
  await setHandovers(store, renameHandover(await getHandovers(store, '0000-00-00'), from, to))
  await setTranslationMinistries(
    store,
    (await getTranslationMinistries(store)).map((item) => (item === from ? to : item))
  )
  await renameUsersMinistry(store, env.OWNERS, from, to)
  const roles = await getRoles(store)
  await setRoles(
    store,
    roles.map((role) => ({ ...role, invite: role.invite.map((item) => (item === from ? to : item)) }))
  )
  const types = await getEventTypes(store)
  await setEventTypes(
    store,
    types.map((type) => (type.ministry === from ? { ...type, ministry: to } : type))
  )
}

/** The books, or one chapter, of a translation read online (see remoteBible.ts) */
async function handleRemoteBible(
  pathname: string,
  request: Request,
  env: Env,
  deps: Deps,
  json: (body: unknown, status?: number) => Response
): Promise<Response> {
  const [, , translation = '', ...rest] = pathname.split('/')
  const id = REMOTE_BIBLES[translation]
  const key = env.YOUR_VERSION_API_KEY
  if (!id || !key) return json({ error: 'not-found' }, 404)
  try {
    const answer = await cached(request, async () => {
      const books = await remoteBooks(id, key, deps.fetcher)
      if (rest[0] === 'books') return json(books)
      const [covenant, book, chapter] = rest.map(Number) as [number, number, number]
      const code = books.covenants[covenant]?.books[book]?.code
      if (!code || chapter >= (books.covenants[covenant]!.books[book]!.chapters.length ?? 0))
        return json({ error: 'not-found' }, 404)
      return json({ verses: await remoteChapter(id, code, chapter, key, deps.fetcher) })
    })
    // the cached answer keeps the headers of its first request: these are for this one
    const headers = new Headers(answer.headers)
    for (const [name, value] of Object.entries(corsHeaders(request, env))) headers.set(name, value)
    return new Response(answer.body, { status: answer.status, headers })
  } catch (error) {
    if (error instanceof RemoteError) return json({ error: 'remote', status: error.status }, 502)
    throw error
  }
}

/** a button under the field of the chat: Telegram sends the number of the user's own account */
const ASK_PHONE = {
  keyboard: [[{ text: '📱 Поділитися номером', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true
}

const NOT_ACTUAL = 'Це запрошення вже неактуальне'
const NOT_LINKED = 'Спершу підключіть Telegram у застосунку: меню аватара → «Підключити Telegram»'
const NOT_YOURS = 'Це запрошення не вам'
const NOT_MINISTRY = 'Заявки приймаються від учасників цього служіння'
const ALREADY = 'Ви вже в команді цього дня'

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
    message?: {
      chat: { id: number; type: string }
      text?: string
      from?: { id: number; first_name?: string }
      contact?: { phone_number: string; user_id?: number }
    }
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
  if (message?.chat.type === 'private') {
    const chatId = message.chat.id
    /** the chat becomes the user's: one chat for a user, one user for a chat */
    const link = async (record: UserRecord) => {
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
        `Готово, ${record.name ?? record.email ?? 'ви підключені'}! Сюди приходитимуть запрошення на служіння (відповісти можна кнопками, і тут, і в службовому каналі) та повідомлення застосунку.\nХто я для бота: /me. Відключити: /stop`,
        { remove_keyboard: true }
      )
    }

    // the number of the user's own account: the minister of the app with that number
    if (message.contact) {
      if (message.contact.user_id !== message.from?.id) {
        await reply(
          token,
          fetcher,
          chatId,
          'Надішліть, будь ласка, власний номер — кнопкою нижче.',
          ASK_PHONE
        )
        return json({ ok: true })
      }
      const phone = `+${message.contact.phone_number.replace(/\D/g, '')}`
      const found = (await listUsers(store, env.OWNERS, true)).filter((user) => user.phone === phone)
      if (found.length === 1) await link(found[0]!)
      else
        await reply(
          token,
          fetcher,
          chatId,
          found.length
            ? 'Цей номер є в кількох користувачів застосунку. Підключіться, будь ласка, через застосунок: меню аватара → «Підключити Telegram».'
            : `Номер ${phone} не знайдено в застосунку. Перевірте його там (меню аватара → «Номер мобільного») і надішліть ще раз, або підключіться через застосунок: меню аватара → «Підключити Telegram».`,
          found.length ? { remove_keyboard: true } : ASK_PHONE
        )
      return json({ ok: true })
    }

    const [command, argument] = (message.text ?? '').trim().split(/\s+/)
    if (command === '/start' && argument) {
      const uid = await takeLink(store, argument)
      const record = uid ? await getUser(store, uid) : null
      if (record) await link(record)
      else
        await reply(
          token,
          fetcher,
          chatId,
          'Посилання застаріло. Можна підключитися за номером телефону — кнопкою нижче.',
          ASK_PHONE
        )
    } else if (command === '/stop') {
      const uid = await uidOfChat(store, chatId)
      const record = uid ? await getUser(store, uid) : null
      if (record) await setTelegramChat(store, record, null)
      await forgetChat(store, chatId)
      await reply(token, fetcher, chatId, 'Telegram відключено. Підключити знову — кнопкою нижче.', ASK_PHONE)
    } else {
      const uid = await uidOfChat(store, chatId)
      const record = uid ? await getUser(store, uid) : null
      await reply(
        token,
        fetcher,
        chatId,
        record
          ? `Ви підключені як: ${record.name ?? record.email}${record.phone ? ` (${record.phone})` : ''}. Не ви? Відключіться (/stop) і підключіться знову.`
          : 'Це службовий бот церкви. Щоб отримувати запрошення на служіння й відповідати на них, поділіться номером телефону — кнопкою нижче. Він має збігатися з номером у застосунку.',
        record ? undefined : ASK_PHONE
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
    // an open call for everyone: the readers apply too
    const context = me ? await scheduleContext(me, env, deps, ask?.as === 'apply') : null
    if (!ask || (me && !context)) {
      await toast(token, fetcher, callback.id, NOT_ACTUAL)
      return json({ ok: true })
    }
    if (!me || !context) {
      await toast(token, fetcher, callback.id, NOT_LINKED)
      return json({ ok: true })
    }
    const name = me.name ?? me.email ?? ''

    // the duties of a leader: the deputy accepts them or not
    if (ask.as === 'handover') {
      if (ask.uid !== me.uid) {
        await toast(token, fetcher, callback.id, NOT_YOURS)
        return json({ ok: true })
      }
      const accept = choice === 'c'
      const result = await answerHandover(env, deps, me, ask.eventId, accept)
      if (result !== 'ok') {
        await toast(token, fetcher, callback.id, NOT_ACTUAL)
        return json({ ok: true })
      }
      await answered(
        token,
        fetcher,
        callback.id,
        callback.message,
        callback.data,
        accept ? "✅ Обов'язки прийнято. Дякуємо!" : '❌ Відмову передано лідеру',
        accept ? "✅ Обов'язки прийнято" : '❌ Відмову передано'
      )
      return json({ ok: true })
    }

    // an open call: whoever of the ministry applies; the button stays for the others
    if (ask.as === 'apply') {
      const apply = new Request(new URL('/schedule/apply', request.url), {
        method: 'POST',
        body: JSON.stringify({ eventId: ask.eventId, day: ask.day })
      })
      const response = await handleSchedule(apply, context, json)
      if (!response.ok) {
        const notice = { 403: NOT_MINISTRY, 409: ALREADY }[response.status] ?? NOT_ACTUAL
        await toast(token, fetcher, callback.id, notice)
        return json({ ok: true })
      }
      const { participant } = (await response.json()) as { participant: { status: string } }
      const joined = participant.status === 'confirmed'
      await answered(
        token,
        fetcher,
        callback.id,
        callback.message,
        callback.data,
        joined ? '✅ Ви в команді' : '🙋 Заявку подано, відповідальний її розгляне',
        `🙋 ${shortDay(ask.day)}: ${name} — ${joined ? 'у команді' : 'заявка'}`,
        true
      )
      return json({ ok: true })
    }

    const confirm = choice === 'c'
    const answer = new Request(new URL('/schedule/answer', request.url), {
      method: 'POST',
      body: JSON.stringify({
        eventId: ask.eventId,
        day: ask.day,
        uid: ask.uid,
        as: ask.as === 'backup' ? 'backup' : 'main',
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

  // the translations read online: for guests too, one chapter at a time
  if (pathname.startsWith('/bible/')) return handleRemoteBible(pathname, request, env, deps, json)

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
  const ministryRoles = await getMinistryRoles(env.USERS)
  const today = localDay(deps.now?.() ?? Date.now())
  const handovers = await getHandovers(env.USERS, today)
  const rights = rightsFor(roles, ministryRoles, roleId, me.uid, handovers)
  const can = (function_: Manage) => rights.manage.includes(function_)
  const telegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
  const body = async () => (await request.json().catch(() => null)) as unknown

  if (route === 'GET /me') {
    const translationMinistries = await getTranslationMinistries(env.USERS)
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
        approveIn: rights.approveIn,
        invite: rights.invite,
        sendToMinistries: rights.sendToMinistries,
        manage: rights.manage
      },
      // the roles of the user in the ministries: { ministry: ['Музикант', …] }
      ministryRoles: Object.fromEntries(
        Object.entries(ministryRoles)
          .map(([ministry, list]) => [
            ministry,
            list.filter((role) => role.uids.includes(me.uid)).map((role) => role.name)
          ])
          .filter(([, names]) => names!.length)
      ),
      canSend: rights.send,
      canReceive: serves(roles, roleId),
      phone: me.phone ?? null,
      // the service bot: offered to the ministers, and whether the user linked it
      serviceBot: Boolean(env.SERVICE_BOT_TOKEN) && serves(roles, roleId),
      // the translations that need a permission: the owners, the administrators, some ministries
      allTranslations:
        roleId === 'owner' ||
        rights.manage.length > 0 ||
        (me.ministries ?? []).some((ministry) => translationMinistries.includes(ministry)),
      // the ministries the user leads (plans their events)
      leads: ministryRightsOf(ministryRoles, me.uid, handovers).leads,
      // the duties of leaders: asked of the user, taken over by the user, handed over by the user
      handovers: Object.entries(handovers)
        .filter(([, item]) => item.toUid === me.uid || item.fromUid === me.uid)
        .map(([ministry, item]) => ({ ministry, ...item })),
      // the home groups: the user may see them, or leads one
      groups:
        roleId === 'owner' ||
        rights.manage.length > 0 ||
        ((await getGroupsVisibility(env.USERS)) === 'servants' && serves(roles, roleId)) ||
        (await getGroups(env.USERS)).some((group) => group.leaderUid === me.uid),
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
      // the app says where the post went
      const channel = await chatTitle(token, chatId, env.USERS, deps.fetcher)
      return json({ sent: sent + (post.image ? 1 : 0), channel })
    } catch (error) {
      const message = error instanceof TelegramError ? error.message : 'Telegram is unreachable'
      return json({ error: 'telegram', message }, 502)
    }
  }

  if (pathname.startsWith('/groups')) {
    const groups = await getGroups(env.USERS)
    const visibility = await getGroupsVisibility(env.USERS)
    const manage = can('directories')
    const mighty = roleId === 'owner' || roleId === SUPERVISOR
    const seesAll = mighty || rights.manage.length > 0 || (visibility === 'servants' && serves(roles, roleId))
    /** the private part of a group: its leader and the supervisors */
    const own = (group: HomeGroup) => mighty || group.leaderUid === me.uid
    const users = await listUsers(env.USERS, env.OWNERS, true)
    const show = (group: HomeGroup) => ({
      ...(own(group) ? group : publicGroup(group)),
      leaderName: nameOf(
        users.find((user) => user.uid === group.leaderUid) ?? {
          ...me,
          uid: group.leaderUid,
          name: null,
          email: null
        }
      ),
      own: own(group)
    })

    if (route === 'GET /groups')
      return json({
        groups: groups.filter((group) => seesAll || group.leaderUid === me.uid).map(show),
        visibility,
        manage
      })

    if (route === 'PUT /groups-visibility') {
      if (!manage) return json({ error: 'forbidden' }, 403)
      const value = ((await body()) as { visibility?: unknown } | null)?.visibility
      if (value !== 'servants' && value !== 'admins') return json({ error: 'bad-request' }, 400)
      await setGroupsVisibility(env.USERS, value)
      return json({ visibility: value })
    }

    if (route === 'POST /groups') {
      if (!manage) return json({ error: 'forbidden' }, 403)
      const head = parseGroupHead(await body())
      if (!head?.name || !head.leaderUid || !users.some((user) => user.uid === head.leaderUid))
        return json({ error: 'bad-request' }, 400)
      const group = newGroup(head.name, head.leaderUid)
      await setGroups(env.USERS, [...groups, group])
      return json({ group: show(group) })
    }

    const id = decodeURIComponent(pathname.slice('/groups/'.length))
    const group = groups.find((item) => item.id === id)
    if (!group) return json({ error: 'not-found' }, 404)
    if (request.method === 'DELETE') {
      if (!manage) return json({ error: 'forbidden' }, 403)
      await setGroups(
        env.USERS,
        groups.filter((item) => item.id !== id)
      )
      return json({ removed: id })
    }

    // PUT: the administrators give the name and the leader; the leader keeps the rest
    const leads = group.leaderUid === me.uid
    const change = (await body()) as Record<string, unknown> | null
    const head = parseGroupHead(change)
    const rest = parseLeaderChange(change)
    if (!head || !rest) return json({ error: 'bad-request' }, 400)
    if ((head.name || head.leaderUid) && !manage) return json({ error: 'forbidden' }, 403)
    if (head.leaderUid && !users.some((user) => user.uid === head.leaderUid))
      return json({ error: 'bad-request' }, 400)
    if (Object.keys(rest).length && !leads && !manage) return json({ error: 'forbidden' }, 403)
    // the members and the notes are the leader's (the others do not even see them whole)
    if ((rest.members || rest.meetingNote !== undefined) && !own(group))
      return json({ error: 'forbidden' }, 403)
    const updated: HomeGroup = { ...group, ...head, ...rest }
    await setGroups(
      env.USERS,
      groups.map((item) => (item.id === id ? updated : item))
    )
    return json({ group: show(updated) })
  }

  // the duties of a leader handed over to a deputy, who accepts them first
  if (pathname.startsWith('/handover')) {
    const all = can('directories')
    const payload = ((await body()) ?? {}) as {
      ministry?: unknown
      toUid?: unknown
      until?: unknown
      answer?: unknown
    }
    const ministry = typeof payload.ministry === 'string' ? payload.ministry : ''
    if (!(await getDirectory(env.USERS, 'ministries')).includes(ministry))
      return json({ error: 'bad-request' }, 400)
    const handover = handovers[ministry]

    if (route === 'POST /handover/answer') {
      if (payload.answer !== 'accept' && payload.answer !== 'decline')
        return json({ error: 'bad-request' }, 400)
      const result = await answerHandover(env, deps, me, ministry, payload.answer === 'accept')
      return result === 'ok' ? json({ answered: payload.answer }) : json({ error: result }, 404)
    }

    const leaders = roleLeadersOf(ministryRoles, ministry)
    if (route === 'POST /handover') {
      // the leader, or an administrator when the leader cannot
      if (!all && !leaders.includes(me.uid)) return json({ error: 'forbidden' }, 403)
      const until = parseUntil(payload.until, today)
      const toUid = typeof payload.toUid === 'string' ? payload.toUid : ''
      if (until === false || !deputiesOf(ministryRoles, ministry).includes(toUid) || leaders.includes(toUid))
        return json({ error: 'bad-request' }, 400)
      const fromUid = leaders.includes(me.uid) ? me.uid : (leaders[0] ?? me.uid)
      const next = {
        fromUid,
        toUid,
        byUid: me.uid,
        until,
        status: 'pending' as const,
        at: deps.now?.() ?? Date.now()
      }
      await setHandovers(env.USERS, { ...handovers, [ministry]: next })
      const by = me.uid === fromUid ? '' : ` (від імені лідера, ${nameOf(me)})`
      await tell(
        env,
        deps,
        me,
        [toUid],
        `🔁 Прохання прийняти обов'язки лідера служіння «${ministry}»${untilText(until)}${by}. Підтвердіть, будь ласка, кнопками нижче або в застосунку.`,
        [{ eventId: ministry, day: '', uid: toUid, as: 'handover' }]
      )
      return json({ handover: { ministry, ...next } })
    }

    // DELETE: the duties go back to the leader
    if (!handover) return json({ error: 'not-found' }, 404)
    if (!all && ![handover.fromUid, handover.toUid, ...leaders].includes(me.uid))
      return json({ error: 'forbidden' }, 403)
    const { [ministry]: _gone, ...rest } = handovers
    await setHandovers(env.USERS, rest)
    if (handover.status === 'accepted')
      await tell(
        env,
        deps,
        me,
        [handover.fromUid, handover.toUid, handover.byUid],
        `↩️ Обов'язки лідера служіння «${ministry}» повернулися до лідера.`
      )
    return json({ removed: ministry })
  }

  // the roles of the ministries the user leads (all of them for the keepers of the directories)
  if (pathname.startsWith('/ministry-roles')) {
    const leads = ministryRightsOf(ministryRoles, me.uid, handovers).leads
    const all = can('directories')
    if (route === 'GET /ministry-roles') {
      if (!all && !leads.length) return json({ error: 'forbidden' }, 403)
      const ministries = all ? await getDirectory(env.USERS, 'ministries') : leads
      return json({
        ministryRoles: Object.fromEntries(
          ministries.map((ministry) => [ministry, ministryRoles[ministry] ?? []])
        ),
        handovers: Object.fromEntries(
          ministries
            .filter((ministry) => handovers[ministry])
            .map((ministry) => [ministry, handovers[ministry]])
        )
      })
    }
    // a leader gives the other roles of the ministry; the leaders themselves are given by the administrators
    const ministry = decodeURIComponent(pathname.slice('/ministry-roles/'.length))
    if (!all && !leads.includes(ministry)) return json({ error: 'forbidden' }, 403)
    const parsed = parseMinistryRoles(
      { [ministry]: ((await body()) as { roles?: unknown } | null)?.roles },
      await getDirectory(env.USERS, 'ministries')
    )
    if (!parsed) return json({ error: 'bad-request' }, 400)
    const old = ministryRoles[ministry] ?? []
    const roles = all ? parsed[ministry]! : byLeader(old, parsed[ministry]!)
    const next = { ...ministryRoles, [ministry]: roles }
    await setMinistryRoles(env.USERS, next)
    return json({ roles, leaders: leadersOf(next, handovers) })
  }

  if (pathname.startsWith('/schedule')) {
    // a reader may see and apply to the open events for everyone
    const context = await scheduleContext(
      me,
      env,
      deps,
      route === 'GET /schedule' || route === 'POST /schedule/apply'
    )
    if (!context) return json({ error: 'forbidden' }, 403)
    const response = await handleSchedule(request, context, json)
    if (!context.bot.posted.length || !response.ok) return response
    // what went to the service channel: the app shows where it went and what it said
    const answer = (await response.json()) as Record<string, unknown>
    return json({
      ...answer,
      posted: { channel: await context.bot.channelTitle(), texts: context.bot.posted }
    })
  }

  if (pathname.startsWith('/messages') || route === 'GET /ministries') {
    if (!serves(roles, roleId)) return json({ error: 'forbidden' }, 403)
    if (route === 'GET /ministries') {
      // the locations too: the schedule chooses from them
      return json({
        ministries: await getMinistries(env.USERS),
        locations: await getDirectory(env.USERS, 'locations'),
        addresses: await getAddresses(env.USERS)
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
      calendar: await getCalendar(env.USERS),
      leaders: leadersOf(ministryRoles, handovers),
      ministryRoles,
      handovers,
      addresses: await getAddresses(env.USERS),
      translationMinistries: await getTranslationMinistries(env.USERS)
    })
  }

  // the ministries whose people see the translations that need a permission
  if (route === 'PUT /admin/translation-ministries') {
    if (!can('directories')) return json({ error: 'forbidden' }, 403)
    const list = parseMinistries(((await body()) as { ministries?: unknown } | null)?.ministries)
    const known = await getDirectory(env.USERS, 'ministries')
    if (!list || list.some((ministry) => !known.includes(ministry)))
      return json({ error: 'bad-request' }, 400)
    await setTranslationMinistries(env.USERS, list)
    return json({ ministries: list })
  }

  // the addresses of the locations: kept with the list of the locations
  if (route === 'PUT /admin/addresses') {
    if (!can('directories')) return json({ error: 'forbidden' }, 403)
    const addresses = parseAddresses(
      ((await body()) as { addresses?: unknown } | null)?.addresses,
      await getDirectory(env.USERS, 'locations')
    )
    if (!addresses) return json({ error: 'bad-request' }, 400)
    await setAddresses(env.USERS, addresses)
    return json({ addresses })
  }

  // the roles inside the ministries, and their people (the leaders are the people of the roles that lead)
  if (route === 'PUT /admin/ministry-roles') {
    if (!can('directories')) return json({ error: 'forbidden' }, 403)
    const parsed = parseMinistryRoles(
      ((await body()) as { ministryRoles?: unknown } | null)?.ministryRoles,
      await getDirectory(env.USERS, 'ministries')
    )
    if (!parsed) return json({ error: 'bad-request' }, 400)
    await setMinistryRoles(env.USERS, parsed)
    return json({ ministryRoles: parsed, leaders: leadersOf(parsed, handovers) })
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

  // a location or a ministry renamed: everything that has the old name keeps up
  const renamed = pathname.match(/^\/admin\/directories\/(ministries|locations)\/rename$/)?.[1] as
    Directory | undefined
  if (renamed) {
    if (!can('directories')) return json({ error: 'forbidden' }, 403)
    const { from, to } = ((await body()) ?? {}) as { from?: unknown; to?: unknown }
    const items = await getDirectory(env.USERS, renamed)
    const name = typeof to === 'string' ? to.trim() : ''
    if (typeof from !== 'string' || !items.includes(from) || !name || name.length > 60)
      return json({ error: 'bad-request' }, 400)
    if (name !== from && items.includes(name)) return json({ error: 'exists' }, 409)
    await renameEverywhere(env, deps, renamed, from, name)
    return json({ items: items.map((item) => (item === from ? name : item)) })
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
  // only a supervisor (or an owner) makes, unmakes or removes a supervisor
  const mighty = roleId === 'owner' || roleId === SUPERVISOR
  const target = await getUser(env.USERS, uid)
  if (!mighty && target && roleOf(target, env.OWNERS) === SUPERVISOR) return json({ error: 'forbidden' }, 403)
  try {
    if (request.method === 'DELETE') {
      await removeUser(env.USERS, env.OWNERS, me, uid)
      return json({ removed: uid })
    }
    const change = ((await body()) ?? {}) as {
      role?: unknown
      ministries?: unknown
      phone?: unknown
      name?: unknown
    }
    // a name: up to 80 letters; empty or null: the name of the account
    const name =
      change.name === undefined
        ? undefined
        : typeof change.name === 'string' && change.name.trim().length <= 80
          ? change.name.trim() || null
          : change.name === null
            ? null
            : false
    const role =
      typeof change.role === 'string' && roles.some((item) => item.id === change.role) ? change.role : null
    const ministries = change.ministries === undefined ? undefined : parseMinistries(change.ministries)
    const badPhone = change.phone !== undefined && change.phone !== null && !isPhone(change.phone)
    if (role === SUPERVISOR && !mighty) return json({ error: 'forbidden' }, 403)
    if ((change.role !== undefined && !role) || ministries === null || badPhone || name === false) {
      return json({ error: 'bad-request' }, 400)
    }
    if (
      change.role === undefined &&
      ministries === undefined &&
      change.phone === undefined &&
      name === undefined
    ) {
      return json({ error: 'bad-request' }, 400)
    }
    const user = await updateUser(env.USERS, env.OWNERS, me, uid, {
      ...(role ? { role } : {}),
      ...(ministries ? { ministries } : {}),
      ...(change.phone !== undefined ? { phone: change.phone as string | null } : {}),
      ...(name !== undefined ? { name } : {})
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
  rights: Rights,
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

  if (request.method === 'DELETE' && pathname === '/messages') {
    const ids = ((await body()) as { ids?: unknown } | null)?.ids
    if (!Array.isArray(ids) || !ids.length || ids.length > 300 || !ids.every((id) => typeof id === 'string'))
      return json({ error: 'bad-request' }, 400)
    await store.remove(ids as string[], me.uid)
    return json({ removed: ids.length })
  }

  const read = pathname.match(/^\/messages\/([^/]+)\/read$/)
  if (read) {
    await store.markRead(decodeURIComponent(read[1]!), me.uid, now)
    return json({ read: true })
  }

  // whom the role of the user may write to: anyone who serves, or the people of its roles
  const users = await listUsers(env.USERS, env.OWNERS)
  const ministryRoles = await getMinistryRoles(env.USERS)
  /** the people of a ministry: who serves in it, and who has a role there */
  const inMinistry = (user: (typeof users)[number], ministry: string) =>
    Boolean(user.ministries?.includes(ministry)) ||
    Boolean(ministryRoles[ministry]?.some((role) => role.uids.includes(user.uid)))
  // the status writes to its statuses (or anyone); a role of a ministry, to the people of the ministry
  const allMinistries = rights.sendToPeople || rights.sendToRoles.length > 0
  const writesTo = allMinistries ? await getMinistries(env.USERS) : rights.sendToMinistries
  const reachable = (user: (typeof users)[number]) =>
    user.uid !== me.uid &&
    serves(roles, user.role) &&
    (rights.sendToPeople ||
      rights.sendToRoles.includes(user.role) ||
      rights.sendToMinistries.some((ministry) => inMinistry(user, ministry)))
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
      ministries: rights.send ? writesTo : [],
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
          draft.ministries.some((ministry) => writesTo.includes(ministry) && inMinistry(user, ministry)) ||
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
  // the same in Telegram for the linked ones (the owners too): the text, and what is attached
  const bot = botFor(env, deps, await listUsers(env.USERS, env.OWNERS, true))
  const attached = draft.attachment
    ? `\n\n📎 ${draft.attachment.post.title || (draft.attachment.kind === 'topic' ? 'Тема' : 'Нотатка')} — у застосунку`
    : ''
  await Promise.all(
    messages.map((message) =>
      bot.send(message.toUid, escape(`✉ ${message.fromName}:\n${message.text}${attached}`))
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
