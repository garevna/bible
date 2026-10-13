import type { UsersStore } from './users'

/**
 * Types of notes and topics, kept by the administrators: what a note of the type may become
 * (a post of the channel, a message to ministers) and how long it is kept.
 */
export interface NoteType {
  /** 'news', 'sermon', … */
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
  /** it is deleted once it is posted to the channel (the author may untick that) */
  deleteAfterPublish: boolean
  /** the author may set another term */
  authorSetsTerm: boolean
}

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

const TYPES_KEY = 'settings:types'

export const getTypes = async (store: UsersStore) =>
  (await store.get<NoteType[]>(TYPES_KEY, 'json')) ?? DEFAULT_TYPES

export const setTypes = (store: UsersStore, types: NoteType[]) => store.put(TYPES_KEY, JSON.stringify(types))

const isType = (value: unknown): value is NoteType => {
  const type = value as NoteType
  return (
    Boolean(type) &&
    typeof type.id === 'string' &&
    /^[a-z0-9-]{1,40}$/.test(type.id) &&
    typeof type.name === 'string' &&
    type.name.trim().length > 0 &&
    type.name.length <= 60 &&
    typeof type.color === 'string' &&
    /^#[0-9a-fA-F]{6}$/.test(type.color) &&
    ['none', 'author', 'anyone'].includes(type.publish) &&
    typeof type.send === 'boolean' &&
    (type.days === null || (Number.isInteger(type.days) && type.days > 0 && type.days <= 3650)) &&
    typeof type.deleteAfterPublish === 'boolean' &&
    typeof type.authorSetsTerm === 'boolean'
  )
}

/** One to twenty types with distinct ids, or null */
export function parseTypes(value: unknown): NoteType[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 20 || !value.every(isType)) return null
  if (new Set(value.map((type) => type.id)).size !== value.length) return null
  return value.map(({ id, name, color, publish, send, days, deleteAfterPublish, authorSetsTerm }) => ({
    id,
    name: name.trim(),
    color,
    publish,
    send,
    days,
    deleteAfterPublish,
    authorSetsTerm
  }))
}
