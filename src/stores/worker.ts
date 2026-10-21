import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_TYPES, type NoteType } from '@/utils/noteTypes'
import type { CalendarSettings, EventType, MaterialKind, Place } from '@/stores/schedule'
import type { TopicPost } from '@/utils/topicPost'

import { useFirebaseStore } from './firebase'
import { useUserStore } from './user'

/** The Cloudflare Worker (worker/); without it publishing and the dashboard are not offered */
const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '')

/** the status of a user: 'supervisor', 'admin', 'servant' or 'reader'; 'owner' for the owners (every right) */
export type Role = string

/** The functions of administrators, each given to a role on its own (see worker/src/roles.ts) */
export const MANAGE = ['roles', 'users', 'directories', 'types', 'schedule'] as const
export type Manage = (typeof MANAGE)[number]

/** A status and what its people may do everywhere (the type keeps its old name: see worker/src/roles.ts) */
export interface RoleDef {
  id: string
  name: string
  publish: boolean
  /** decides whether a post may go to the channel */
  approvePosts?: boolean
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

/** the reader: everyone who signed in, no rights */
export const READER = 'reader'
/** the supervisor: every right; only a supervisor (or an owner) makes one */
export const SUPERVISOR = 'supervisor'

/**
 * A role inside a ministry ("Лідер служіння", "Музикант", "Публікатор"…) and its people: it gives them rights
 * there (see worker/src/ministryRoles.ts)
 */
export interface MinistryRole {
  id: string
  name: string
  /** leads the ministry: its events, the invitations, the applications */
  lead: boolean
  /** a deputy of the leader: takes the duties over when the leader hands them over */
  deputy: boolean
  invite: boolean
  approve: boolean
  /** posts notes and topics to the Telegram channel */
  publish: boolean
  /** decides whether a post may go to the channel */
  approvePosts?: boolean
  /** writes messages to the people of the ministry */
  send: boolean
  uids: string[]
}

export type MinistryRoles = Record<string, MinistryRole[]>

/** The duties of a leader handed over to a deputy, who accepts them first (see worker/src/handovers.ts) */
export interface Handover {
  fromUid: string
  toUid: string
  /** the leader, or an administrator for the leader */
  byUid: string
  /** the last day, or null until it is ended */
  until: string | null
  status: 'pending' | 'accepted'
  at: number
}

export type Handovers = Record<string, Handover>

export interface Rights {
  publish: boolean
  send: boolean
  sendToPeople: boolean
  sendToRoles: string[]
  approve: boolean
  /** the ministries whose applications the user takes (by a role there) */
  approveIn: string[]
  invite: string[]
  /** the ministries whose people the user writes to (by a role there) */
  sendToMinistries: string[]
  manage: Manage[]
}

const NO_RIGHTS: Rights = {
  publish: false,
  send: false,
  sendToPeople: false,
  sendToRoles: [],
  approve: false,
  approveIn: [],
  invite: [],
  sendToMinistries: [],
  manage: []
}

/** A user who signed in to the app, as the dashboard shows it (see worker/src/users.ts) */
export interface UserView {
  uid: string
  email: string | null
  emailVerified: boolean
  name: string | null
  role: Role
  /** a reader asks for the status of a servant */
  statusRequest?: { at: number; note: string }
  /** the ministries the user serves in, e.g. 'Музичне служіння' */
  ministries?: string[]
  /** the mobile number, '+380501234567' */
  phone?: string
  /** the name was given by an administrator (signing in keeps it) */
  nameSet?: boolean
  /** the user linked Telegram (the service bot writes to them) */
  telegramChatId?: number
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
/** what went to a Telegram channel: its title and the texts (Telegram HTML) */
export interface ChannelPost {
  channel: string
  texts: string[]
}

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
  /** what has just gone to a Telegram channel: the app shows which channel and the text (ChannelPostDialog) */
  const channelPost = shallowRef<ChannelPost | null>(null)
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
  /** the ministries the user leads: they plan their events */
  const leads = ref<string[]>([])
  /** the roles of the user in the ministries: { ministry: ['Музикант', …] } */
  const ministryRoles = ref<Record<string, string[]>>({})
  /** the home groups: the user may see them, or leads one */
  const groups = ref(false)
  /** the home group the user belongs to */
  const homeGroupId = ref<string | null>(null)
  /** a reader asked for the status of a servant (when) */
  const statusRequestAt = ref<number | null>(null)
  /** a new reader: the app offers once to ask for it */
  const offerStatus = ref(false)
  /** the window that asks for it: opened once after signing in, or from the menu of the avatar */
  const statusRequestOpen = ref(false)
  /** a status given to the user (its name): the app greets them once */
  const statusGranted = ref<string | null>(null)
  /** the link that invites to the service channel of the ministers */
  const serviceChannel = ref<string | null>(null)
  /** the duties of leaders asked of the user, taken over by the user, or handed over by the user */
  const handovers = ref<(Handover & { ministry: string })[]>([])
  /** the calendar: everyone who signed in (a reader sees the open events for everyone) */
  const calendar = ref(false)
  /** the translations that need a permission: the owners, the administrators, some ministries */
  const allTranslations = ref(false)
  const telegramLinked = ref(false)
  /** the types of notes and topics (the administrators keep them; the defaults until they come) */
  const types = ref<NoteType[]>(DEFAULT_TYPES)

  const canPublish = computed(() => telegram.value && rights.value.publish)
  /** the dashboard: for the roles with any function of an administrator */
  const isAdmin = computed(() => rights.value.manage.length > 0)
  /** the dashboard: the administrators, and the leaders of ministries (the roles of their ministries) */
  const hasDashboard = computed(() => isAdmin.value || leads.value.length > 0)
  const manages = (function_: Manage) => rights.value.manage.includes(function_)

  /** a file of the worker (a picture kept in Telegram), with the token of the user */
  async function requestBlob(path: string): Promise<Blob> {
    const authUser = firebase.authUser ?? (await firebase.waitForAuth())
    if (!authUser) throw new WorkerError('unauthorized')
    const response = await fetch(`${workerUrl}${path}`, {
      headers: { authorization: `Bearer ${await authUser.getIdToken()}` }
    })
    if (!response.ok) throw new WorkerError(String(response.status))
    return response.blob()
  }

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
    // the notices of the calendar that went to the service channel
    if (data.posted?.texts?.length) channelPost.value = data.posted
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
    leads.value = []
    ministryRoles.value = {}
    groups.value = false
    homeGroupId.value = null
    statusRequestAt.value = null
    offerStatus.value = false
    statusGranted.value = null
    serviceChannel.value = null
    handovers.value = []
    calendar.value = false
    allTranslations.value = false
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
        leads?: string[]
        ministryRoles?: Record<string, string[]>
        groups?: boolean
        homeGroupId?: string | null
        statusRequestAt?: number | null
        offerStatus?: boolean
        statusGranted?: string | null
        serviceChannel?: string | null
        handovers?: (Handover & { ministry: string })[]
        allTranslations?: boolean
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
      leads.value = me.leads ?? []
      ministryRoles.value = me.ministryRoles ?? {}
      groups.value = Boolean(me.groups)
      homeGroupId.value = me.homeGroupId ?? null
      statusRequestAt.value = me.statusRequestAt ?? null
      offerStatus.value = Boolean(me.offerStatus)
      statusGranted.value = me.statusGranted ?? null
      serviceChannel.value = me.serviceChannel ?? null
      handovers.value = me.handovers ?? []
      calendar.value = true
      allTranslations.value = Boolean(me.allTranslations)
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

  /** posts to the channel; the messages are the preview of the post, shown again with the channel */
  async function publishToTelegram(post: TopicPost, messages: string[]) {
    const { sent, channel } = await call<{ sent: number; channel: string }>('POST', '/telegram/publish', post)
    channelPost.value = { channel, texts: messages }
    return sent
  }

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
      leaders: Record<string, string[]>
      ministryRoles?: MinistryRoles
      handovers?: Handovers
      materialKinds?: MaterialKind[]
      addresses: Record<string, Place>
      translationMinistries: string[]
    }>('GET', '/admin/settings')

  /** the ministries whose people see the translations that need a permission */
  const setTranslationMinistries = async (ministries: string[]) =>
    (await call<{ ministries: string[] }>('PUT', '/admin/translation-ministries', { ministries })).ministries

  /** the addresses of the locations: a map opens them */
  const setAddresses = async (addresses: Record<string, Place>) =>
    (await call<{ addresses: Record<string, Place> }>('PUT', '/admin/addresses', { addresses })).addresses

  /** the roles of the ministries the user leads, and their handovers */
  const getLeaderRoles = async () => {
    const answer = await call<{ ministryRoles: MinistryRoles; handovers?: Handovers }>(
      'GET',
      '/ministry-roles'
    )
    return { ministryRoles: answer.ministryRoles, handovers: answer.handovers ?? {} }
  }

  /** the leader (or an administrator) asks a deputy to take the duties over */
  const askHandover = async (ministry: string, toUid: string, until: string | null) =>
    (
      await call<{ handover: Handover & { ministry: string } }>('POST', '/handover', {
        ministry,
        toUid,
        until
      })
    ).handover

  /** the deputy answers; what the user may do comes again */
  async function answerHandover(ministry: string, answer: 'accept' | 'decline') {
    await call('POST', '/handover/answer', { ministry, answer })
    await loadRole()
  }

  /** a reader asks for the status of a servant: the administrators of the users are told */
  async function requestStatus(note: string) {
    statusRequestAt.value = (
      await call<{ statusRequestAt: number }>('POST', '/status-request', { note })
    ).statusRequestAt
  }

  /** the offer to ask for the status was shown: not again */
  async function statusOffered() {
    offerStatus.value = false
    await call('PUT', '/me', { offered: true }).catch(() => undefined)
  }

  /** the user was greeted with the status given */
  async function greeted() {
    statusGranted.value = null
    await call('PUT', '/me', { greeted: true }).catch(() => undefined)
  }

  /** the user chooses their home group (or none) */
  async function setHomeGroup(id: string | null) {
    homeGroupId.value = (
      await call<{ homeGroupId: string | null }>('PUT', '/me', { homeGroupId: id })
    ).homeGroupId
  }

  /** the duties go back to the leader */
  const endHandover = (ministry: string) => call('DELETE', '/handover', { ministry })

  /** a leader gives the roles of their ministry (the roles that lead stay as the administrators gave them) */
  const setRolesOf = async (ministry: string, roles: MinistryRole[]) =>
    (
      await call<{ roles: MinistryRole[] }>('PUT', `/ministry-roles/${encodeURIComponent(ministry)}`, {
        roles
      })
    ).roles

  /** the roles inside the ministries and their people; the leaders are the people of the roles that lead */
  const setMinistryRoles = (ministryRoles: MinistryRoles) =>
    call<{ ministryRoles: MinistryRoles; leaders: Record<string, string[]> }>(
      'PUT',
      '/admin/ministry-roles',
      {
        ministryRoles
      }
    )

  /** the resources of the ministries: the kinds of materials */
  const setMaterialKinds = async (kinds: MaterialKind[]) =>
    (await call<{ kinds: MaterialKind[] }>('PUT', '/admin/material-kinds', { kinds })).kinds

  /** the title and the channel of a video of YouTube */
  const videoInfo = (url: string) =>
    call<{ title: string; author: string }>('GET', `/youtube?url=${encodeURIComponent(url)}`)

  const setEventTypes = async (list: EventType[]) =>
    (await call<{ eventTypes: EventType[] }>('PUT', '/admin/event-types', { eventTypes: list })).eventTypes

  const setCalendar = async (settings: CalendarSettings) =>
    (await call<{ calendar: CalendarSettings }>('PUT', '/admin/calendar', { calendar: settings })).calendar

  const setRoles = async (list: RoleDef[]) =>
    (await call<{ roles: RoleDef[] }>('PUT', '/admin/roles', { roles: list })).roles

  /** the ministries or the locations of the church */
  /** a ministry or a location gets another name: the events, the people and the rest keep up */
  const renameItem = async (name: 'ministries' | 'locations', from: string, to: string) =>
    (await call<{ items: string[] }>('PUT', `/admin/directories/${name}/rename`, { from, to })).items

  const setDirectory = async (name: 'ministries' | 'locations', items: string[]) =>
    (await call<{ items: string[] }>('PUT', `/admin/directories/${name}`, { items })).items

  const updateUser = async (
    uid: string,
    change: { role?: Role; ministries?: string[]; phone?: string | null; name?: string | null }
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

  /** the messages are hidden from the user (the other side keeps them) */
  async function deleteMessages(ids: string[]) {
    await call('DELETE', '/messages', { ids })
    messages.value = messages.value.filter((message) => !ids.includes(message.id))
    unread.value = messages.value.filter((message) => message.toUid === user.uid && !message.readAt).length
  }

  return {
    /** a request to the worker with the token of the user (for other stores, e.g. the schedule) */
    request: call,
    requestBlob,
    channelPost,
    role,
    roleName,
    rights,
    manages,
    telegram,
    canPublish,
    isAdmin,
    hasDashboard,
    getLeaderRoles,
    setRolesOf,
    ministries,
    canSend,
    canReceive,
    phone,
    needsPhone,
    serviceBot,
    groups,
    statusRequestAt,
    offerStatus,
    statusOffered,
    statusRequestOpen,
    statusGranted,
    serviceChannel,
    requestStatus,
    greeted,
    homeGroupId,
    setHomeGroup,
    handovers,
    askHandover,
    answerHandover,
    endHandover,
    ministryRoles,
    leads,
    calendar,
    allTranslations,
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
    setMaterialKinds,
    videoInfo,
    setEventTypes,
    setCalendar,
    setMinistryRoles,
    setAddresses,
    setTranslationMinistries,
    setRoles,
    setDirectory,
    renameItem,
    loadMessages,
    markRead,
    deleteMessages,
    recipients,
    sendMessage
  }
})
