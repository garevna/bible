import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import type { TopicPost } from '@/utils/topicPost'

import { useFirebaseStore } from './firebase'
import { useUserStore } from './user'

/** The Cloudflare Worker (worker/); without it publishing and the dashboard are not offered */
const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '')

/** reader: the app; publisher: also posts to Telegram; admin: also gives the roles */
export type Role = 'reader' | 'publisher' | 'admin'
export const ROLES: Role[] = ['reader', 'publisher', 'admin']

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

  const role = ref<Role>('reader')
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

  const canPublish = computed(() => telegram.value && role.value !== 'reader')
  const isAdmin = computed(() => role.value === 'admin')

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
    role.value = 'reader'
    telegram.value = false
    ministries.value = []
    canSend.value = canReceive.value = needsPhone.value = false
    phone.value = null
    if (!workerUrl || !user.signed) return
    try {
      const me = await call<{
        role: Role
        telegram: boolean
        ministries?: string[]
        canSend?: boolean
        canReceive?: boolean
        phone?: string | null
        needsPhone?: boolean
      }>('GET', '/me')
      role.value = me.role
      telegram.value = me.telegram
      ministries.value = me.ministries ?? []
      canSend.value = Boolean(me.canSend)
      canReceive.value = Boolean(me.canReceive)
      phone.value = me.phone ?? null
      needsPhone.value = Boolean(me.needsPhone)
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

  const recipients = () => call<{ people: Recipient[]; ministries: string[] }>('GET', '/messages/recipients')

  const sendMessage = async (draft: {
    to?: string[]
    ministries?: string[]
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
  const listUsers = () => call<{ users: UserView[]; ministries: string[] }>('GET', '/admin/users')

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

  const removeUser = (uid: string) => call('DELETE', `/admin/users/${encodeURIComponent(uid)}`)

  const setMinistries = async (list: string[]) =>
    (await call<{ ministries: string[] }>('PUT', '/admin/ministries', { ministries: list })).ministries

  return {
    role,
    telegram,
    canPublish,
    isAdmin,
    ministries,
    canSend,
    canReceive,
    phone,
    needsPhone,
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
    setMinistries,
    loadMessages,
    markRead,
    recipients,
    sendMessage
  }
})
