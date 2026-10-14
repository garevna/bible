import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_TYPES, type NoteType } from '@/utils/noteTypes'
import type { CalendarSettings, EventType } from '@/stores/schedule'
import type { TopicPost } from '@/utils/topicPost'

import { useFirebaseStore } from './firebase'
import { useUserStore } from './user'

/** The Cloudflare Worker (worker/); without it publishing and the dashboard are not offered */
const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '')

/** reader: the app; publisher: also posts to Telegram; admin: also gives the roles */
/** the id of a role of the list kept by the administrators; 'owner' for the owners (every right) */
export type Role = string

/** The functions of administrators, each given to a role on its own (see worker/src/roles.ts) */
export const MANAGE = ['roles', 'users', 'directories', 'types', 'schedule'] as const
export type Manage = (typeof MANAGE)[number]

/** A role and what its people may do */
export interface RoleDef {
  id: string
  name: string
  publish: boolean
  send: boolean
  sendToRoles: string[]
  sendToPeople: boolean
  messageDays: number
  /** approves the people who applied for a ministry of the calendar and gives them roles there */
  approve: boolean
  /** the ministries whose events it invites people to; ANY_MINISTRY: every ministry */
  invite: string[]
  manage: Manage[]
}

/** in the ministries a role invites to: every ministry */
export const ANY_MINISTRY = '*'

/** the reader: everyone who signed in, no rights; it cannot be removed */
export const READER = 'reader'

export interface Rights {
  publish: boolean
  send: boolean
  sendToPeople: boolean
  sendToRoles: string[]
  approve: boolean
  invite: string[]
  manage: Manage[]
}

const NO_RIGHTS: Rights = {
  publish: false,
  send: false,
  sendToPeople: false,
  sendToRoles: [],
  approve: false,
  invite: [],
  manage: []
}

/** A user who signed in to the app, as the dashboard shows it (see worker/src/users.ts) */
export interface UserView {
  uid: string
  email: string | null
  emailVerified: boolean
  name: string | null
  role: Role
  /** the ministries the user serves in, e.g. 'Музичне служіння' */
  ministries?: string[]
  /** the mobile number, '+380501234567' */
  phone?: string
  /** an administrator the dashboard cannot change (the worker settings, OWNERS) */
  owner: boolean
  lastSeen: number
  updatedBy?: string
  updatedAt?: number
}

/** A note or a topic sent in a message (its verses carry their refs, so it can be saved) */
export interface Attachment {
  kind: 'note' | 'topic'
  post: TopicPost
}

/** A day of an event a message asks to answer: as the main person (uid) or as their backup */
export interface Ask {
  eventId: string
  day: string
  uid: string
  as: 'main' | 'backup' | 'apply'
}

/** A message between ministers (see worker/src/messages.ts); it lives for a day */
export interface Message {
  id: string
  fromUid: string
  fromName: string
  toUid: string
  toName: string
  text: string
  attachment: Attachment | null
  replyTo: string | null
  /** an invitation: the days it asks to answer (see worker/src/serviceBot.ts) */
  asks?: Ask[] | null
  createdAt: number
  expiresAt: number
  readAt: number | null
}

/** Whom a publisher or an administrator may write to */
export interface Recipient {
  uid: string
  name: string
  role: Role
  ministries: string[]
  phone: string | null
}

/** how often the number of unread messages is asked for while the app is open */
const UNREAD_EVERY = 60_000

/** the worker answered with an error: its code, e.g. 'owner', 'self', 'forbidden', or 'unreachable' */
export class WorkerError extends Error {}

/** The worker: roles, publishing to the Telegram channel, the dashboard of the roles */
export const useWorkerStore = defineStore('worker', () => {
  const firebase = useFirebaseStore()
  const user = useUserStore()

  const role = ref<Role>(READER)
  const roleName = ref('')
  const rights = ref<Rights>(NO_RIGHTS)
  /** the worker has a bot and a channel */
  const telegram = ref(false)
  /** the ministries of the user */
  const ministries = ref<string[]>([])
  /** publishers and administrators write to people and ministries */
  const canSend = ref(false)
  /** they and the members of ministries get messages */
  const canReceive = ref(false)
  /** the mobile number of the user; ministers are asked for it */
  const phone = ref<string | null>(null)
  const needsPhone = ref(false)
  /** the service bot writes to ministers in Telegram; the user linked it */
  const serviceBot = ref(false)
  const telegramLinked = ref(false)
  /** the types of notes and topics (the administrators keep them; the defaults until they come) */
  const types = ref<NoteType[]>(DEFAULT_TYPES)

  const canPublish = computed(() => telegram.value && rights.value.publish)
  /** the dashboard: for the roles with any function of an administrator */
  const isAdmin = computed(() => rights.value.manage.length > 0)
  const manages = (function_: Manage) => rights.value.manage.includes(function_)

  async function call<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const authUser = firebase.authUser ?? (await firebase.waitForAuth())
    if (!authUser) throw new WorkerError('unauthorized')
    let response: Response
    try {
      response = await fetch(`${workerUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${await authUser.getIdToken()}`,
          ...(body ? { 'content-type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      })
    } catch {
      throw new WorkerError('unreachable')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new WorkerError(data.message || data.error || String(response.status))
    return data as T
  }

  /** Asks the worker who the signed in user is; guests and errors leave the reader role */
  async function loadRole() {
    role.value = READER
    roleName.value = ''
    rights.value = NO_RIGHTS
    telegram.value = false
    ministries.value = []
    canSend.value = canReceive.value = needsPhone.value = false
    serviceBot.value = telegramLinked.value = false
    phone.value = null
    if (!workerUrl || !user.signed) return
    try {
      const me = await call<{
        role: Role
        roleName?: string
        rights?: Rights
        telegram: boolean
        ministries?: string[]
        canSend?: boolean
        canReceive?: boolean
        phone?: string | null
        needsPhone?: boolean
        serviceBot?: boolean
        telegramLinked?: boolean
      }>('GET', '/me')
      role.value = me.role
      roleName.value = me.roleName ?? ''
      rights.value = { ...NO_RIGHTS, ...me.rights }
      telegram.value = me.telegram
      ministries.value = me.ministries ?? []
      canSend.value = Boolean(me.canSend)
      canReceive.value = Boolean(me.canReceive)
      phone.value = me.phone ?? null
      needsPhone.value = Boolean(me.needsPhone)
      serviceBot.value = Boolean(me.serviceBot)
      telegramLinked.value = Boolean(me.telegramLinked)
      types.value = (await call<{ types: NoteType[] }>('GET', '/types')).types
    } catch (error) {
      console.warn('The role is not known\n', error)
    }
  }

  watch(() => user.uid, loadRole, { immediate: true })

  /* ---------- messages ---------- */

  const messages = ref<Message[]>([])
  const unread = ref(0)

  async function loadMessages() {
    if (!canReceive.value) return
    const answer = await call<{ messages: Message[]; unread: number }>('GET', '/messages')
    messages.value = answer.messages
    unread.value = answer.unread
  }

  async function markRead(message: Message) {
    if (message.readAt || message.toUid !== user.uid) return
    message.readAt = Date.now()
    unread.value = Math.max(0, unread.value - 1)
    await call('POST', `/messages/${encodeURIComponent(message.id)}/read`)
  }

  const recipients = () =>
    call<{ people: Recipient[]; ministries: string[]; roles: { id: string; name: string }[] }>(
      'GET',
      '/messages/recipients'
    )

  const sendMessage = async (draft: {
    to?: string[]
    ministries?: string[]
    /** all the people of these roles */
    roles?: string[]
    text: string
    attachment?: Attachment | null
    replyTo?: string | null
  }) => (await call<{ sent: number }>('POST', '/messages', draft)).sent

  // the number of unread messages is kept fresh while the app is open and visible
  let timer: ReturnType<typeof setInterval> | undefined
  const quietly = () => loadMessages().catch(() => undefined)
  watch(canReceive, (value) => {
    clearInterval(timer)
    if (!value) return
    quietly()
    timer = setInterval(() => document.visibilityState === 'visible' && quietly(), UNREAD_EVERY)
  })
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && quietly())

  /** the messages of the post, and the caption of its picture */
  const preview = (post: TopicPost) =>
    call<{ messages: string[]; caption: string | null }>('POST', '/telegram/preview', post)

  const publishToTelegram = async (post: TopicPost) =>
    (await call<{ sent: number }>('POST', '/telegram/publish', post)).sent

  /** the users and the ministries of the church */
  const listUsers = () =>
    call<{ users: UserView[]; roles: RoleDef[]; ministries: string[] }>('GET', '/admin/users')

  /** the roles, types, ministries and locations, for the dashboard */
  const getSettings = () =>
    call<{
      roles: RoleDef[]
      types: NoteType[]
      ministries: string[]
      locations: string[]
      eventTypes: EventType[]
      calendar: CalendarSettings
    }>('GET', '/admin/settings')

  const setEventTypes = async (list: EventType[]) =>
    (await call<{ eventTypes: EventType[] }>('PUT', '/admin/event-types', { eventTypes: list })).eventTypes

  const setCalendar = async (settings: CalendarSettings) =>
    (await call<{ calendar: CalendarSettings }>('PUT', '/admin/calendar', { calendar: settings })).calendar

  const setRoles = async (list: RoleDef[]) =>
    (await call<{ roles: RoleDef[] }>('PUT', '/admin/roles', { roles: list })).roles

  /** the ministries or the locations of the church */
  const setDirectory = async (name: 'ministries' | 'locations', items: string[]) =>
    (await call<{ items: string[] }>('PUT', `/admin/directories/${name}`, { items })).items

  const updateUser = async (
    uid: string,
    change: { role?: Role; ministries?: string[]; phone?: string | null }
  ) => (await call<{ user: UserView }>('PUT', `/admin/users/${encodeURIComponent(uid)}`, change)).user

  const setUserRole = (uid: string, newRole: Role) => updateUser(uid, { role: newRole })

  /** the user gives (or takes away) their own mobile number */
  async function setMyPhone(value: string | null) {
    phone.value = (await call<{ phone: string | null }>('PUT', '/me', { phone: value })).phone
    needsPhone.value = canReceive.value && !phone.value
  }

  /** a one-time link to the service bot: Telegram is linked when the user presses Start there */
  const telegramLink = async () => (await call<{ url: string }>('POST', '/telegram/link')).url

  async function unlinkTelegram() {
    await call('DELETE', '/telegram/link')
    telegramLinked.value = false
  }

  const removeUser = (uid: string) => call('DELETE', `/admin/users/${encodeURIComponent(uid)}`)

  const setTypes = async (list: NoteType[]) => {
    types.value = (await call<{ types: NoteType[] }>('PUT', '/admin/types', { types: list })).types
  }

  return {
    /** a request to the worker with the token of the user (for other stores, e.g. the schedule) */
    request: call,
    role,
    roleName,
    rights,
    manages,
    telegram,
    canPublish,
    isAdmin,
    ministries,
    canSend,
    canReceive,
    phone,
    needsPhone,
    serviceBot,
    telegramLinked,
    telegramLink,
    unlinkTelegram,
    types,
    setTypes,
    setMyPhone,
    messages,
    unread,
    loadRole,
    preview,
    publishToTelegram,
    listUsers,
    updateUser,
    setUserRole,
    removeUser,
    getSettings,
    setEventTypes,
    setCalendar,
    setRoles,
    setDirectory,
    loadMessages,
    markRead,
    recipients,
    sendMessage
  }
})
