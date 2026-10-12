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
  /** an administrator the dashboard cannot change (the worker settings, OWNERS) */
  owner: boolean
  lastSeen: number
  updatedBy?: string
  updatedAt?: number
}

/** the worker answered with an error: its code, e.g. 'owner', 'self', 'forbidden', or 'unreachable' */
export class WorkerError extends Error {}

/** The worker: roles, publishing to the Telegram channel, the dashboard of the roles */
export const useWorkerStore = defineStore('worker', () => {
  const firebase = useFirebaseStore()
  const user = useUserStore()

  const role = ref<Role>('reader')
  /** the worker has a bot and a channel */
  const telegram = ref(false)

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
    if (!workerUrl || !user.signed) return
    try {
      const me = await call<{ role: Role; telegram: boolean }>('GET', '/me')
      role.value = me.role
      telegram.value = me.telegram
    } catch (error) {
      console.warn('The role is not known\n', error)
    }
  }

  watch(() => user.uid, loadRole, { immediate: true })

  /** the messages of the post, and the caption of its picture */
  const preview = (post: TopicPost) =>
    call<{ messages: string[]; caption: string | null }>('POST', '/telegram/preview', post)

  const publishToTelegram = async (post: TopicPost) =>
    (await call<{ sent: number }>('POST', '/telegram/publish', post)).sent

  const listUsers = async () => (await call<{ users: UserView[] }>('GET', '/admin/users')).users

  const setUserRole = async (uid: string, newRole: Role) =>
    (await call<{ user: UserView }>('PUT', `/admin/users/${encodeURIComponent(uid)}`, { role: newRole })).user

  const removeUser = (uid: string) => call('DELETE', `/admin/users/${encodeURIComponent(uid)}`)

  return {
    role,
    telegram,
    canPublish,
    isAdmin,
    loadRole,
    preview,
    publishToTelegram,
    listUsers,
    setUserRole,
    removeUser
  }
})
