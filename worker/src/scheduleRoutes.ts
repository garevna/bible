import { MESSAGE_LIFE, type Message, type MessagesStore } from './messages'
import type { RoleDef } from './roles'
import {
  daysOf,
  localDay,
  parseEvent,
  type Participant,
  type ScheduleEvent,
  type ScheduleStore
} from './schedule'
import type { UserRecord, UserView } from './users'

/**
 * The schedule of ministries.
 *   GET    /schedule?from&to          the events with their days and people (at most 62 days)
 *   GET    /schedule/people           the ministers to choose from
 *   POST   /schedule/events           a new event                                   schedule
 *   PUT    /schedule/events/:id       changes it                                    schedule, its responsible people
 *   DELETE /schedule/events/:id       removes it                                    schedule, its responsible person
 *   POST   /schedule/team             { eventId, day, uid, backupUid? }: invites    the managers of the event
 *   DELETE /schedule/team             { eventId, day, uid }                          the managers of the event
 *   POST   /schedule/apply            { eventId, day }: asks to serve (an open event, its ministry)
 *   POST   /schedule/approve          { eventId, day, uid }: takes an application   the managers of the event
 *   POST   /schedule/answer           { eventId, day, uid, as: 'main' | 'backup', answer: 'confirm' | 'decline', reason? }
 * The managers of an event: the roles with the schedule function, its responsible person and the deputy.
 */
export interface ScheduleContext {
  me: UserRecord
  rights: RoleDef
  /** the people who serve (not the readers), with their resolved roles */
  servants: UserView[]
  /** the people whose role plans the schedule: they get the emergencies too */
  planners: string[]
  schedule: ScheduleStore
  messages: MessagesStore
  now: number
}

const MAX_DAYS = 62

const nameOf = (user: Pick<UserRecord, 'name' | 'email' | 'uid'>) => user.name ?? user.email ?? user.uid

/** "Музичне служіння: Неділя — 2026-10-20 10:00, Церква" */
export const eventLabel = (event: ScheduleEvent, day: string) =>
  `${event.ministry}${event.title ? `: ${event.title}` : ''} — ${day} ${event.time}${event.location ? `, ${event.location}` : ''}`

function addDays(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

export async function handleSchedule(
  request: Request,
  context: ScheduleContext,
  json: (body: unknown, status?: number) => Response
): Promise<Response> {
  const { me, rights, servants, planners, schedule, messages, now } = context
  const url = new URL(request.url)
  const route = `${request.method} ${url.pathname}`
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const today = localDay(now)
  const plans = rights.manage.includes('schedule')
  const manages = (event: ScheduleEvent) =>
    plans || me.uid === event.responsibleUid || me.uid === event.deputyUid
  const servant = (uid: unknown) =>
    typeof uid === 'string' ? servants.find((user) => user.uid === uid) : undefined

  /** a message from the user to some people (the events speak through the messages) */
  async function notify(uids: (string | null | undefined)[], text: string) {
    const to = [...new Set(uids.filter((uid): uid is string => Boolean(uid) && uid !== me.uid))]
    const list: Message[] = to.map((uid) => ({
      id: crypto.randomUUID(),
      fromUid: me.uid,
      fromName: nameOf(me),
      toUid: uid,
      toName: nameOf(servant(uid) ?? { uid, name: null, email: null }),
      text,
      attachment: null,
      replyTo: null,
      createdAt: now,
      expiresAt: now + 2 * MESSAGE_LIFE,
      readAt: null
    }))
    list.length && (await messages.insert(list))
  }

  /** the event and one of its days, not in the past */
  async function eventDay(): Promise<{ event: ScheduleEvent; day: string } | Response> {
    const event = typeof body.eventId === 'string' ? await schedule.event(body.eventId) : null
    const day = typeof body.day === 'string' ? body.day : ''
    if (!event || day < today || !daysOf(event, day, day).length) return json({ error: 'not-found' }, 404)
    return { event, day }
  }

  if (route === 'GET /schedule') {
    const from = url.searchParams.get('from') ?? today
    const to = url.searchParams.get('to') ?? addDays(from, 30)
    if (to < from || to > addDays(from, MAX_DAYS)) return json({ error: 'bad-request' }, 400)
    const events = await schedule.events(from, to)
    const days = events
      .flatMap((event) =>
        daysOf(event, from < today ? today : from, to).map((day) => ({
          eventId: event.id,
          day,
          time: event.time
        }))
      )
      .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time))
      .map(({ eventId, day }) => ({ eventId, day }))
    return json({ events, days, participants: await schedule.participants(from, to), today })
  }

  // the ministers to choose from: the responsible people, the team and the backups
  if (route === 'GET /schedule/people') {
    return json({
      people: servants.map((user) => ({
        uid: user.uid,
        name: nameOf(user),
        ministries: user.ministries ?? [],
        // the phones only for the ones who plan
        phone: plans ? (user.phone ?? null) : null
      }))
    })
  }

  const eventId = url.pathname.match(/^\/schedule\/events\/([^/]+)$/)?.[1]

  if (route === 'POST /schedule/events' || (eventId && request.method === 'PUT')) {
    const old = eventId ? await schedule.event(decodeURIComponent(eventId)) : null
    if (eventId && !old) return json({ error: 'not-found' }, 404)
    if (old ? !manages(old) : !plans) return json({ error: 'forbidden' }, 403)
    const draft = parseEvent(body)
    if (!draft) return json({ error: 'bad-request' }, 400)
    const responsible =
      servant(draft.responsibleUid) ?? (draft.responsibleUid === me.uid ? { ...me, owner: false } : undefined)
    const deputy = draft.deputyUid ? servant(draft.deputyUid) : null
    if (!responsible || deputy === undefined) return json({ error: 'unknown-person' }, 400)
    const event: ScheduleEvent = {
      ...draft,
      id: old?.id ?? crypto.randomUUID(),
      responsibleName: nameOf(responsible),
      deputyUid: deputy?.uid ?? null,
      deputyName: deputy ? nameOf(deputy) : null,
      createdBy: old?.createdBy ?? me.uid,
      createdAt: old?.createdAt ?? now
    }
    await schedule.putEvent(event)
    return json({ event })
  }

  if (eventId && request.method === 'DELETE') {
    const event = await schedule.event(decodeURIComponent(eventId))
    if (!event) return json({ error: 'not-found' }, 404)
    if (!plans && me.uid !== event.responsibleUid) return json({ error: 'forbidden' }, 403)
    await schedule.deleteEvent(event.id)
    return json({ removed: event.id })
  }

  const found = await eventDay()
  if (found instanceof Response) return found
  const { event, day } = found
  const label = eventLabel(event, day)

  if (route === 'POST /schedule/team') {
    if (!manages(event)) return json({ error: 'forbidden' }, 403)
    const person = servant(body.uid)
    const backup = body.backupUid ? servant(body.backupUid) : null
    if (!person || backup === undefined || backup?.uid === person.uid)
      return json({ error: 'unknown-person' }, 400)
    const participant: Participant = {
      eventId: event.id,
      day,
      uid: person.uid,
      name: nameOf(person),
      status: 'invited',
      backupUid: backup?.uid ?? null,
      backupName: backup ? nameOf(backup) : null,
      backupStatus: backup ? 'invited' : null,
      reason: null,
      updatedAt: now
    }
    await schedule.putParticipant(participant)
    await notify(
      [person.uid],
      `Запрошення на служіння: ${label}. Підтвердіть, будь ласка, у календарі служінь.`
    )
    backup &&
      (await notify(
        [backup.uid],
        `Вас просять бути дублером (${nameOf(person)}): ${label}. Підтвердіть, будь ласка, у календарі.`
      ))
    return json({ participant })
  }

  if (route === 'DELETE /schedule/team') {
    if (!manages(event) || typeof body.uid !== 'string') return json({ error: 'forbidden' }, 403)
    await schedule.deleteParticipant(event.id, day, body.uid)
    return json({ removed: body.uid })
  }

  if (route === 'POST /schedule/apply') {
    const member = servant(me.uid) ?? { ...me, owner: false }
    if (event.mode !== 'open' || !member.ministries?.includes(event.ministry))
      return json({ error: 'forbidden' }, 403)
    if (await schedule.participant(event.id, day, me.uid)) return json({ error: 'already' }, 409)
    const participant: Participant = {
      eventId: event.id,
      day,
      uid: me.uid,
      name: nameOf(me),
      status: 'applied',
      backupUid: null,
      backupName: null,
      backupStatus: null,
      reason: null,
      updatedAt: now
    }
    await schedule.putParticipant(participant)
    await notify([event.responsibleUid, event.deputyUid], `Заявка на служіння від ${nameOf(me)}: ${label}`)
    return json({ participant })
  }

  if (route === 'POST /schedule/approve') {
    if (!manages(event)) return json({ error: 'forbidden' }, 403)
    const participant =
      typeof body.uid === 'string' ? await schedule.participant(event.id, day, body.uid) : null
    if (!participant || participant.status !== 'applied') return json({ error: 'not-found' }, 404)
    await schedule.putParticipant({ ...participant, status: 'confirmed', updatedAt: now })
    await notify([participant.uid], `Вашу заявку прийнято: ${label}`)
    return json({ approved: participant.uid })
  }

  if (route === 'POST /schedule/answer') {
    const participant =
      typeof body.uid === 'string' ? await schedule.participant(event.id, day, body.uid) : null
    const asBackup = body.as === 'backup'
    const confirm = body.answer === 'confirm'
    const reason =
      typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : null
    if (!participant || (asBackup ? participant.backupUid : participant.uid) !== me.uid) {
      return json({ error: 'forbidden' }, 403)
    }
    const managers = [event.responsibleUid, event.deputyUid]
    const because = reason ? ` Причина: ${reason}` : ''

    if (asBackup) {
      await schedule.putParticipant({
        ...participant,
        backupStatus: confirm ? 'confirmed' : 'declined',
        updatedAt: now
      })
      confirm ||
        (await notify(
          managers,
          `${nameOf(me)} не може бути дублером (${participant.name}): ${label}.${because}`
        ))
      return json({ answered: true })
    }

    if (confirm) {
      await schedule.putParticipant({ ...participant, status: 'confirmed', reason: null, updatedAt: now })
      return json({ answered: true })
    }

    // the main one cannot: the backup who agreed takes the place, otherwise an emergency
    await schedule.putParticipant({ ...participant, status: 'declined', reason, updatedAt: now })
    if (participant.backupUid && participant.backupStatus === 'confirmed') {
      await schedule.putParticipant({
        eventId: event.id,
        day,
        uid: participant.backupUid,
        name: participant.backupName ?? participant.backupUid,
        status: 'confirmed',
        backupUid: null,
        backupName: null,
        backupStatus: null,
        reason: null,
        updatedAt: now
      })
      await notify([participant.backupUid], `Ви ведете замість ${participant.name}: ${label}. Дякуємо!`)
      await notify(
        managers,
        `Відмова від служіння: ${participant.name}, ${label}.${because} Замість нього (неї) — дублер ${participant.backupName}.`
      )
      return json({ answered: true, replacedBy: participant.backupUid })
    }
    await notify(
      [...managers, ...planners],
      `⚠ ТЕРМІНОВО: на служінні нікого немає. ${participant.name} не може, дублера немає: ${label}.${because}`
    )
    return json({ answered: true, emergency: true })
  }

  return json({ error: 'not-found' }, 404)
}
