import { isYouTube } from './materialKinds'
import { parsePost, STORED, type TopicPost } from './post'
import type { UsersStore } from './users'

/**
 * The topics of the meetings of the home groups. The ministry of the home groups (its leaders, and the
 * administrators) prepares them; a pastor approves them (or the pastors standing in, see approvals.ts)
 * and gives their own as recommendations; the ministry sends an approved topic to the leaders of all
 * or some groups, and a leader marks it done in their group.
 */
export type TopicStatus = 'pending' | 'approved' | 'returned'

export interface GroupTopic {
  id: string
  title: string
  /** the day of the meeting it is for ('YYYY-MM-DD'), or null */
  day: string | null
  /** the words and the verses; a picture kept in Telegram ('tg:…') */
  post: TopicPost
  /** a video of YouTube */
  video: string | null
  /** who wrote it */
  uid: string
  name: string
  /** a pastor's own: approved as it is written */
  recommended: boolean
  status: TopicStatus
  /** what the pastor asks to change */
  reviewNote: string | null
  reviewedBy: string | null
  /** the groups it went to */
  sentTo: string[]
  sentAt: number | null
  /** the groups it was done in: the time the leader marked it */
  done: Record<string, number>
  createdAt: number
}

/** the ministry that prepares the topics, and the pastor who approves them (none: no approval) */
export interface TopicsSettings {
  ministry: string | null
  approverUid: string | null
}

const SETTINGS_KEY = 'settings:groupTopics'

export const getTopicsSettings = async (store: UsersStore): Promise<TopicsSettings> => ({
  ministry: null,
  approverUid: null,
  ...((await store.get<TopicsSettings>(SETTINGS_KEY, 'json')) ?? {})
})

export const setTopicsSettings = (store: UsersStore, settings: TopicsSettings) =>
  store.put(SETTINGS_KEY, JSON.stringify(settings))

const isDay = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)

export function parseTopicsSettings(body: unknown): TopicsSettings | null {
  const value = (body ?? {}) as Record<string, unknown>
  const text = (item: unknown) =>
    item === null || item === '' ? null : typeof item === 'string' && item.length <= 200 ? item : undefined
  const ministry = text(value.ministry)
  const approverUid = text(value.approverUid)
  return ministry === undefined || approverUid === undefined ? null : { ministry, approverUid }
}

/** what is written of a topic: its title, the day, the words, a picture kept in Telegram, a video */
export type TopicDraft = Pick<GroupTopic, 'title' | 'day' | 'post' | 'video'>

export function parseTopic(body: unknown): TopicDraft | null {
  const value = (body ?? {}) as Record<string, unknown>
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  if (!title || title.length > 300) return null
  const day = value.day === null || value.day === undefined || value.day === '' ? null : value.day
  if (day !== null && !isDay(day)) return null
  const video = value.video === null || value.video === undefined || value.video === '' ? null : value.video
  if (video !== null && !isYouTube(video)) return null
  // the words of a topic may be none (a video, a picture); the title is the topic's
  const post = parsePost({ items: [], ...(value.post as object), title })
  // a picture of the device is kept in Telegram first (POST /posts/upload)
  if (!post || (post.image && !STORED.test(post.image))) return null
  return { title, day, post, video }
}

/* ---------- the store ---------- */

export interface TopicsStore {
  /** the newest first */
  list(limit: number): Promise<GroupTopic[]>
  get(id: string): Promise<GroupTopic | null>
  put(topic: GroupTopic): Promise<void>
  remove(id: string): Promise<void>
}

export function d1Topics(db: D1Database): TopicsStore {
  return {
    async list(limit) {
      const { results } = await db
        .prepare('SELECT data FROM group_topics ORDER BY created_at DESC LIMIT ?')
        .bind(limit)
        .all<{ data: string }>()
      return results.map((row) => JSON.parse(row.data) as GroupTopic)
    },
    async get(id) {
      const row = await db
        .prepare('SELECT data FROM group_topics WHERE id = ?')
        .bind(id)
        .first<{ data: string }>()
      return row ? (JSON.parse(row.data) as GroupTopic) : null
    },
    async put(topic) {
      await db
        .prepare('INSERT OR REPLACE INTO group_topics (id, created_at, data) VALUES (?, ?, ?)')
        .bind(topic.id, topic.createdAt, JSON.stringify(topic))
        .run()
    },
    async remove(id) {
      await db.prepare('DELETE FROM group_topics WHERE id = ?').bind(id).run()
    }
  }
}

export function memoryTopics(): TopicsStore {
  let topics: GroupTopic[] = []
  return {
    list: async (limit) => [...topics].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit),
    get: async (id) => topics.find((topic) => topic.id === id) ?? null,
    put: async (topic) => void (topics = [...topics.filter((item) => item.id !== topic.id), topic]),
    remove: async (id) => void (topics = topics.filter((topic) => topic.id !== id))
  }
}

/* ---------- the routes ---------- */

export interface TopicsContext {
  me: { uid: string; name: string }
  /** the administrators: they choose the ministry and the pastor, and act for the ministry */
  admin: boolean
  settings: TopicsSettings
  /** the leaders of the ministry of the groups: they prepare and send the topics */
  curators: string[]
  /** the people whose status approves the materials: they give their topics as recommendations */
  pastors: string[]
  /** who gets the topics to approve (the pastor, or those standing in), and who may approve them */
  approvers: string[]
  reviewers: string[]
  /** the groups: their leaders get the topics sent to them */
  groups: { id: string; leaderUid: string }[]
  store: TopicsStore
  saveSettings: (settings: TopicsSettings) => Promise<void>
  /** a notice in the app and in Telegram */
  tell: (uids: string[], text: string) => Promise<void>
  /** "15 листопада" */
  dayInWords: (day: string) => string
  now: number
}

const LIMIT = 100

export async function handleTopics(
  method: string,
  path: string,
  body: unknown,
  context: TopicsContext,
  json: (data: unknown, status?: number) => Response
): Promise<Response> {
  const { me, settings, store } = context
  const prepares = context.admin || context.curators.includes(me.uid)
  const reviews = context.reviewers.includes(me.uid)
  const pastor = context.pastors.includes(me.uid) || reviews
  const led = context.groups.filter((group) => group.leaderUid === me.uid).map((group) => group.id)
  const staff = prepares || pastor
  const may = { prepare: prepares, recommend: pastor, review: reviews, settings: context.admin }
  const forbidden = () => json({ error: 'forbidden' }, 403)
  const label = (topic: Pick<GroupTopic, 'title' | 'day'>) =>
    `«${topic.title}»${topic.day ? ` (${context.dayInWords(topic.day)})` : ''}`

  if (method === 'GET' && path === '/group-topics') {
    const topics = await store.list(LIMIT)
    // the leaders of the groups: the approved topics sent to their groups
    const seen = staff
      ? topics
      : topics.filter((topic) => topic.status === 'approved' && topic.sentTo.some((id) => led.includes(id)))
    return json({ settings, topics: seen, may, led })
  }

  if (method === 'PUT' && path === '/group-topics/settings') {
    if (!context.admin) return forbidden()
    const next = parseTopicsSettings(body)
    if (!next) return json({ error: 'bad-request' }, 400)
    await context.saveSettings(next)
    return json({ settings: next })
  }

  if (method === 'POST' && path === '/group-topics') {
    if (!prepares && !pastor) return forbidden()
    const draft = parseTopic(body)
    if (!draft) return json({ error: 'bad-request' }, 400)
    // a pastor's own is a recommendation; the ministry's waits for the pastor, when one approves
    const recommended =
      pastor && !prepares ? true : pastor && Boolean((body as { recommended?: unknown }).recommended)
    const approved = recommended || reviews || !context.approvers.length
    const topic: GroupTopic = {
      ...draft,
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      uid: me.uid,
      name: me.name,
      recommended,
      status: approved ? 'approved' : 'pending',
      reviewNote: null,
      reviewedBy: approved && context.approvers.length ? me.name : null,
      sentTo: [],
      sentAt: null,
      done: {},
      createdAt: context.now
    }
    await store.put(topic)
    if (recommended)
      await context.tell(
        context.curators,
        `💡 Рекомендація пастора для домашніх груп: ${label(topic)}. Її можна розіслати лідерам груп.`
      )
    else if (!approved)
      await context.tell(context.approvers, `📝 Тема зустрічі домашніх груп на затвердження: ${label(topic)}`)
    return json({ topic })
  }

  const match = /^\/group-topics\/([\w-]+)(?:\/(review|send|mark))?$/.exec(path)
  if (!match) return json({ error: 'not-found' }, 404)
  const topic = await store.get(match[1]!)
  if (!topic) return json({ error: 'not-found' }, 404)
  const action = match[2]
  const changes = topic.uid === me.uid || prepares || reviews

  if (!action && method === 'DELETE') {
    if (!changes) return forbidden()
    await store.remove(topic.id)
    return json({ removed: topic.id })
  }

  if (!action && method === 'PUT') {
    if (!changes) return forbidden()
    const draft = parseTopic(body)
    if (!draft) return json({ error: 'bad-request' }, 400)
    // changed by another than the pastor: it waits for the pastor again (a recommendation stays one)
    const again = !topic.recommended && !reviews && context.approvers.length > 0
    const updated: GroupTopic = {
      ...topic,
      ...draft,
      ...(again ? { status: 'pending' as const, reviewNote: null, reviewedBy: null } : {})
    }
    await store.put(updated)
    if (again)
      await context.tell(context.approvers, `📝 Тему зустрічі змінено, на затвердження: ${label(updated)}`)
    return json({ topic: updated })
  }

  if (action === 'review' && method === 'POST') {
    if (!reviews) return forbidden()
    const { approve, note } = (body ?? {}) as { approve?: unknown; note?: unknown }
    const word = typeof note === 'string' ? note.trim().slice(0, 2000) : ''
    if (typeof approve !== 'boolean' || (!approve && !word)) return json({ error: 'bad-request' }, 400)
    const updated: GroupTopic = {
      ...topic,
      status: approve ? 'approved' : 'returned',
      reviewNote: approve ? null : word,
      reviewedBy: me.name
    }
    await store.put(updated)
    await context.tell(
      [topic.uid],
      approve
        ? `✅ Тему зустрічі ${label(topic)} затверджено. Її можна розіслати лідерам груп.`
        : `↩️ Тему зустрічі ${label(topic)} повернуто на доопрацювання: ${word}`
    )
    return json({ topic: updated })
  }

  if (action === 'send' && method === 'POST') {
    if (!prepares) return forbidden()
    if (topic.status !== 'approved') return json({ error: 'not-approved' }, 409)
    const ids = (body as { groups?: unknown } | null)?.groups
    const groups = Array.isArray(ids)
      ? context.groups.filter((group) => group.leaderUid && ids.includes(group.id))
      : []
    if (!groups.length) return json({ error: 'bad-request' }, 400)
    const updated: GroupTopic = {
      ...topic,
      sentTo: [...new Set([...topic.sentTo, ...groups.map((group) => group.id)])],
      sentAt: context.now
    }
    await store.put(updated)
    await context.tell(
      groups.map((group) => group.leaderUid),
      `🏠 Тема зустрічі домашньої групи: ${label(topic)}. Її матеріали — у застосунку, «Моя домашня група».`
    )
    return json({ topic: updated })
  }

  if (action === 'mark' && method === 'PUT') {
    const { group, done } = (body ?? {}) as { group?: unknown; done?: unknown }
    if (typeof group !== 'string' || typeof done !== 'boolean') return json({ error: 'bad-request' }, 400)
    if (!led.includes(group) && !context.admin) return forbidden()
    if (!topic.sentTo.includes(group)) return json({ error: 'not-sent' }, 409)
    const { [group]: _, ...rest } = topic.done
    const updated: GroupTopic = { ...topic, done: done ? { ...rest, [group]: context.now } : rest }
    await store.put(updated)
    return json({ topic: updated })
  }

  return json({ error: 'not-found' }, 404)
}
