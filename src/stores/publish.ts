import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import type { TopicPost } from '@/utils/topicPost'

import { useFirebaseStore } from './firebase'
import { useUserStore } from './user'

/** The Cloudflare Worker (worker/); without it publishing is not offered */
const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '')

export type Role = 'publisher' | 'reader'

export class PublishError extends Error {}

/** Publishing to the Telegram channel through the worker; the worker checks who may publish */
export const usePublishStore = defineStore('publish', () => {
  const firebase = useFirebaseStore()
  const user = useUserStore()

  const role = ref<Role>('reader')
  /** the worker has a bot and a channel */
  const telegram = ref(false)

  async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const authUser = firebase.authUser ?? (await firebase.waitForAuth())
    if (!authUser) throw new PublishError('unauthorized')
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
      throw new PublishError('unreachable')
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new PublishError(data.message || data.error || String(response.status))
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

  const preview = async (post: TopicPost) =>
    (await call<{ messages: string[] }>('POST', '/telegram/preview', post)).messages

  const publishToTelegram = async (post: TopicPost) =>
    (await call<{ sent: number }>('POST', '/telegram/publish', post)).sent

  return { role, telegram, loadRole, preview, publishToTelegram }
})
