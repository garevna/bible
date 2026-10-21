import type { UsersStore } from './users'

/**
 * A role of the people of an event ("Пастор", "Лідер прославлення", "Учасник"): how many people take it
 * and whether they prepare materials for it (notes, verses, a list of songs).
 */
export interface Slot {
  name: string
  count: number
  materials: boolean
  /** the kinds of the materials it prepares (ids of the resources of a ministry, see materialKinds.ts) */
  kinds: string[]
  /** a word about what to prepare, e.g. "Перелік пісень хвали" */
  hint: string
}

/**
 * A type of events, kept by the administrators: "Причастя", "Ранкова молитва", …
 * Its roles are none, the same for every event of the type, or given to each event when it is planned.
 */
export interface EventType {
  /** 'communion', … */
  id: string
  name: string
  /** the ministry of its events, when it is always the same */
  ministry: string | null
  roles: 'none' | 'fixed' | 'dynamic'
  /** the roles of the 'fixed' type (and the suggested ones of a 'dynamic' type) */
  slots: Slot[]
}

export const DEFAULT_EVENT_TYPES: EventType[] = [
  { id: 'morning-prayer', name: 'Ранкова молитва', ministry: null, roles: 'none', slots: [] },
  { id: 'evening-prayer', name: 'Вечірня молитва', ministry: null, roles: 'none', slots: [] },
  {
    id: 'communion',
    name: 'Причастя',
    ministry: null,
    roles: 'fixed',
    slots: [
      {
        name: 'Пастор',
        count: 1,
        materials: true,
        kinds: ['k-sermon', 'k-word'],
        hint: 'Нотатки, вірші з Біблії'
      },
      {
        name: 'Лідер прославлення',
        count: 1,
        materials: true,
        kinds: ['k-plan'],
        hint: 'Перелік пісень хвали'
      },
      { name: 'Учасник', count: 4, materials: false, kinds: [], hint: '' }
    ]
  },
  {
    id: 'worship',
    name: 'Музичне служіння',
    ministry: null,
    roles: 'fixed',
    slots: [
      {
        name: 'Лідер прославлення',
        count: 1,
        materials: true,
        kinds: ['k-plan'],
        hint: 'Перелік пісень хвали'
      },
      { name: 'Музикант', count: 3, materials: false, kinds: [], hint: '' },
      { name: 'Вокаліст', count: 2, materials: false, kinds: [], hint: '' }
    ]
  },
  { id: 'pastoral', name: 'Пасторське служіння', ministry: null, roles: 'dynamic', slots: [] }
]

/** The filters of the calendar an administrator may show */
export const FILTERS = ['type', 'ministry', 'event', 'person', 'mine'] as const
export type Filter = (typeof FILTERS)[number]

/**
 * How the calendar marks the days that are not ready yet: red for the first days (today and tomorrow),
 * then orange (#f50) for some days, then amber (#fa0). A ready day is green.
 */
export interface CalendarSettings {
  redDays: number
  orangeDays: number
  filters: Filter[]
}

export const DEFAULT_CALENDAR: CalendarSettings = { redDays: 2, orangeDays: 5, filters: [...FILTERS] }

const TYPES_KEY = 'settings:eventTypes'
const CALENDAR_KEY = 'settings:calendar'

/** the roles saved before the kinds of materials have none */
export const withKinds = (slots: Slot[]): Slot[] =>
  slots.map((slot) => ({ ...slot, kinds: slot.kinds ?? [] }))

export const getEventTypes = async (store: UsersStore) =>
  ((await store.get<EventType[]>(TYPES_KEY, 'json')) ?? DEFAULT_EVENT_TYPES).map((type) => ({
    ...type,
    slots: withKinds(type.slots)
  }))

export const setEventTypes = (store: UsersStore, types: EventType[]) =>
  store.put(TYPES_KEY, JSON.stringify(types))

export const getCalendar = async (store: UsersStore) => ({
  ...DEFAULT_CALENDAR,
  ...((await store.get<CalendarSettings>(CALENDAR_KEY, 'json')) ?? {})
})

export const setCalendar = (store: UsersStore, settings: CalendarSettings) =>
  store.put(CALENDAR_KEY, JSON.stringify(settings))

const name = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null

/** Up to twenty roles with distinct names, or null */
export function parseSlots(value: unknown): Slot[] | null {
  if (!Array.isArray(value) || value.length > 20) return null
  const slots: Slot[] = []
  for (const item of value as Record<string, unknown>[]) {
    const slotName = name(item?.name, 60)
    const count = Number(item?.count)
    const hint = typeof item?.hint === 'string' && item.hint.length <= 200 ? item.hint.trim() : ''
    // the roles saved before the kinds have none
    const kinds = item?.kinds === undefined ? [] : item.kinds
    if (
      !Array.isArray(kinds) ||
      kinds.length > 20 ||
      !kinds.every((kind) => typeof kind === 'string' && /^k-[a-z0-9-]{1,40}$/.test(kind))
    )
      return null
    if (!slotName || !Number.isInteger(count) || count < 1 || count > 50) return null
    if (typeof item.materials !== 'boolean') return null
    slots.push({
      name: slotName,
      count,
      materials: item.materials,
      kinds: item.materials ? [...new Set(kinds as string[])] : [],
      hint: item.materials ? hint : ''
    })
  }
  return new Set(slots.map((slot) => slot.name)).size === slots.length ? slots : null
}

/** Up to fifty types with distinct ids; a type without roles has no slots. Null when it is not that */
export function parseEventTypes(value: unknown): EventType[] | null {
  if (!Array.isArray(value) || value.length > 50) return null
  const types: EventType[] = []
  for (const item of value as Record<string, unknown>[]) {
    const id = typeof item?.id === 'string' && /^[a-z0-9-]{1,40}$/.test(item.id) ? item.id : null
    const typeName = name(item?.name, 60)
    const ministry = item?.ministry === null || item?.ministry === undefined ? null : name(item.ministry, 60)
    const roles = item?.roles
    const slots = parseSlots(item?.slots ?? [])
    if (!id || !typeName || (item?.ministry && !ministry) || !slots) return null
    if (roles !== 'none' && roles !== 'fixed' && roles !== 'dynamic') return null
    if (roles === 'fixed' && !slots.length) return null
    types.push({ id, name: typeName, ministry, roles, slots: roles === 'none' ? [] : slots })
  }
  return new Set(types.map((type) => type.id)).size === types.length ? types : null
}

export function parseCalendar(value: unknown): CalendarSettings | null {
  const settings = (value ?? {}) as Record<string, unknown>
  const redDays = Number(settings.redDays)
  const orangeDays = Number(settings.orangeDays)
  const filters = settings.filters
  if (!Number.isInteger(redDays) || redDays < 0 || redDays > 30) return null
  if (!Number.isInteger(orangeDays) || orangeDays < 0 || orangeDays > 60) return null
  if (!Array.isArray(filters) || !filters.every((item) => FILTERS.includes(item))) return null
  return { redDays, orangeDays, filters: FILTERS.filter((item) => filters.includes(item)) }
}
