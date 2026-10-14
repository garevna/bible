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
  slots: Slot[]
  mode: 'invite' | 'open'
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
  | 'slots'
  | 'mode'
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

/** One day of an event, with its people and materials */
export interface Occurrence {
  event: ScheduleEvent
  day: string
  team: Participant[]
  materials: MaterialItem[]
  issues: Issue[]
}

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
export function issuesOf(event: ScheduleEvent, team: Participant[], materials: MaterialItem[]): Issue[] {
  const confirmed = team.filter(serving)
  const issues: Issue[] = []
  if (confirmed.length < event.needed) issues.push('people')
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

/** an event is over an hour after it begins, and gone from the calendar (as the worker says) */
export const isOver = (time: string, now: string) => minutes(time) + 60 <= minutes(now)

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
  const types = shallowRef<EventType[]>([])
  const settings = shallowRef<CalendarSettings>(DEFAULT_CALENDAR)
  const people = shallowRef<Person[]>([])
  const ministries = shallowRef<string[]>([])
  const locations = shallowRef<string[]>([])
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
      if (!event || (day === today.value && isOver(event.time, now.value))) return []
      const team = participants.value.filter((item) => item.eventId === eventId && item.day === day)
      const prepared = materials.value.filter((item) => item.eventId === eventId && item.day === day)
      return [{ event, day, team, materials: prepared, issues: issuesOf(event, team, prepared) }]
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
    return map
  })

  const stateOf = (day: string): DayState | null => {
    const list = byDay.value.get(day)
    return list?.length ? dayStateOf(list, day, today.value, settings.value) : null
  }

  /** the user may plan the event: the schedule function, or responsible for it */
  const manages = (event: ScheduleEvent) =>
    worker.manages('schedule') || event.responsibleUid === user.uid || event.deputyUid === user.uid

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
      today: string
    }>('GET', `/schedule${query}`)
    events.value = answer.events.map((event) => ({
      ...event,
      typeId: event.typeId ?? null,
      slots: event.slots ?? []
    }))
    days.value = answer.days
    participants.value = answer.participants.map((item) => ({ ...item, role: item.role ?? null }))
    materials.value = answer.materials ?? []
    types.value = answer.types ?? []
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
      worker.request<{ ministries: string[]; locations?: string[] }>('GET', '/ministries')
    ])
    people.value = answer.people
    ministries.value = lists.ministries
    locations.value = lists.locations ?? []
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
  const act = async (method: 'POST' | 'DELETE', path: string, body: Record<string, unknown>) => {
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
    today,
    month,
    filters,
    isMine,
    manages,
    approves,
    invites,
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
