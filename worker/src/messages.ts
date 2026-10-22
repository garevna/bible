import { parsePost, type TopicPost } from './post'
import type { Ask } from './serviceBot'

/**
 * Messages between ministers. Publishers and administrators (the pastor, preachers) write to
 * people or to whole ministries; the members of the ministries only answer the messages they got.
 * A message lives for a day.
 */
export const MESSAGE_LIFE = 24 * 60 * 60 * 1000
/** messages (one per recipient) a person may send in an hour */
export const HOURLY_LIMIT = 100
const MAX_TEXT = 4000
const MAX_RECIPIENTS = 100

/** a note or a topic, as a post of the Telegram channel (its verses carry their refs) */
/** a note or a topic of the user, or a picture (kept in Telegram: 'tg:…' in post.image) */
export interface Attachment {
  kind: 'note' | 'topic' | 'image'
  post: TopicPost
}

export interface Message {
  id: string
  fromUid: string
  fromName: string
  toUid: string
  toName: string
  text: string
  attachment: Attachment | null
  /** the message this one answers */
  replyTo: string | null
  /** an invitation: the days it asks to answer, answered by its buttons in the app too */
  asks?: Ask[] | null
  createdAt: number
  expiresAt: number
  readAt: number | null
}

export interface MessagesStore {
  insert(messages: Message[]): Promise<void>
  /** the messages to or from the user that have not expired, the newest first */
  forUser(uid: string, now: number): Promise<Message[]>
  get(id: string): Promise<Message | null>
  markRead(id: string, uid: string, now: number): Promise<void>
  sentSince(uid: string, since: number): Promise<number>
  deleteExpired(now: number): Promise<void>
  /** the messages of the ids are hidden from the user (the other side keeps them); hidden by both, they go */
  remove(ids: string[], uid: string): Promise<void>
}

/** The body of POST /messages, or null */
export interface MessageDraft {
  to: string[]
  ministries: string[]
  /** all the people of these roles */
  roles: string[]
  text: string
  attachment: Attachment | null
  replyTo: string | null
}

const strings = (value: unknown, max: number) =>
  Array.isArray(value) &&
  value.length <= max &&
  value.every((item) => typeof item === 'string' && item.length <= 200)
    ? (value as string[])
    : null

export function parseDraft(body: unknown): MessageDraft | null {
  const draft = (body ?? {}) as Record<string, unknown>
  const to = strings(draft.to ?? [], MAX_RECIPIENTS)
  const ministries = strings(draft.ministries ?? [], 50)
  const roles = strings(draft.roles ?? [], 30)
  const text = typeof draft.text === 'string' ? draft.text.trim() : ''
  const replyTo = typeof draft.replyTo === 'string' ? draft.replyTo : null
  if (!to || !ministries || !roles || text.length > MAX_TEXT) return null

  let attachment: Attachment | null = null
  if (draft.attachment !== undefined && draft.attachment !== null) {
    const { kind, post } = draft.attachment as { kind?: unknown; post?: unknown }
    const parsed = parsePost(post)
    if ((kind !== 'note' && kind !== 'topic' && kind !== 'image') || !parsed) return null
    // a picture kept in Telegram is its short id; a picture of the device stays out (hundreds of kilobytes)
    const kept = parsed.image?.startsWith('tg:') ? parsed.image : undefined
    if (kind === 'image' && !kept) return null
    const { image: _image, ...withoutImage } = parsed
    attachment = { kind, post: { ...withoutImage, ...(kept ? { image: kept } : {}) } }
  }
  if (!text && !attachment) return null
  return { to, ministries, roles, text, attachment, replyTo }
}

/* ---------- D1 ---------- */

interface Row {
  id: string
  from_uid: string
  from_name: string
  to_uid: string
  to_name: string
  text: string
  attachment: string | null
  reply_to: string | null
  asks?: string | null
  created_at: number
  expires_at: number
  read_at: number | null
}

const fromRow = (row: Row): Message => ({
  id: row.id,
  fromUid: row.from_uid,
  fromName: row.from_name,
  toUid: row.to_uid,
  toName: row.to_name,
  text: row.text,
  attachment: row.attachment ? (JSON.parse(row.attachment) as Attachment) : null,
  replyTo: row.reply_to,
  asks: row.asks ? (JSON.parse(row.asks) as Ask[]) : null,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  readAt: row.read_at
})

export function d1Store(db: D1Database): MessagesStore {
  return {
    async insert(messages) {
      const statement = db.prepare(
        'INSERT INTO messages (id, from_uid, from_name, to_uid, to_name, text, attachment, reply_to, asks, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      await db.batch(
        messages.map((m) =>
          statement.bind(
            m.id,
            m.fromUid,
            m.fromName,
            m.toUid,
            m.toName,
            m.text,
            m.attachment ? JSON.stringify(m.attachment) : null,
            m.replyTo,
            m.asks?.length ? JSON.stringify(m.asks) : null,
            m.createdAt,
            m.expiresAt
          )
        )
      )
    },
    async forUser(uid, now) {
      const { results } = await db
        .prepare(
          'SELECT * FROM messages WHERE ((to_uid = ?1 AND hidden_to = 0) OR (from_uid = ?1 AND hidden_from = 0)) AND expires_at > ?2 ORDER BY created_at DESC LIMIT 300'
        )
        .bind(uid, now)
        .all<Row>()
      return results.map(fromRow)
    },
    async get(id) {
      const row = await db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<Row>()
      return row ? fromRow(row) : null
    },
    async markRead(id, uid, now) {
      await db
        .prepare('UPDATE messages SET read_at = ? WHERE id = ? AND to_uid = ? AND read_at IS NULL')
        .bind(now, id, uid)
        .run()
    },
    async sentSince(uid, since) {
      const row = await db
        .prepare('SELECT COUNT(*) AS count FROM messages WHERE from_uid = ? AND created_at > ?')
        .bind(uid, since)
        .first<{ count: number }>()
      return row?.count ?? 0
    },
    async deleteExpired(now) {
      await db.prepare('DELETE FROM messages WHERE expires_at <= ?').bind(now).run()
    },
    async remove(ids, uid) {
      const toMe = db.prepare('UPDATE messages SET hidden_to = 1 WHERE id = ? AND to_uid = ?')
      const fromMe = db.prepare('UPDATE messages SET hidden_from = 1 WHERE id = ? AND from_uid = ?')
      const gone = db.prepare('DELETE FROM messages WHERE id = ? AND hidden_to = 1 AND hidden_from = 1')
      await db.batch(ids.flatMap((id) => [toMe.bind(id, uid), fromMe.bind(id, uid), gone.bind(id)]))
    }
  }
}

/** Messages in memory, for the tests */
export function memoryStore(): MessagesStore {
  let messages: Message[] = []
  /** the sides that hid each message */
  const hidden = new Map<string, Set<string>>()
  const visible = (m: Message, uid: string) =>
    (m.toUid === uid && !hidden.get(m.id)?.has('to')) || (m.fromUid === uid && !hidden.get(m.id)?.has('from'))
  return {
    insert: async (items) => void messages.push(...items),
    forUser: async (uid, now) =>
      messages.filter((m) => visible(m, uid) && m.expiresAt > now).sort((a, b) => b.createdAt - a.createdAt),
    get: async (id) => messages.find((m) => m.id === id) ?? null,
    markRead: async (id, uid, now) => {
      const message = messages.find((m) => m.id === id && m.toUid === uid)
      if (message && !message.readAt) message.readAt = now
    },
    sentSince: async (uid, since) => messages.filter((m) => m.fromUid === uid && m.createdAt > since).length,
    deleteExpired: async (now) => void (messages = messages.filter((m) => m.expiresAt > now)),
    remove: async (ids, uid) => {
      for (const m of messages.filter((item) => ids.includes(item.id))) {
        const sides = hidden.get(m.id) ?? new Set<string>()
        if (m.toUid === uid) sides.add('to')
        if (m.fromUid === uid) sides.add('from')
        hidden.set(m.id, sides)
      }
      messages = messages.filter((m) => !(hidden.get(m.id)?.has('to') && hidden.get(m.id)?.has('from')))
    }
  }
}
