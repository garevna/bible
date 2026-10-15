import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import type { TopicPost } from '@/utils/topicPost'

import { useUserStore } from './user'
import { ANY_MINISTRY, useWorkerStore } from './worker'

/** A role of the people of an event and whether they prepare materials for it (see worker/src/eventTypes.ts) */
export interface Slot {
  name: string
  count: number
  materials: boolean
  /** what to prepare, e.g. "Перелік пісень хвали" */
  hint: string
}

/** A type of events kept by the administrators: its roles are none, fixed, or given to each event */
export interface EventType {
  id: string
  name: string
  ministry: string | null
  roles: 'none' | 'fixed' | 'dynamic'
  slots: Slot[]
}

export const FILTERS = ['type', 'ministry', 'event', 'person', 'mine'] as const
export type Filter = (typeof FILTERS)[number]

/** How the calendar marks the days not ready yet: red, then orange (#f50), then amber (#fa0) */
export interface CalendarSettings {
  redDays: number
  orangeDays: number
  filters: Filter[]
}

export const DEFAULT_CALENDAR: CalendarSettings = { redDays: 2, orangeDays: 5, filters: [...FILTERS] }

/** The place of a location: its address, and the point on the map when it was chosen there */
export interface Place {
  address: string
  lat?: number
  lng?: number
}

/** Google Maps in a tab of its own: at the point, or found by the address */
export const mapUrl = (place: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.lat !== undefined && place.lng !== undefined ? `${place.lat},${place.lng}` : place.address
  )}`

export const APPLICANTS = ['ministry', 'servants', 'everyone'] as const
export type Applicants = (typeof APPLICANTS)[number]

/** One day of an event changed: another time or place, another number of people, or cancelled */
export interface DayChange {
  eventId: string
  day: string
  time: string | null
  location: string | null
  needed: number | null
  cancelled: boolean
  note: string
}

/** An event of the schedule of ministries (see worker/src/schedule.ts); days and times are the church's */
export interface ScheduleEvent {
  id: string
  typeId: string | null
  ministry: string
  title: string
  description: string
  location: string
  /** a single event: its day 'YYYY-MM-DD' */
  day: string | null
  /** a repeated event: the days of the week, 0 is Sunday */
  weekdays: number[] | null
  time: string
  until: string | null
  needed: number
  /** a repeated event: its time on some days of the week ('6': '08:00' on Saturday), else `time` */
  times: Record<string, string> | null
  slots: Slot[]
  mode: 'invite' | 'open'
  /** who may apply to an open event */
  applicants: Applicants
  responsibleUid: string
  responsibleName: string
  deputyUid: string | null
  deputyName: string | null
}

export type EventDraft = Pick<
  ScheduleEvent,
  | 'typeId'
  | 'ministry'
  | 'title'
  | 'description'
  | 'location'
  | 'day'
  | 'weekdays'
  | 'time'
  | 'until'
  | 'needed'
  | 'times'
  | 'slots'
  | 'mode'
  | 'applicants'
  | 'responsibleUid'
  | 'deputyUid'
>

export interface Participant {
  eventId: string
  day: string
  uid: string
  name: string
  status: 'invited' | 'applied' | 'confirmed' | 'declined'
  backupUid: string | null
  backupName: string | null
  backupStatus: 'invited' | 'confirmed' | 'declined' | null
  reason: string | null
  role: string | null
}

/** Notes or a topic prepared for a role of one day of an event */
export interface MaterialItem {
  id: string
  eventId: string
  day: string
  role: string
  uid: string
  name: string
  kind: 'note' | 'topic'
  title: string
  createdAt: number
}

export interface Material extends MaterialItem {
  post: TopicPost
}

/** A minister to choose from */
export interface Person {
  uid: string
  name: string
  ministries: string[]
  phone: string | null
}

/** What is not settled at one day of an event */
export type Issue = 'people' | 'roles' | 'materials'

/** One day of an event, with its people and materials, and what the change of the day makes of it */
export interface Occurrence {
  event: ScheduleEvent
  day: string
  time: string
  location: string
  needed: number
  cancelled: boolean
  note: string
  team: Participant[]
  materials: MaterialItem[]
  issues: Issue[]
}

/** The time of an event on a day: the change of the day, the time of its weekday, or its time */
export const timeOf = (
  event: Pick<ScheduleEvent, 'time' | 'times'>,
  day: string,
  change?: Pick<DayChange, 'time'> | null
) => change?.time ?? event.times?.[String(new Date(`${day}T12:00:00Z`).getUTCDay())] ?? event.time

/** How a day of the calendar is marked */
export type DayState = 'ready' | 'red' | 'orange' | 'amber'

export interface Filters {
  type: string | null
  ministry: string | null
  event: string | null
  person: string | null
  mine: boolean
}

const serving = (participant: Participant) => participant.status === 'confirmed'

/** The issues of one day of an event: too few people confirmed, roles not given, materials not sent */
export function issuesOf(
  event: ScheduleEvent,
  team: Participant[],
  materials: MaterialItem[],
  needed = event.needed
): Issue[] {
  const confirmed = team.filter(serving)
  const issues: Issue[] = []
  if (confirmed.length < needed) issues.push('people')
  if (event.slots.some((slot) => confirmed.filter((item) => item.role === slot.name).length < slot.count))
    issues.push('roles')
  const missing = confirmed.some((person) => {
    const slot = event.slots.find((item) => item.name === person.role)
    return slot?.materials && !materials.some((item) => item.uid === person.uid && item.role === slot.name)
  })
  if (missing) issues.push('materials')
  return issues
}

/** days from one day to another */
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)

/** A day with events: green when everything is settled, otherwise as urgent as it is near */
export function dayStateOf(
  occurrences: Pick<Occurrence, 'issues'>[],
  day: string,
  today: string,
  settings: Pick<CalendarSettings, 'redDays' | 'orangeDays'>
): DayState {
  if (occurrences.every((item) => !item.issues.length)) return 'ready'
  const left = daysBetween(today, day)
  if (left < settings.redDays) return 'red'
  return left < settings.redDays + settings.orangeDays ? 'orange' : 'amber'
}

/** 'HH:MM' now in the time zone of the church (the worker counts the days in it too) */
const churchTime = (ms: number) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date(ms))

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** an event is gone from the calendar once it begins (as the worker says): then it is too late to change */
export const isOver = (time: string, now: string) => minutes(time) <= minutes(now)

/**
 * When an event happens, in words: "пн–пт 06:45 · сб 08:00" (Monday first, the days of one time
 * together), or the day of a single event, "чт, 15 жовт. · 10:00"
 */
export function scheduleText(
  event: Pick<ScheduleEvent, 'day' | 'weekdays' | 'time' | 'times' | 'until'>,
  locale: string
): string {
  if (event.day) {
    const date = new Date(`${event.day}T12:00:00`)
    const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(
      date
    )
    return `${day} · ${event.time}`
  }
  const name = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-01 was a Monday
  const short = (weekday: number) => name.format(new Date(2024, 0, weekday === 0 ? 7 : weekday))
  const days = [1, 2, 3, 4, 5, 6, 0].filter((weekday) => event.weekdays?.includes(weekday))
  const groups: { first: number; last: number; time: string; length: number }[] = []
  let previous = -1
  for (const weekday of days) {
    const time = event.times?.[String(weekday)] ?? event.time
    const index = (weekday + 6) % 7
    const group = groups.at(-1)
    if (group && group.time === time && index === previous + 1) {
      group.last = weekday
      group.length++
    } else groups.push({ first: weekday, last: weekday, time, length: 1 })
    previous = index
  }
  const text = groups
    .map((group) =>
      group.length === 1
        ? `${short(group.first)} ${group.time}`
        : `${short(group.first)}–${short(group.last)} ${group.time}`
    )
    .join(' · ')
  if (!event.until) return text
  const until = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
    new Date(`${event.until}T12:00:00`)
  )
  return `${text} (до ${until})`
}

/** 'YYYY-MM-DD' of a date in local time */
export const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** The days the grid of a month shows: from the Monday of its first week to the Sunday of its last */
export function monthGrid(month: string): string[] {
  const [year, index] = month.split('-').map(Number) as [number, number]
  const first = new Date(year, index - 1, 1)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const last = new Date(year, index, 0)
  const end = new Date(last)
  end.setDate(last.getDate() + ((7 - last.getDay()) % 7))
  const days: string[] = []
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) days.push(isoDay(date))
  return days
}

/** The schedule of ministries: a month of it, what the user serves at, and planning it */
export const useScheduleStore = defineStore('schedule', () => {
  const worker = useWorkerStore()
  const user = useUserStore()

  const events = shallowRef<ScheduleEvent[]>([])
  const days = shallowRef<{ eventId: string; day: string }[]>([])
  const participants = shallowRef<Participant[]>([])
  const materials = shallowRef<MaterialItem[]>([])
  const changes = shallowRef<DayChange[]>([])
  const types = shallowRef<EventType[]>([])
  const settings = shallowRef<CalendarSettings>(DEFAULT_CALENDAR)
  const people = shallowRef<Person[]>([])
  const ministries = shallowRef<string[]>([])
  const locations = shallowRef<string[]>([])
  /** the addresses of the locations: a map opens them */
  const addresses = shallowRef<Record<string, Place>>({})
  const today = ref('')
  /** the month shown, 'YYYY-MM' */
  const month = ref(isoDay(new Date()).slice(0, 7))
  const filters = ref<Filters>({ type: null, ministry: null, event: null, person: null, mine: false })
  /** the time of the church, every minute: the events of today go when they are over */
  const now = ref(churchTime(Date.now()))
  setInterval(() => (now.value = churchTime(Date.now())), 60_000)

  const occurrences = computed<Occurrence[]>(() =>
    days.value.flatMap(({ eventId, day }) => {
      const event = events.value.find((item) => item.id === eventId)
      if (!event) return []
      const change = changes.value.find((item) => item.eventId === eventId && item.day === day)
      const time = timeOf(event, day, change)
      if (day === today.value && isOver(time, now.value)) return []
      const team = participants.value.filter((item) => item.eventId === eventId && item.day === day)
      const prepared = materials.value.filter((item) => item.eventId === eventId && item.day === day)
      const needed = change?.needed ?? event.needed
      const cancelled = Boolean(change?.cancelled)
      return [
        {
          event,
          day,
          time,
          location: change?.location ?? event.location,
          needed,
          cancelled,
          note: change?.note ?? '',
          team,
          materials: prepared,
          // a cancelled day asks for nothing
          issues: cancelled ? [] : issuesOf(event, team, prepared, needed)
        }
      ]
    })
  )

  /** the person serves there (in the team or as a backup), or is responsible for it */
  const involves = ({ event, team }: Pick<Occurrence, 'event' | 'team'>, uid: string | null) =>
    event.responsibleUid === uid ||
    event.deputyUid === uid ||
    team.some((item) => (item.uid === uid && item.status !== 'declined') || item.backupUid === uid)

  /** the user serves there: in the team, as a backup, or as the responsible person */
  const isMine = (occurrence: Pick<Occurrence, 'event' | 'team'>) => involves(occurrence, user.uid)

  /** the occurrences the filters of the calendar let through */
  const shown = computed(() => {
    const { type, ministry, event, person, mine } = filters.value
    return occurrences.value.filter(
      (item) =>
        (!type || item.event.typeId === type) &&
        (!ministry || item.event.ministry === ministry) &&
        (!event || item.event.id === event) &&
        (!person || involves(item, person)) &&
        (!mine || isMine(item))
    )
  })

  /** the shown occurrences by day */
  const byDay = computed(() => {
    const map = new Map<string, Occurrence[]>()
    shown.value.forEach((item) => map.set(item.day, [...(map.get(item.day) ?? []), item]))
    map.forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)))
    return map
  })

  const stateOf = (day: string): DayState | null => {
    const list = byDay.value.get(day)
    return list?.length ? dayStateOf(list, day, today.value, settings.value) : null
  }

  /** the user may plan the event: the schedule function, or responsible for it */
  /** the user plans the events of the ministry: the schedule function, or a leader of it */
  const plans = (ministry: string) => worker.manages('schedule') || worker.leads.includes(ministry)
  /** the user may create events: of every ministry, or of the ones they lead */
  const canCreate = computed(() => worker.manages('schedule') || worker.leads.length > 0)

  const manages = (event: ScheduleEvent) =>
    plans(event.ministry) ||
    worker.manages('schedule') ||
    event.responsibleUid === user.uid ||
    event.deputyUid === user.uid

  /** the user takes applications and gives roles: a manager of the event, or a role with that right */
  const approves = (event: ScheduleEvent) => manages(event) || worker.rights.approve

  /** the user invites people to the event: a manager of it, or a role that invites to its ministry */
  const invites = (event: Pick<ScheduleEvent, 'ministry' | 'responsibleUid' | 'deputyUid'>) =>
    worker.manages('schedule') ||
    event.responsibleUid === user.uid ||
    event.deputyUid === user.uid ||
    worker.rights.invite.includes(ANY_MINISTRY) ||
    worker.rights.invite.includes(event.ministry)

  const typeOf = (event: Pick<ScheduleEvent, 'typeId'>) =>
    types.value.find((item) => item.id === event.typeId)

  /** the name of an event: its title, its type, or its ministry */
  const nameOf = (event: ScheduleEvent) => event.title || typeOf(event)?.name || event.ministry

  async function load(from?: string, to?: string) {
    const query = from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''
    const answer = await worker.request<{
      events: ScheduleEvent[]
      days: { eventId: string; day: string }[]
      participants: Participant[]
      materials?: MaterialItem[]
      types?: EventType[]
      calendar?: CalendarSettings
      changes?: DayChange[]
      addresses?: Record<string, Place>
      today: string
    }>('GET', `/schedule${query}`)
    events.value = answer.events.map((event) => ({
      ...event,
      typeId: event.typeId ?? null,
      slots: event.slots ?? [],
      times: event.times ?? null,
      applicants: event.applicants ?? 'ministry'
    }))
    days.value = answer.days
    participants.value = answer.participants.map((item) => ({ ...item, role: item.role ?? null }))
    materials.value = answer.materials ?? []
    types.value = answer.types ?? []
    changes.value = answer.changes ?? []
    addresses.value = answer.addresses ?? addresses.value
    settings.value = { ...DEFAULT_CALENDAR, ...answer.calendar }
    today.value = answer.today
  }

  /** the days of the month from today on (the past is gone) */
  async function loadMonth(value = month.value) {
    month.value = value
    const grid = monthGrid(value)
    const last = grid.at(-1)!
    if (today.value && last < today.value) {
      days.value = []
      return
    }
    const first = today.value && today.value > grid[0]! ? today.value : grid[0]!
    await load(first, last)
  }

  /** the ministers, ministries and locations to choose from when planning */
  async function loadChoices() {
    const [answer, lists] = await Promise.all([
      worker.request<{ people: Person[] }>('GET', '/schedule/people'),
      worker.request<{ ministries: string[]; locations?: string[]; addresses?: Record<string, Place> }>(
        'GET',
        '/ministries'
      )
    ])
    people.value = answer.people
    ministries.value = lists.ministries
    locations.value = lists.locations ?? []
    addresses.value = lists.addresses ?? {}
  }

  const reload = () => loadMonth()

  /** the saved event: a new one gets its invitations next */
  const saveEvent = async (draft: EventDraft, id?: string) => {
    const { event } = await worker.request<{ event: ScheduleEvent }>(
      id ? 'PUT' : 'POST',
      id ? `/schedule/events/${encodeURIComponent(id)}` : '/schedule/events',
      draft
    )
    await reload()
    return event
  }

  const deleteEvent = async (id: string) => {
    await worker.request('DELETE', `/schedule/events/${encodeURIComponent(id)}`)
    await reload()
  }

  /** an action on one day of an event, then the schedule again */
  const act = async (method: 'POST' | 'PUT' | 'DELETE', path: string, body: Record<string, unknown>) => {
    const answer = await worker.request<Record<string, unknown>>(method, path, body)
    await reload()
    return answer
  }

  const invite = (
    eventId: string,
    day: string,
    uid: string,
    backupUid: string | null,
    role: string | null = null
  ) => act('POST', '/schedule/team', { eventId, day, uid, backupUid, role })
  /** invitations to some days of an event, one message to each person */
  const inviteMany = (eventId: string, days: string[], uids: string[]) =>
    act('POST', '/schedule/invitations', { eventId, days, uids })
  /** one day changed (another time, place, number of people) or cancelled; empty: as the event again */
  const saveDay = (
    eventId: string,
    day: string,
    change: Pick<DayChange, 'time' | 'location' | 'needed' | 'cancelled' | 'note'>
  ) => act('PUT', '/schedule/days', { eventId, day, ...change })

  /** somebody without the app (a guest) serves, written by name */
  const addGuest = (eventId: string, day: string, name: string) =>
    act('POST', '/schedule/guest', { eventId, day, name })

  /** an open call for applications in the service channel, for some days */
  const announce = (eventId: string, days: string[]) =>
    worker.request<{ announced: number }>('POST', '/schedule/announce', { eventId, days })
  const removeFromTeam = (eventId: string, day: string, uid: string) =>
    act('DELETE', '/schedule/team', { eventId, day, uid })
  const apply = (eventId: string, day: string) => act('POST', '/schedule/apply', { eventId, day })
  const approve = (eventId: string, day: string, uid: string) =>
    act('POST', '/schedule/approve', { eventId, day, uid })
  const unapprove = (eventId: string, day: string, uid: string) =>
    act('POST', '/schedule/unapprove', { eventId, day, uid })
  const setRole = (eventId: string, day: string, uid: string, role: string | null) =>
    act('POST', '/schedule/role', { eventId, day, uid, role })
  const answer = (
    participant: Participant,
    as: 'main' | 'backup',
    reply: 'confirm' | 'decline',
    reason?: string
  ) =>
    act('POST', '/schedule/answer', {
      eventId: participant.eventId,
      day: participant.day,
      uid: participant.uid,
      as,
      answer: reply,
      reason
    })

  /** the materials of one day of an event, with their notes and verses */
  const loadMaterials = async (eventId: string, day: string) =>
    (
      await worker.request<{ materials: Material[] }>(
        'GET',
        `/schedule/materials?eventId=${encodeURIComponent(eventId)}&day=${day}`
      )
    ).materials

  const addMaterial = (eventId: string, day: string, role: string, kind: 'note' | 'topic', post: TopicPost) =>
    act('POST', '/schedule/materials', { eventId, day, role, kind, post })

  const deleteMaterial = (id: string) => act('DELETE', `/schedule/materials/${encodeURIComponent(id)}`, {})

  return {
    events,
    occurrences,
    shown,
    byDay,
    types,
    settings,
    people,
    ministries,
    locations,
    addresses,
    today,
    month,
    filters,
    isMine,
    manages,
    approves,
    invites,
    plans,
    canCreate,
    saveDay,
    addGuest,
    typeOf,
    nameOf,
    stateOf,
    load,
    loadMonth,
    loadChoices,
    saveEvent,
    deleteEvent,
    invite,
    inviteMany,
    announce,
    removeFromTeam,
    apply,
    approve,
    unapprove,
    setRole,
    answer,
    loadMaterials,
    addMaterial,
    deleteMaterial
  }
})
