import { parseSlots, type Slot, withKinds } from './eventTypes'
import type { TopicPost } from './post'

/**
 * The schedule of ministries. An event is single (a day) or repeated (days of the week); the people of
 * an event serve on its days. Days and times are the local ones of the church ('YYYY-MM-DD', 'HH:MM').
 */
export interface ScheduleEvent {
  id: string
  /** its type (see eventTypes.ts); null for an event of no type */
  typeId: string | null
  ministry: string
  title: string
  description: string
  location: string
  /** a single event: its day */
  day: string | null
  /** a repeated event: the days of the week, 0 is Sunday */
  weekdays: number[] | null
  time: string
  /** a repeated event ends after this day */
  until: string | null
  needed: number
  /** a repeated event: its time on some days of the week ('6': '08:00' on Saturday), else `time` */
  times: Record<string, string> | null
  /** the roles of its people: copied from a type with fixed roles, or given to the event; none: [] */
  slots: Slot[]
  /** 'invite': the responsible person invites; 'open': people apply */
  mode: 'invite' | 'open'
  /** who may apply to an open event: the members of its ministry, any minister, anyone of the church */
  applicants: Applicants
  responsibleUid: string
  responsibleName: string
  deputyUid: string | null
  deputyName: string | null
  createdBy: string
  createdAt: number
}

export const APPLICANTS = ['ministry', 'servants', 'everyone'] as const
export type Applicants = (typeof APPLICANTS)[number]

/**
 * One day of an event changed: another time or place, another number of people, or cancelled.
 * The fields left null keep the ones of the event.
 */
export interface DayChange {
  eventId: string
  day: string
  time: string | null
  location: string | null
  needed: number | null
  cancelled: boolean
  /** a word for the people, e.g. "Цього разу — у малому залі" */
  note: string
}

export type Status = 'invited' | 'applied' | 'confirmed' | 'declined'

export interface Participant {
  eventId: string
  day: string
  uid: string
  name: string
  status: Status
  backupUid: string | null
  backupName: string | null
  backupStatus: 'invited' | 'confirmed' | 'declined' | null
  reason: string | null
  /** the name of the slot of the event the person takes; null: not given yet */
  role: string | null
  updatedAt: number
}

/** Notes or a topic prepared for a role of one day of an event (by the person of the role, or a manager) */
export interface Material {
  id: string
  eventId: string
  day: string
  role: string
  uid: string
  name: string
  /** a note or a topic of the app (its post), or a video of YouTube (its url) */
  kind: 'note' | 'topic' | 'video'
  /** the kind of the material: an id of the resources of a ministry, or null */
  resource: string | null
  url: string | null
  title: string
  post: TopicPost
  createdAt: number
}

/** a material without its post: the list of the calendar */
export type MaterialItem = Omit<Material, 'post'>

/** the time zone of the church: "today" and the past are counted in it */
export const TIME_ZONE = 'Europe/Kyiv'

/** 'YYYY-MM-DD' of a moment in the time zone of the church */
export const localDay = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(ms))

/** 'HH:MM' of a moment in the time zone of the church */
export const localTime = (ms: number) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(ms))

/** The moment (ms) of a day and time of the church */
export function atLocal(day: string, time: string) {
  const guess = Date.parse(`${day}T${time}:00Z`)
  // the time the guess shows in the time zone of the church tells how far off it is
  const shown = Date.parse(`${localDay(guess)}T${localTime(guess)}:00Z`)
  return guess - (shown - guess)
}

/** an event is gone from the calendar, with its notices, once it begins: then it is too late to change anything */
export const isOver = (day: string, time: string, now: number) => atLocal(day, time) <= now

const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay()

/** The time of an event on a day: the change of the day, the time of its weekday, or its time */
export const timeOf = (
  event: Pick<ScheduleEvent, 'time' | 'times'>,
  day: string,
  change?: Pick<DayChange, 'time'> | null
) => change?.time ?? event.times?.[String(weekdayOf(day))] ?? event.time

/** the day after a day */
const nextDay = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** The days of an event from one day to another (both included) */
export function daysOf(
  event: Pick<ScheduleEvent, 'day' | 'weekdays' | 'until'>,
  from: string,
  to: string
): string[] {
  if (event.day) return event.day >= from && event.day <= to ? [event.day] : []
  const days: string[] = []
  const last = event.until && event.until < to ? event.until : to
  for (let day = from; day <= last; day = nextDay(day))
    if (event.weekdays?.includes(weekdayOf(day))) days.push(day)
  return days
}

/* ---------- the body of a new or changed event ---------- */

const DAY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.length <= max ? value.trim() : null

export interface EventDraft {
  typeId: string | null
  ministry: string
  title: string
  description: string
  location: string
  day: string | null
  weekdays: number[] | null
  time: string
  until: string | null
  needed: number
  times: Record<string, string> | null
  /** the roles given to the event (its type may replace them) */
  slots: Slot[]
  mode: 'invite' | 'open'
  applicants: Applicants
  responsibleUid: string
  deputyUid: string | null
}

export function parseEvent(body: unknown): EventDraft | null {
  const draft = (body ?? {}) as Record<string, unknown>
  const ministry = text(draft.ministry, 60)
  const title = text(draft.title ?? '', 120)
  const description = text(draft.description ?? '', 2000)
  const location = text(draft.location ?? '', 120)
  const responsibleUid = text(draft.responsibleUid, 200)
  if (!ministry || title === null || description === null || location === null || !responsibleUid) return null

  const day = typeof draft.day === 'string' && DAY.test(draft.day) ? draft.day : null
  const weekdays =
    Array.isArray(draft.weekdays) &&
    draft.weekdays.length &&
    draft.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      ? [...new Set(draft.weekdays as number[])].sort()
      : null
  // single or repeated, not both
  if (Boolean(day) === Boolean(weekdays)) return null
  const time = typeof draft.time === 'string' && TIME.test(draft.time) ? draft.time : null
  const until = typeof draft.until === 'string' && DAY.test(draft.until) ? draft.until : null
  const needed = Number(draft.needed ?? 1)
  if (!time || !Number.isInteger(needed) || needed < 1 || needed > 100) return null
  const mode = draft.mode === 'open' ? 'open' : 'invite'
  const deputyUid = typeof draft.deputyUid === 'string' && draft.deputyUid ? draft.deputyUid : null
  const typeId = typeof draft.typeId === 'string' && draft.typeId ? draft.typeId : null
  const slots = parseSlots(draft.slots ?? [])
  if (!slots) return null
  // the times of some weekdays of a repeated event
  let times: Record<string, string> | null = null
  if (weekdays && draft.times && typeof draft.times === 'object') {
    const entries = Object.entries(draft.times as Record<string, unknown>)
    if (
      entries.some(([key, value]) => !/^[0-6]$/.test(key) || typeof value !== 'string' || !TIME.test(value))
    )
      return null
    const own = entries.filter(([key, value]) => weekdays.includes(Number(key)) && value !== time)
    times = own.length ? (Object.fromEntries(own) as Record<string, string>) : null
  }
  const applicants = APPLICANTS.includes(draft.applicants as Applicants)
    ? (draft.applicants as Applicants)
    : 'ministry'

  return {
    typeId,
    ministry,
    title,
    description,
    location,
    day,
    weekdays,
    time,
    until: weekdays ? until : null,
    needed,
    times,
    slots,
    mode,
    applicants,
    responsibleUid,
    deputyUid
  }
}

/** The body of a change of a day; null when it is not one */
export function parseChange(body: unknown): Omit<DayChange, 'eventId' | 'day'> | null {
  const change = (body ?? {}) as Record<string, unknown>
  const time = change.time === null || change.time === undefined || change.time === '' ? null : change.time
  const location =
    change.location === null || change.location === undefined ? null : text(change.location, 120)
  const needed =
    change.needed === null || change.needed === undefined || change.needed === ''
      ? null
      : Number(change.needed)
  const note = text(change.note ?? '', 500)
  if (time !== null && (typeof time !== 'string' || !TIME.test(time))) return null
  if (needed !== null && (!Number.isInteger(needed) || needed < 1 || needed > 100)) return null
  if (note === null || (change.location !== null && change.location !== undefined && location === null))
    return null
  return {
    time: time as string | null,
    location: location || null,
    needed,
    cancelled: change.cancelled === true,
    note
  }
}

/* ---------- the store ---------- */

export interface ScheduleStore {
  /** the events that may have days between the two days */
  events(from: string, to: string): Promise<ScheduleEvent[]>
  event(id: string): Promise<ScheduleEvent | null>
  putEvent(event: ScheduleEvent): Promise<void>
  deleteEvent(id: string): Promise<void>
  participants(from: string, to: string): Promise<Participant[]>
  participant(eventId: string, day: string, uid: string): Promise<Participant | null>
  putParticipant(participant: Participant): Promise<void>
  deleteParticipant(eventId: string, day: string, uid: string): Promise<void>
  /** the materials of some days, without their posts */
  materials(from: string, to: string): Promise<MaterialItem[]>
  /** the materials of one day of an event, with their posts */
  materialsOf(eventId: string, day: string): Promise<Material[]>
  material(id: string): Promise<Material | null>
  putMaterial(material: Material): Promise<void>
  deleteMaterial(id: string): Promise<void>
  /** a location or a ministry got another name: the events (and the changes of days) keep up */
  rename(field: 'location' | 'ministry', from: string, to: string): Promise<void>
  /** the changes of some days */
  changes(from: string, to: string): Promise<DayChange[]>
  change(eventId: string, day: string): Promise<DayChange | null>
  putChange(change: DayChange): Promise<void>
  deleteChange(eventId: string, day: string): Promise<void>
  /** the past goes: single events before the day, repeated ones that ended, the people and materials of past days */
  deletePast(today: string): Promise<void>
}

interface EventRow {
  id: string
  type_id: string | null
  ministry: string
  title: string
  description: string
  location: string
  day: string | null
  weekdays: string | null
  time: string
  until: string | null
  needed: number
  times: string | null
  slots: string | null
  mode: string
  applicants: string | null
  responsible_uid: string
  responsible_name: string
  deputy_uid: string | null
  deputy_name: string | null
  created_by: string
  created_at: number
}

interface ParticipantRow {
  event_id: string
  day: string
  uid: string
  name: string
  status: string
  backup_uid: string | null
  backup_name: string | null
  backup_status: string | null
  reason: string | null
  role: string | null
  updated_at: number
}

interface MaterialRow {
  id: string
  event_id: string
  day: string
  role: string
  uid: string
  name: string
  kind: string
  resource?: string | null
  url?: string | null
  title: string
  post?: string
  created_at: number
}

const eventOf = (row: EventRow): ScheduleEvent => ({
  id: row.id,
  typeId: row.type_id ?? null,
  ministry: row.ministry,
  title: row.title,
  description: row.description,
  location: row.location,
  day: row.day,
  weekdays: row.weekdays ? row.weekdays.split(',').map(Number) : null,
  time: row.time,
  until: row.until,
  needed: row.needed,
  times: row.times ? (JSON.parse(row.times) as Record<string, string>) : null,
  slots: row.slots ? withKinds(JSON.parse(row.slots) as Slot[]) : [],
  applicants: APPLICANTS.includes(row.applicants as Applicants) ? (row.applicants as Applicants) : 'ministry',
  mode: row.mode === 'open' ? 'open' : 'invite',
  responsibleUid: row.responsible_uid,
  responsibleName: row.responsible_name,
  deputyUid: row.deputy_uid,
  deputyName: row.deputy_name,
  createdBy: row.created_by,
  createdAt: row.created_at
})

const participantOf = (row: ParticipantRow): Participant => ({
  eventId: row.event_id,
  day: row.day,
  uid: row.uid,
  name: row.name,
  status: row.status as Status,
  backupUid: row.backup_uid,
  backupName: row.backup_name,
  backupStatus: row.backup_status as Participant['backupStatus'],
  reason: row.reason,
  role: row.role ?? null,
  updatedAt: row.updated_at
})

const materialItemOf = (row: MaterialRow): MaterialItem => ({
  id: row.id,
  eventId: row.event_id,
  day: row.day,
  role: row.role,
  uid: row.uid,
  name: row.name,
  kind: row.kind === 'topic' ? 'topic' : row.kind === 'video' ? 'video' : 'note',
  resource: row.resource ?? null,
  url: row.url ?? null,
  title: row.title,
  createdAt: row.created_at
})

const materialOf = (row: MaterialRow): Material => ({
  ...materialItemOf(row),
  post: JSON.parse(row.post ?? '{"title":"","items":[]}') as TopicPost
})

interface ChangeRow {
  event_id: string
  day: string
  time: string | null
  location: string | null
  needed: number | null
  cancelled: number
  note: string
}

const changeOf = (row: ChangeRow): DayChange => ({
  eventId: row.event_id,
  day: row.day,
  time: row.time,
  location: row.location,
  needed: row.needed,
  cancelled: Boolean(row.cancelled),
  note: row.note
})

const MATERIAL_ITEM = 'id, event_id, day, role, uid, name, kind, resource, url, title, created_at'

export function d1Schedule(db: D1Database): ScheduleStore {
  return {
    async events(from, to) {
      const { results } = await db
        .prepare(
          'SELECT * FROM events WHERE (day IS NOT NULL AND day BETWEEN ?1 AND ?2) OR (day IS NULL AND (until IS NULL OR until >= ?1)) ORDER BY time'
        )
        .bind(from, to)
        .all<EventRow>()
      return results.map(eventOf)
    },
    async event(id) {
      const row = await db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<EventRow>()
      return row ? eventOf(row) : null
    },
    async putEvent(e) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO events (id, type_id, ministry, title, description, location, day, weekdays, time, until, needed, times, slots, mode, applicants, responsible_uid, responsible_name, deputy_uid, deputy_name, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          e.id,
          e.typeId,
          e.ministry,
          e.title,
          e.description,
          e.location,
          e.day,
          e.weekdays ? e.weekdays.join(',') : null,
          e.time,
          e.until,
          e.needed,
          e.times ? JSON.stringify(e.times) : null,
          e.slots.length ? JSON.stringify(e.slots) : null,
          e.mode,
          e.applicants,
          e.responsibleUid,
          e.responsibleName,
          e.deputyUid,
          e.deputyName,
          e.createdBy,
          e.createdAt
        )
        .run()
    },
    async deleteEvent(id) {
      await db.batch([
        db.prepare('DELETE FROM participants WHERE event_id = ?').bind(id),
        db.prepare('DELETE FROM materials WHERE event_id = ?').bind(id),
        db.prepare('DELETE FROM day_changes WHERE event_id = ?').bind(id),
        db.prepare('DELETE FROM events WHERE id = ?').bind(id)
      ])
    },
    async participants(from, to) {
      const { results } = await db
        .prepare('SELECT * FROM participants WHERE day BETWEEN ? AND ?')
        .bind(from, to)
        .all<ParticipantRow>()
      return results.map(participantOf)
    },
    async participant(eventId, day, uid) {
      const row = await db
        .prepare('SELECT * FROM participants WHERE event_id = ? AND day = ? AND uid = ?')
        .bind(eventId, day, uid)
        .first<ParticipantRow>()
      return row ? participantOf(row) : null
    },
    async putParticipant(p) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO participants (event_id, day, uid, name, status, backup_uid, backup_name, backup_status, reason, role, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          p.eventId,
          p.day,
          p.uid,
          p.name,
          p.status,
          p.backupUid,
          p.backupName,
          p.backupStatus,
          p.reason,
          p.role,
          p.updatedAt
        )
        .run()
    },
    async deleteParticipant(eventId, day, uid) {
      await db
        .prepare('DELETE FROM participants WHERE event_id = ? AND day = ? AND uid = ?')
        .bind(eventId, day, uid)
        .run()
    },
    async materials(from, to) {
      const { results } = await db
        .prepare(`SELECT ${MATERIAL_ITEM} FROM materials WHERE day BETWEEN ? AND ? ORDER BY created_at`)
        .bind(from, to)
        .all<MaterialRow>()
      return results.map(materialItemOf)
    },
    async materialsOf(eventId, day) {
      const { results } = await db
        .prepare('SELECT * FROM materials WHERE event_id = ? AND day = ? ORDER BY created_at')
        .bind(eventId, day)
        .all<MaterialRow>()
      return results.map(materialOf)
    },
    async material(id) {
      const row = await db.prepare('SELECT * FROM materials WHERE id = ?').bind(id).first<MaterialRow>()
      return row ? materialOf(row) : null
    },
    async putMaterial(m) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO materials (id, event_id, day, role, uid, name, kind, resource, url, title, post, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          m.id,
          m.eventId,
          m.day,
          m.role,
          m.uid,
          m.name,
          m.kind,
          m.resource,
          m.url,
          m.title,
          JSON.stringify(m.post),
          m.createdAt
        )
        .run()
    },
    async deleteMaterial(id) {
      await db.prepare('DELETE FROM materials WHERE id = ?').bind(id).run()
    },
    async rename(field, from, to) {
      const statements = [db.prepare(`UPDATE events SET ${field} = ? WHERE ${field} = ?`).bind(to, from)]
      if (field === 'location')
        statements.push(db.prepare('UPDATE day_changes SET location = ? WHERE location = ?').bind(to, from))
      await db.batch(statements)
    },
    async changes(from, to) {
      const { results } = await db
        .prepare('SELECT * FROM day_changes WHERE day BETWEEN ? AND ?')
        .bind(from, to)
        .all<ChangeRow>()
      return results.map(changeOf)
    },
    async change(eventId, day) {
      const row = await db
        .prepare('SELECT * FROM day_changes WHERE event_id = ? AND day = ?')
        .bind(eventId, day)
        .first<ChangeRow>()
      return row ? changeOf(row) : null
    },
    async putChange(c) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO day_changes (event_id, day, time, location, needed, cancelled, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(c.eventId, c.day, c.time, c.location, c.needed, c.cancelled ? 1 : 0, c.note)
        .run()
    },
    async deleteChange(eventId, day) {
      await db.prepare('DELETE FROM day_changes WHERE event_id = ? AND day = ?').bind(eventId, day).run()
    },
    async deletePast(today) {
      await db.batch([
        db.prepare('DELETE FROM day_changes WHERE day < ?').bind(today),
        db.prepare('DELETE FROM participants WHERE day < ?').bind(today),
        db.prepare('DELETE FROM materials WHERE day < ?').bind(today),
        db
          .prepare(
            'DELETE FROM events WHERE (day IS NOT NULL AND day < ?1) OR (until IS NOT NULL AND until < ?1)'
          )
          .bind(today)
      ])
    }
  }
}

/** The schedule in memory, for the tests */
export function memorySchedule(): ScheduleStore {
  let events: ScheduleEvent[] = []
  let participants: Participant[] = []
  let materials: Material[] = []
  let changes: DayChange[] = []
  const key = (p: Pick<Participant, 'eventId' | 'day' | 'uid'>) => `${p.eventId}|${p.day}|${p.uid}`
  return {
    events: async (from, to) =>
      events.filter((e) => (e.day ? e.day >= from && e.day <= to : !e.until || e.until >= from)),
    event: async (id) => events.find((e) => e.id === id) ?? null,
    putEvent: async (event) => void (events = [...events.filter((e) => e.id !== event.id), event]),
    deleteEvent: async (id) => {
      events = events.filter((e) => e.id !== id)
      participants = participants.filter((p) => p.eventId !== id)
      materials = materials.filter((m) => m.eventId !== id)
      changes = changes.filter((c) => c.eventId !== id)
    },
    participants: async (from, to) => participants.filter((p) => p.day >= from && p.day <= to),
    participant: async (eventId, day, uid) =>
      participants.find((p) => key(p) === key({ eventId, day, uid })) ?? null,
    putParticipant: async (participant) =>
      void (participants = [...participants.filter((p) => key(p) !== key(participant)), participant]),
    deleteParticipant: async (eventId, day, uid) =>
      void (participants = participants.filter((p) => key(p) !== key({ eventId, day, uid }))),
    materials: async (from, to) =>
      materials.filter((m) => m.day >= from && m.day <= to).map(({ post: _post, ...item }) => item),
    materialsOf: async (eventId, day) => materials.filter((m) => m.eventId === eventId && m.day === day),
    material: async (id) => materials.find((m) => m.id === id) ?? null,
    putMaterial: async (material) =>
      void (materials = [...materials.filter((m) => m.id !== material.id), material]),
    deleteMaterial: async (id) => void (materials = materials.filter((m) => m.id !== id)),
    rename: async (field, from, to) => {
      events = events.map((e) => (e[field] === from ? { ...e, [field]: to } : e))
      if (field === 'location')
        changes = changes.map((c) => (c.location === from ? { ...c, location: to } : c))
    },
    changes: async (from, to) => changes.filter((c) => c.day >= from && c.day <= to),
    change: async (eventId, day) => changes.find((c) => c.eventId === eventId && c.day === day) ?? null,
    putChange: async (change) =>
      void (changes = [
        ...changes.filter((c) => !(c.eventId === change.eventId && c.day === change.day)),
        change
      ]),
    deleteChange: async (eventId, day) =>
      void (changes = changes.filter((c) => !(c.eventId === eventId && c.day === day))),
    deletePast: async (today) => {
      changes = changes.filter((c) => c.day >= today)
      participants = participants.filter((p) => p.day >= today)
      materials = materials.filter((m) => m.day >= today)
      events = events.filter((e) => !(e.day && e.day < today) && !(e.until && e.until < today))
    }
  }
}
