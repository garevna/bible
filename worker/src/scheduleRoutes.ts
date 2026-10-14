import type { CalendarSettings, EventType } from './eventTypes'
import { MESSAGE_LIFE, type Message, type MessagesStore } from './messages'
import { parsePost } from './post'
import { ANY_MINISTRY, type RoleDef } from './roles'
import type { Ask, ServiceBot } from './serviceBot'
import {
  atLocal,
  daysOf,
  isOver,
  LASTS,
  localDay,
  parseEvent,
  type Material,
  type Participant,
  type ScheduleEvent,
  type ScheduleStore
} from './schedule'
import type { UserRecord, UserView } from './users'

/**
 * The schedule of ministries.
 *   GET    /schedule?from&to          the events with their days, people and materials (at most 62 days),
 *                                     the types of events and the settings of the calendar
 *   GET    /schedule/people           the ministers to choose from
 *   POST   /schedule/events           a new event                                   schedule
 *   PUT    /schedule/events/:id       changes it                                    schedule, its responsible people
 *   DELETE /schedule/events/:id       removes it                                    schedule, its responsible person
 *   POST   /schedule/team             { eventId, day, uid, backupUid?, role? }: invites   the inviters of the event
 *   POST   /schedule/invitations      { eventId, days, uids }: invites people to some days   the inviters
 *   POST   /schedule/announce         { eventId, days? }: an open call in the service channel   the inviters
 *                                     (a new open event is announced by itself, for its coming week)
 *   DELETE /schedule/team             { eventId, day, uid }                          the managers of the event
 *   POST   /schedule/apply            { eventId, day }: asks to serve (an open event, its ministry)
 *   POST   /schedule/approve          { eventId, day, uid }: takes an application   the approvers of the event
 *   POST   /schedule/unapprove        { eventId, day, uid }: back to the applications   the approvers
 *   POST   /schedule/role             { eventId, day, uid, role }: gives a role (null takes it)   the approvers
 *   POST   /schedule/answer           { eventId, day, uid, as: 'main' | 'backup', answer: 'confirm' | 'decline', reason? }
 *   GET    /schedule/materials?eventId&day   the materials of one day of an event, with their posts
 *   POST   /schedule/materials        { eventId, day, role, kind, post }   the person of the role, the approvers
 *   DELETE /schedule/materials/:id    its author, the approvers
 * The managers of an event: the roles with the schedule function, its responsible person and the deputy.
 * The approvers: the managers and the roles with the right to approve.
 * The inviters: the managers and the roles that invite to the ministry of the event.
 */
export interface ScheduleContext {
  me: UserRecord
  rights: RoleDef
  /** the people who serve (not the readers), with their resolved roles */
  servants: UserView[]
  /** the people whose role plans the schedule: they get the emergencies too */
  planners: string[]
  eventTypes: EventType[]
  calendar: CalendarSettings
  schedule: ScheduleStore
  messages: MessagesStore
  /** the service bot: the same notices in private in Telegram, with buttons for the invitations */
  bot: ServiceBot
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
  const { me, rights, servants, planners, eventTypes, calendar, schedule, messages, bot, now } = context
  const url = new URL(request.url)
  const route = `${request.method} ${url.pathname}`
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>
  const today = localDay(now)
  const plans = rights.manage.includes('schedule')
  const manages = (event: ScheduleEvent) =>
    plans || me.uid === event.responsibleUid || me.uid === event.deputyUid
  const approves = (event: ScheduleEvent) => manages(event) || rights.approve
  const invites = (event: ScheduleEvent) =>
    manages(event) || rights.invite.includes(ANY_MINISTRY) || rights.invite.includes(event.ministry)
  const servant = (uid: unknown) =>
    typeof uid === 'string' ? servants.find((user) => user.uid === uid) : undefined

  /**
   * A message from the user to some people (the events speak through the messages), and the same in
   * Telegram for the linked ones; an invitation gets buttons there for its answers
   */
  async function notify(uids: (string | null | undefined)[], text: string, asks?: Ask[]) {
    const to = [...new Set(uids.filter((uid): uid is string => Boolean(uid) && uid !== me.uid))]
    if (!to.length) return
    const toName = (uid: string) => nameOf(servant(uid) ?? { uid, name: null, email: null })
    const list: Message[] = to.map((uid) => ({
      id: crypto.randomUUID(),
      fromUid: me.uid,
      fromName: nameOf(me),
      toUid: uid,
      toName: toName(uid),
      text,
      attachment: null,
      replyTo: null,
      createdAt: now,
      expiresAt: until,
      readAt: null
    }))
    await messages.insert(list)
    await Promise.all(to.map((uid) => bot.send(uid, text, asks)))
    // the service channel: the same, with whom it is for; the invited answer there by the same buttons
    await bot.broadcast(
      `${text}
👤 ${to.map(toName).join(', ')}`,
      asks
    )
  }

  /** the notices of an event live until it is over (the last of its days), not to pile up */
  let until = now + 2 * MESSAGE_LIFE
  const lastsUntil = (event: ScheduleEvent, days: string[]) => {
    const end = Math.max(...days.map((day) => atLocal(day, event.time) + LASTS))
    until = Math.max(end, now + 10 * 60 * 1000)
  }

  /**
   * An open call in the service channel: whoever of the ministry presses "Подати заявку" applies
   * (the days of the coming week when none are given)
   */
  async function announce(event: ScheduleEvent, days?: string[]) {
    const coming =
      days ??
      daysOf(event, today, addDays(today, 13))
        .filter((day) => day !== today || !isOver(day, event.time, now))
        .slice(0, 7)
    if (!coming.length) return 0
    await bot.broadcast(
      `🙋 Набір на служіння: ${eventLabel(event, coming.join(', '))}
Заявку подають учасники служіння «${event.ministry}» — кнопкою нижче або в календарі служінь.`,
      coming.map((day) => ({ eventId: event.id, day, uid: '', as: 'apply' as const }))
    )
    return coming.length
  }

  /** the event and one of its days, not in the past */
  async function eventDay(
    eventId: unknown = body.eventId,
    dayOf: unknown = body.day
  ): Promise<{ event: ScheduleEvent; day: string } | Response> {
    const event = typeof eventId === 'string' ? await schedule.event(eventId) : null
    const day = typeof dayOf === 'string' ? dayOf : ''
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
        daysOf(event, from < today ? today : from, to)
          // the events of today that are over are gone
          .filter((day) => day !== today || !isOver(day, event.time, now))
          .map((day) => ({ eventId: event.id, day, time: event.time }))
      )
      .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time))
      .map(({ eventId, day }) => ({ eventId, day }))
    return json({
      events,
      days,
      participants: await schedule.participants(from, to),
      materials: await schedule.materials(from, to),
      types: eventTypes,
      calendar,
      today
    })
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

  if (route === 'GET /schedule/materials') {
    const found = await eventDay(url.searchParams.get('eventId'), url.searchParams.get('day'))
    if (found instanceof Response) return found
    return json({ materials: await schedule.materialsOf(found.event.id, found.day) })
  }

  const materialId = url.pathname.match(/^\/schedule\/materials\/([^/]+)$/)?.[1]
  if (materialId && request.method === 'DELETE') {
    const material = await schedule.material(decodeURIComponent(materialId))
    const event = material ? await schedule.event(material.eventId) : null
    if (!material || !event) return json({ error: 'not-found' }, 404)
    if (material.uid !== me.uid && !approves(event)) return json({ error: 'forbidden' }, 403)
    await schedule.deleteMaterial(material.id)
    return json({ removed: material.id })
  }

  const eventId = url.pathname.match(/^\/schedule\/events\/([^/]+)$/)?.[1]

  if (route === 'POST /schedule/events' || (eventId && request.method === 'PUT')) {
    const old = eventId ? await schedule.event(decodeURIComponent(eventId)) : null
    if (eventId && !old) return json({ error: 'not-found' }, 404)
    if (old ? !manages(old) : !plans) return json({ error: 'forbidden' }, 403)
    const draft = parseEvent(body)
    if (!draft) return json({ error: 'bad-request' }, 400)
    const type = draft.typeId ? eventTypes.find((item) => item.id === draft.typeId) : null
    if (draft.typeId && !type) return json({ error: 'unknown-type' }, 400)
    const responsible =
      servant(draft.responsibleUid) ?? (draft.responsibleUid === me.uid ? { ...me, owner: false } : undefined)
    const deputy = draft.deputyUid ? servant(draft.deputyUid) : null
    if (!responsible || deputy === undefined) return json({ error: 'unknown-person' }, 400)
    // the roles of a type with fixed roles are its own; a type without roles has none
    const slots = type?.roles === 'fixed' ? type.slots : type?.roles === 'none' ? [] : draft.slots
    const event: ScheduleEvent = {
      ...draft,
      slots,
      // with roles, as many people as the roles take
      needed: slots.length ? slots.reduce((sum, slot) => sum + slot.count, 0) : draft.needed,
      id: old?.id ?? crypto.randomUUID(),
      responsibleName: nameOf(responsible),
      deputyUid: deputy?.uid ?? null,
      deputyName: deputy ? nameOf(deputy) : null,
      createdBy: old?.createdBy ?? me.uid,
      createdAt: old?.createdAt ?? now
    }
    await schedule.putEvent(event)
    // a new open event calls for applications in the service channel
    if (!old && event.mode === 'open') await announce(event)
    return json({ event })
  }

  if (eventId && request.method === 'DELETE') {
    const event = await schedule.event(decodeURIComponent(eventId))
    if (!event) return json({ error: 'not-found' }, 404)
    if (!plans && me.uid !== event.responsibleUid) return json({ error: 'forbidden' }, 403)
    await schedule.deleteEvent(event.id)
    return json({ removed: event.id })
  }

  if (route === 'POST /schedule/announce') {
    const event = typeof body.eventId === 'string' ? await schedule.event(body.eventId) : null
    if (!event) return json({ error: 'not-found' }, 404)
    if (!invites(event)) return json({ error: 'forbidden' }, 403)
    if (event.mode !== 'open') return json({ error: 'not-open' }, 409)
    const days = Array.isArray(body.days) ? [...new Set(body.days)] : undefined
    if (days?.some((day) => typeof day !== 'string' || day < today || !daysOf(event, day, day).length))
      return json({ error: 'not-found' }, 404)
    return json({ announced: await announce(event, days as string[] | undefined) })
  }

  // invitations to some days of an event: one message to each person, with the days
  if (route === 'POST /schedule/invitations') {
    const event = typeof body.eventId === 'string' ? await schedule.event(body.eventId) : null
    if (!event) return json({ error: 'not-found' }, 404)
    if (!invites(event)) return json({ error: 'forbidden' }, 403)
    const days = Array.isArray(body.days) ? [...new Set(body.days)] : []
    const uids = Array.isArray(body.uids) ? [...new Set(body.uids)] : []
    const people = uids.map((uid) => servant(uid) ?? (uid === me.uid ? { ...me, owner: false } : undefined))
    if (!days.length || days.length > MAX_DAYS || !uids.length || uids.length > 100) {
      return json({ error: 'bad-request' }, 400)
    }
    if (days.some((day) => typeof day !== 'string' || day < today || !daysOf(event, day, day).length))
      return json({ error: 'not-found' }, 404)
    if (people.some((person) => !person)) return json({ error: 'unknown-person' }, 400)
    const team = await schedule.participants(today, addDays(today, 366))
    lastsUntil(event, days as string[])
    let invited = 0
    for (const person of people as UserView[]) {
      // whoever is there already keeps their place and answer
      const free = (days as string[]).filter(
        (day) =>
          !team.some((item) => item.eventId === event.id && item.day === day && item.uid === person.uid)
      )
      const self = person.uid === me.uid
      for (const day of free) {
        await schedule.putParticipant({
          eventId: event.id,
          day,
          uid: person.uid,
          name: nameOf(person),
          status: self ? 'confirmed' : 'invited',
          backupUid: null,
          backupName: null,
          backupStatus: null,
          reason: null,
          role: null,
          updatedAt: now
        })
        invited++
      }
      free.length &&
        !self &&
        (await notify(
          [person.uid],
          `Запрошення на служіння: ${eventLabel(event, free.sort().join(', '))}. Підтвердіть, будь ласка, у календарі служінь.`,
          free.map((day) => ({ eventId: event.id, day, uid: person.uid, as: 'main' as const }))
        ))
    }
    return json({ invited })
  }

  const found = await eventDay()
  if (found instanceof Response) return found
  const { event, day } = found
  const label = eventLabel(event, day)
  lastsUntil(event, [day])
  const slotOf = (role: unknown) => event.slots.find((slot) => slot.name === role)

  /** a role may be given: it is a role of the event and not all its places are taken by others */
  async function roleIsFree(role: string, uid: string) {
    const slot = slotOf(role)
    if (!slot) return false
    const team = (await schedule.participants(day, day)).filter(
      (item) => item.eventId === event.id && item.uid !== uid && item.status !== 'declined'
    )
    return team.filter((item) => item.role === role).length < slot.count
  }

  if (route === 'POST /schedule/team') {
    if (!invites(event)) return json({ error: 'forbidden' }, 403)
    const person = servant(body.uid) ?? (body.uid === me.uid ? { ...me, owner: false } : undefined)
    const backup = body.backupUid ? servant(body.backupUid) : null
    if (!person || backup === undefined || backup?.uid === person.uid)
      return json({ error: 'unknown-person' }, 400)
    const role = typeof body.role === 'string' && body.role ? body.role : null
    if (role && !(await roleIsFree(role, person.uid))) return json({ error: 'role-taken' }, 409)
    // the manager who adds themself serves at once
    const self = person.uid === me.uid
    const participant: Participant = {
      eventId: event.id,
      day,
      uid: person.uid,
      name: nameOf(person),
      status: self ? 'confirmed' : 'invited',
      backupUid: backup?.uid ?? null,
      backupName: backup ? nameOf(backup) : null,
      backupStatus: backup ? 'invited' : null,
      reason: null,
      role,
      updatedAt: now
    }
    await schedule.putParticipant(participant)
    self ||
      (await notify(
        [person.uid],
        `Запрошення на служіння: ${label}${role ? ` (${role})` : ''}. Підтвердіть, будь ласка, у календарі служінь.`,
        [{ eventId: event.id, day, uid: person.uid, as: 'main' }]
      ))
    backup &&
      (await notify(
        [backup.uid],
        `Вас просять бути дублером (${nameOf(person)}): ${label}. Підтвердіть, будь ласка, у календарі.`,
        [{ eventId: event.id, day, uid: person.uid, as: 'backup' }]
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
    // the approvers do not apply to themselves: they serve at once, at any event they approve
    const self = approves(event)
    if (!self && (event.mode !== 'open' || !member.ministries?.includes(event.ministry)))
      return json({ error: 'forbidden' }, 403)
    if (await schedule.participant(event.id, day, me.uid)) return json({ error: 'already' }, 409)
    const participant: Participant = {
      eventId: event.id,
      day,
      uid: me.uid,
      name: nameOf(me),
      status: self ? 'confirmed' : 'applied',
      backupUid: null,
      backupName: null,
      backupStatus: null,
      reason: null,
      role: null,
      updatedAt: now
    }
    await schedule.putParticipant(participant)
    self ||
      (await notify(
        [event.responsibleUid, event.deputyUid],
        `Заявка на служіння від ${nameOf(me)}: ${label}`
      ))
    return json({ participant })
  }

  if (route === 'POST /schedule/approve' || route === 'POST /schedule/unapprove') {
    if (!approves(event)) return json({ error: 'forbidden' }, 403)
    const approve = route === 'POST /schedule/approve'
    const participant =
      typeof body.uid === 'string' ? await schedule.participant(event.id, day, body.uid) : null
    if (!participant || participant.status !== (approve ? 'applied' : 'confirmed'))
      return json({ error: 'not-found' }, 404)
    await schedule.putParticipant({
      ...participant,
      status: approve ? 'confirmed' : 'applied',
      // back among the applications, the person has no role
      role: approve ? participant.role : null,
      updatedAt: now
    })
    approve && (await notify([participant.uid], `Вашу заявку прийнято: ${label}`))
    return json({ [approve ? 'approved' : 'unapproved']: participant.uid })
  }

  if (route === 'POST /schedule/role') {
    if (!approves(event)) return json({ error: 'forbidden' }, 403)
    const participant =
      typeof body.uid === 'string' ? await schedule.participant(event.id, day, body.uid) : null
    if (!participant || participant.status === 'declined' || participant.status === 'applied')
      return json({ error: 'not-found' }, 404)
    const role = body.role === null ? null : typeof body.role === 'string' ? body.role : undefined
    if (role === undefined || (role !== null && !slotOf(role))) return json({ error: 'bad-request' }, 400)
    // a taken role is freed before it is given to another person
    if (role && !(await roleIsFree(role, participant.uid))) return json({ error: 'role-taken' }, 409)
    await schedule.putParticipant({ ...participant, role, updatedAt: now })
    role &&
      role !== participant.role &&
      (await notify(
        [participant.uid],
        `Ваша роль — «${role}»: ${label}.${slotOf(role)?.materials ? ` Підготуйте, будь ласка: ${slotOf(role)?.hint || 'матеріали'}.` : ''}`
      ))
    return json({ participant: { ...participant, role } })
  }

  if (route === 'POST /schedule/materials') {
    const slot = slotOf(body.role)
    const kind = body.kind === 'topic' ? 'topic' : body.kind === 'note' ? 'note' : null
    const post = parsePost(body.post)
    if (!slot || !kind || !post) return json({ error: 'bad-request' }, 400)
    const own = await schedule.participant(event.id, day, me.uid)
    const ofTheRole = own && own.role === slot.name && own.status !== 'declined' && own.status !== 'applied'
    if (!ofTheRole && !approves(event)) return json({ error: 'forbidden' }, 403)
    // pictures stay out: they would make the schedule heavy
    const { image: _image, ...withoutImage } = post
    const material: Material = {
      id: crypto.randomUUID(),
      eventId: event.id,
      day,
      role: slot.name,
      uid: me.uid,
      name: nameOf(me),
      kind,
      title: post.title || (post.items[0]?.kind === 'note' ? post.items[0].text.slice(0, 80) : ''),
      post: withoutImage,
      createdAt: now
    }
    await schedule.putMaterial(material)
    ofTheRole &&
      (await notify(
        [event.responsibleUid, event.deputyUid],
        `${nameOf(me)} підготував(ла) матеріали («${slot.name}»): ${label}`
      ))
    return json({ material })
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

    // the main one cannot: the role is freed, the backup who agreed takes the place, otherwise an emergency
    await schedule.putParticipant({ ...participant, status: 'declined', reason, role: null, updatedAt: now })
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
        role: participant.role,
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
