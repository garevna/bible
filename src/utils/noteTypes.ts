import type { Typed } from '@/types'

/**
 * A type of notes and topics (kept by the administrators in the worker, see worker/src/types.ts):
 * what a note of the type may become and how long it is kept.
 */
export interface NoteType {
  id: string
  name: string
  /** a hex color of its label */
  color: string
  /** who may post it to the Telegram channel: nobody, its author only, or anyone who has it */
  publish: 'none' | 'author' | 'anyone'
  /** it may be sent to ministers */
  send: boolean
  /** days it is kept after it is made; null: until its author deletes it */
  days: number | null
  /** it is deleted once posted to the channel (the author may untick that) */
  deleteAfterPublish: boolean
  /** the author may set another term */
  authorSetsTerm: boolean
}

/** the types until the worker gives the ones of the administrators (the same as in the worker) */
export const DEFAULT_TYPES: NoteType[] = [
  {
    id: 'news',
    name: 'Новина',
    color: '#E65100',
    publish: 'anyone',
    send: true,
    days: null,
    deleteAfterPublish: true,
    authorSetsTerm: true
  },
  {
    id: 'announcement',
    name: 'Оголошення',
    color: '#0090B0',
    publish: 'anyone',
    send: true,
    days: 7,
    deleteAfterPublish: false,
    authorSetsTerm: true
  },
  {
    id: 'sermon',
    name: 'Проповідь',
    color: '#6A1B9A',
    publish: 'author',
    send: true,
    days: null,
    deleteAfterPublish: false,
    authorSetsTerm: false
  },
  {
    id: 'prayer',
    name: 'Молитва',
    color: '#2E7D32',
    publish: 'author',
    send: true,
    days: 7,
    deleteAfterPublish: false,
    authorSetsTerm: true
  },
  {
    id: 'internal',
    name: 'Для внутрішнього користування',
    color: '#757575',
    publish: 'none',
    send: true,
    days: null,
    deleteAfterPublish: false,
    authorSetsTerm: true
  }
]

/** the type of notes and topics that have none (all the old ones) */
export const DEFAULT_TYPE_ID = 'internal'

const DAY = 24 * 60 * 60 * 1000

/** The type of a note or a topic; an unknown or removed one counts as the default type */
export const typeOf = (types: NoteType[], record: Typed): NoteType =>
  types.find((type) => type.id === record.typeId) ??
  types.find((type) => type.id === DEFAULT_TYPE_ID) ??
  types[0] ??
  DEFAULT_TYPES[DEFAULT_TYPES.length - 1]!

/** When a note of the type made now is deleted; undefined: it is kept */
export const termOf = (type: NoteType, from = Date.now()) => (type.days ? from + type.days * DAY : undefined)

/** The fields of a new note or topic of the type */
export const typedFieldsOf = (type: NoteType, from = Date.now()): Typed => ({
  typeId: type.id,
  ...(type.days ? { expiresAt: termOf(type, from) } : {}),
  ...(type.deleteAfterPublish ? { deleteAfterPublish: true } : {})
})

/** It may be posted to the channel: by anyone, or by its author (a saved copy has someone else's) */
export const mayPublish = (type: NoteType, record: Typed) =>
  type.publish === 'anyone' || (type.publish === 'author' && !record.from)

export const maySend = (type: NoteType) => type.send

export const isExpired = (record: Typed, now = Date.now()) =>
  record.expiresAt !== undefined && record.expiresAt <= now

/** The type fields of a record, without the undefined ones (to copy them into a new record) */
export const typedOf = ({ typeId, expiresAt, deleteAfterPublish, from }: Typed): Typed => ({
  ...(typeId !== undefined ? { typeId } : {}),
  ...(expiresAt !== undefined ? { expiresAt } : {}),
  ...(deleteAfterPublish !== undefined ? { deleteAfterPublish } : {}),
  ...(from !== undefined ? { from } : {})
})

/** 'YYYY-MM-DD' of a term, for a date field */
export const dateOf = (ms: number) => {
  const date = new Date(ms)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** The end of the day of a date field, as a term */
export const termFromDate = (value: string) => new Date(`${value}T23:59:59`).getTime()
