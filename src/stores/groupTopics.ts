import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { TopicPost } from '@/utils/topicPost'

import { useWorkerStore } from './worker'

/**
 * The topics of the meetings of the home groups (see worker/src/groupTopics.ts): the ministry of the
 * groups prepares them, a pastor approves them and gives their own as recommendations, the ministry
 * sends them to the leaders of the groups, a leader marks a topic done in their group.
 */
export type TopicStatus = 'pending' | 'approved' | 'returned'

export interface GroupTopic {
  id: string
  title: string
  /** the day of the meeting it is for ('YYYY-MM-DD'), or null */
  day: string | null
  /** the words and the verses; a picture kept in Telegram */
  post: TopicPost
  /** a video of YouTube */
  video: string | null
  uid: string
  name: string
  /** a pastor's own */
  recommended: boolean
  status: TopicStatus
  reviewNote: string | null
  reviewedBy: string | null
  sentTo: string[]
  sentAt: number | null
  /** the groups it was done in */
  done: Record<string, number>
  createdAt: number
}

export interface TopicsSettings {
  /** the ministry that prepares the topics */
  ministry: string | null
  /** the pastor who approves them; none: no approval */
  approverUid: string | null
}

/** what is written of a topic */
export type TopicDraft = Pick<GroupTopic, 'title' | 'day' | 'post' | 'video'>

export interface TopicsRights {
  prepare: boolean
  recommend: boolean
  review: boolean
  settings: boolean
}

export const useGroupTopicsStore = defineStore('groupTopics', () => {
  const worker = useWorkerStore()

  const topics = ref<GroupTopic[]>([])
  const settings = ref<TopicsSettings>({ ministry: null, approverUid: null })
  const may = ref<TopicsRights>({ prepare: false, recommend: false, review: false, settings: false })
  /** the groups the user leads */
  const led = ref<string[]>([])
  const loaded = ref(false)

  async function load() {
    const answer = await worker.request<{
      topics: GroupTopic[]
      settings: TopicsSettings
      may: TopicsRights
      led: string[]
    }>('GET', '/group-topics')
    topics.value = answer.topics ?? []
    settings.value = answer.settings ?? settings.value
    may.value = answer.may ?? may.value
    led.value = answer.led ?? []
    loaded.value = true
  }

  const put = (topic: GroupTopic) => {
    topics.value = topics.value.some((item) => item.id === topic.id)
      ? topics.value.map((item) => (item.id === topic.id ? topic : item))
      : [topic, ...topics.value]
    return topic
  }

  const path = (id: string) => `/group-topics/${encodeURIComponent(id)}`
  const act = async (method: 'POST' | 'PUT', url: string, body?: unknown) =>
    put((await worker.request<{ topic: GroupTopic }>(method, url, body)).topic)

  const create = (draft: TopicDraft, recommended = false) =>
    act('POST', '/group-topics', { ...draft, recommended })
  const update = (id: string, draft: TopicDraft) => act('PUT', path(id), draft)
  const review = (id: string, approve: boolean, note = '') =>
    act('POST', `${path(id)}/review`, { approve, note })
  /** to the leaders of the groups */
  const send = (id: string, groups: string[]) => act('POST', `${path(id)}/send`, { groups })
  const mark = (id: string, group: string, done: boolean) => act('PUT', `${path(id)}/mark`, { group, done })

  async function remove(id: string) {
    await worker.request('DELETE', path(id))
    topics.value = topics.value.filter((item) => item.id !== id)
  }

  async function saveSettings(next: TopicsSettings) {
    settings.value = (
      await worker.request<{ settings: TopicsSettings }>('PUT', '/group-topics/settings', next)
    ).settings
  }

  /** the topics sent to a group, the newest meeting first */
  const sentTo = (groupId: string) =>
    topics.value
      .filter((topic) => topic.status === 'approved' && topic.sentTo.includes(groupId))
      .sort((a, b) => (b.day ?? '').localeCompare(a.day ?? '') || b.createdAt - a.createdAt)

  return {
    topics,
    settings,
    may,
    led,
    loaded,
    load,
    create,
    update,
    review,
    send,
    mark,
    remove,
    saveSettings,
    sentTo
  }
})
