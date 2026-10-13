import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { useUserStore } from './user'
import { useWorkerStore } from './worker'

/** An event of the schedule of ministries (see worker/src/schedule.ts); days and times are the church's */
export interface ScheduleEvent {
  id: string
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
  mode: 'invite' | 'open'
  responsibleUid: string
  responsibleName: string
  deputyUid: string | null
  deputyName: string | null
}

export type EventDraft = Pick<
  ScheduleEvent,
  | 'ministry'
  | 'title'
  | 'description'
  | 'location'
  | 'day'
  | 'weekdays'
  | 'time'
  | 'until'
  | 'needed'
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
}

/** A minister to choose from */
export interface Person {
  uid: string
  name: string
  ministries: string[]
  phone: string | null
}

/** One day of an event, with its people */
export interface Occurrence {
  event: ScheduleEvent
  day: string
  team: Participant[]
}

/** The schedule of ministries: the next weeks, what the user serves at, and planning it */
export const useScheduleStore = defineStore('schedule', () => {
  const worker = useWorkerStore()
  const user = useUserStore()

  const events = shallowRef<ScheduleEvent[]>([])
  const days = shallowRef<{ eventId: string; day: string }[]>([])
  const participants = shallowRef<Participant[]>([])
  const people = shallowRef<Person[]>([])
  const ministries = shallowRef<string[]>([])
  const locations = shallowRef<string[]>([])
  const today = ref('')

  const occurrences = computed<Occurrence[]>(() =>
    days.value.flatMap(({ eventId, day }) => {
      const event = events.value.find((item) => item.id === eventId)
      if (!event) return []
      const team = participants.value.filter((item) => item.eventId === eventId && item.day === day)
      return [{ event, day, team }]
    })
  )

  /** the user serves there: in the team, as a backup, or as the responsible person */
  const isMine = ({ event, team }: Occurrence) =>
    event.responsibleUid === user.uid ||
    event.deputyUid === user.uid ||
    team.some((item) => (item.uid === user.uid && item.status !== 'declined') || item.backupUid === user.uid)

  /** the user may plan the event: the schedule function, or responsible for it */
  const manages = (event: ScheduleEvent) =>
    worker.manages('schedule') || event.responsibleUid === user.uid || event.deputyUid === user.uid

  async function load(from?: string, to?: string) {
    const query = from ? `?from=${from}${to ? `&to=${to}` : ''}` : ''
    const answer = await worker.request<{
      events: ScheduleEvent[]
      days: { eventId: string; day: string }[]
      participants: Participant[]
      today: string
    }>('GET', `/schedule${query}`)
    events.value = answer.events
    days.value = answer.days
    participants.value = answer.participants
    today.value = answer.today
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

  const saveEvent = async (draft: EventDraft, id?: string) => {
    await worker.request(
      id ? 'PUT' : 'POST',
      id ? `/schedule/events/${encodeURIComponent(id)}` : '/schedule/events',
      draft
    )
    await load()
  }

  const deleteEvent = async (id: string) => {
    await worker.request('DELETE', `/schedule/events/${encodeURIComponent(id)}`)
    await load()
  }

  /** an action on one day of an event, then the schedule again */
  const act = async (method: 'POST' | 'DELETE', path: string, body: Record<string, unknown>) => {
    const answer = await worker.request<Record<string, unknown>>(method, path, body)
    await load()
    return answer
  }

  const invite = (eventId: string, day: string, uid: string, backupUid: string | null) =>
    act('POST', '/schedule/team', { eventId, day, uid, backupUid })
  const removeFromTeam = (eventId: string, day: string, uid: string) =>
    act('DELETE', '/schedule/team', { eventId, day, uid })
  const apply = (eventId: string, day: string) => act('POST', '/schedule/apply', { eventId, day })
  const approve = (eventId: string, day: string, uid: string) =>
    act('POST', '/schedule/approve', { eventId, day, uid })
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

  return {
    events,
    occurrences,
    people,
    ministries,
    locations,
    today,
    isMine,
    manages,
    load,
    loadChoices,
    saveEvent,
    deleteEvent,
    invite,
    removeFromTeam,
    apply,
    approve,
    answer
  }
})
