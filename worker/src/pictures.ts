/**
 * The archive of the pictures: the pictures stay in the private channel of the bot (see telegram.ts,
 * storePhoto); here is what is known of them — when and by whom kept, a title, the message of the
 * channel (so that a picture removed goes from the channel too). A few hundred bytes a picture.
 */
export interface Picture {
  /** 'tg:' and the id of its file */
  id: string
  /** the message of the private channel; null for a picture kept before the archive */
  messageId: number | null
  title: string
  uid: string
  name: string
  createdAt: number
}

export interface PicturesQuery {
  /** kept since, before (ms) */
  from?: number
  to?: number
  /** in the title or the name of the one who kept it */
  text?: string
  limit: number
}

export interface PicturesStore {
  /** a picture kept already stays as it is */
  add(picture: Picture): Promise<void>
  /** the newest first */
  list(query: PicturesQuery): Promise<Picture[]>
  get(id: string): Promise<Picture | null>
  remove(id: string): Promise<void>
  /** how many materials, posts, topics and messages have it */
  uses(id: string): Promise<number>
  /** the pictures in the materials, posts, topics and messages that the archive has not got yet */
  unlisted(): Promise<Picture[]>
}

interface Row {
  id: string
  message_id: number | null
  title: string
  uid: string
  name: string
  created_at: number
}

const pictureOf = (row: Row): Picture => ({
  id: row.id,
  messageId: row.message_id,
  title: row.title,
  uid: row.uid,
  name: row.name,
  createdAt: row.created_at
})

const STORED = /tg:[\w-]{10,300}/g

/** the pictures in a text kept by the app (a post, a topic, an attachment) */
export const picturesIn = (text: string | null) => [...new Set(text?.match(STORED) ?? [])]

export function d1Pictures(db: D1Database): PicturesStore {
  return {
    async add(p) {
      await db
        .prepare(
          'INSERT OR IGNORE INTO pictures (id, message_id, title, uid, name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(p.id, p.messageId, p.title, p.uid, p.name, p.createdAt)
        .run()
    },
    async list({ from, to, text, limit }) {
      const where: string[] = []
      const binds: (string | number)[] = []
      if (from !== undefined) {
        where.push('created_at >= ?')
        binds.push(from)
      }
      if (to !== undefined) {
        where.push('created_at < ?')
        binds.push(to)
      }
      if (text) {
        where.push("(title LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')")
        const like = `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
        binds.push(like, like)
      }
      const { results } = await db
        .prepare(
          `SELECT * FROM pictures ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`
        )
        .bind(...binds, limit)
        .all<Row>()
      return results.map(pictureOf)
    },
    async get(id) {
      const row = await db.prepare('SELECT * FROM pictures WHERE id = ?').bind(id).first<Row>()
      return row ? pictureOf(row) : null
    },
    async remove(id) {
      await db.prepare('DELETE FROM pictures WHERE id = ?').bind(id).run()
    },
    async uses(id) {
      const like = `%"${id}"%`
      const row = await db
        .prepare(
          `SELECT
            (SELECT COUNT(*) FROM materials WHERE url = ?1 OR post LIKE ?2) +
            (SELECT COUNT(*) FROM submissions WHERE post LIKE ?2) +
            (SELECT COUNT(*) FROM group_topics WHERE data LIKE ?2) +
            (SELECT COUNT(*) FROM messages WHERE attachment LIKE ?2) AS uses`
        )
        .bind(id, like)
        .first<{ uses: number }>()
      return row?.uses ?? 0
    },
    async unlisted() {
      const query = (sql: string) =>
        db
          .prepare(sql)
          .all<{ text: string | null; uid: string; name: string; at: number }>()
          .then(({ results }) => results)
      const rows = [
        ...(await query(
          "SELECT COALESCE(url, '') || post AS text, uid, name, created_at AS at FROM materials WHERE url LIKE 'tg:%' OR post LIKE '%\"tg:%'"
        )),
        ...(await query(
          "SELECT post AS text, author_uid AS uid, author_name AS name, created_at AS at FROM submissions WHERE post LIKE '%\"tg:%'"
        )),
        ...(await query(
          "SELECT data AS text, '' AS uid, '' AS name, created_at AS at FROM group_topics WHERE data LIKE '%\"tg:%'"
        )),
        ...(await query(
          "SELECT attachment AS text, from_uid AS uid, from_name AS name, created_at AS at FROM messages WHERE attachment LIKE '%\"tg:%'"
        ))
      ]
      const known = new Set(
        (await db.prepare('SELECT id FROM pictures').all<{ id: string }>()).results.map((row) => row.id)
      )
      const found = new Map<string, Picture>()
      for (const row of rows)
        for (const id of picturesIn(row.text)) {
          const seen = found.get(id)
          if (known.has(id) || (seen && seen.createdAt <= row.at)) continue
          found.set(id, { id, messageId: null, title: '', uid: row.uid, name: row.name, createdAt: row.at })
        }
      return [...found.values()]
    }
  }
}

/** for the tests: the uses and the pictures not in the archive are given */
export function memoryPictures(used: Record<string, number> = {}, others: Picture[] = []): PicturesStore {
  let pictures: Picture[] = []
  return {
    add: async (picture) => {
      if (!pictures.some((item) => item.id === picture.id)) pictures = [...pictures, picture]
    },
    list: async ({ from, to, text, limit }) =>
      pictures
        .filter(
          (item) =>
            (from === undefined || item.createdAt >= from) &&
            (to === undefined || item.createdAt < to) &&
            (!text || `${item.title} ${item.name}`.toLowerCase().includes(text.toLowerCase()))
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit),
    get: async (id) => pictures.find((item) => item.id === id) ?? null,
    remove: async (id) => void (pictures = pictures.filter((item) => item.id !== id)),
    uses: async (id) => used[id] ?? 0,
    unlisted: async () => others.filter((item) => !pictures.some((picture) => picture.id === item.id))
  }
}
