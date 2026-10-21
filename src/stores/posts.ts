import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'
import type { TopicPost } from '@/utils/topicPost'

/** A post sent for the channel (see worker/src/posts.ts) */
export interface Submission {
  id: string
  /** a note, a topic, or a picture (kept in Telegram: 'tg:…' in post.image) */
  kind: 'note' | 'topic' | 'image'
  title: string
  post: TopicPost
  authorUid: string
  authorName: string
  /** who approves it; null: it needs no approval */
  approverUid: string | null
  approverName: string | null
  status: 'pending' | 'approved' | 'returned' | 'published'
  comment: string
  taskId: string | null
  createdAt: number
  decidedAt: number | null
  publishedAt: number | null
  publishedBy: string | null
}

/** A post asked of a servant by a pastor */
export interface PostTask {
  id: string
  byUid: string
  byName: string
  assigneeUid: string
  assigneeName: string
  /** what it asks for: a post (a note or a topic) or a picture */
  kind: 'post' | 'image'
  text: string
  approverUid: string | null
  approverName: string | null
  /** the last day ('YYYY-MM-DD'), or null */
  due: string | null
  status: 'open' | 'done'
  createdAt: number
}

export interface PersonItem {
  uid: string
  name: string
}

/** The posts of the public channel: sent, approved, published; and the posts asked of the servants */
export const usePostsStore = defineStore('posts', () => {
  const worker = useWorkerStore()
  const user = useUserStore()

  const submissions = ref<Submission[]>([])
  const tasks = ref<PostTask[]>([])
  /** the pastors who approve, and the servants a post may be asked of */
  const approvers = ref<PersonItem[]>([])
  const people = ref<PersonItem[]>([])
  const canApprove = ref(false)
  const canPublish = ref(false)
  /** the private channel of Telegram the pictures are kept in, when it is connected */
  const storage = ref<{ title: string } | null>(null)
  /** the bot of the public channel and the channel: the steps to connect the private channel say them */
  const channelBot = ref('')
  const channel = ref('')
  const loaded = ref(false)

  async function load() {
    const answer = await worker.request<{
      submissions: Submission[]
      tasks: PostTask[]
      approvers: PersonItem[]
      people: PersonItem[]
      canApprove: boolean
      canPublish: boolean
      storage?: { title: string } | null
      channelBot?: string
      channel?: string
    }>('GET', '/posts')
    submissions.value = answer.submissions ?? []
    tasks.value = answer.tasks ?? []
    approvers.value = answer.approvers ?? []
    people.value = answer.people ?? []
    canApprove.value = Boolean(answer.canApprove)
    canPublish.value = Boolean(answer.canPublish)
    storage.value = answer.storage ?? null
    channelBot.value = answer.channelBot ?? ''
    channel.value = answer.channel ?? ''
    loaded.value = true
  }

  const put = (item: Submission) => {
    submissions.value = [item, ...submissions.value.filter((other) => other.id !== item.id)]
    return item
  }

  const submit = async (
    kind: 'note' | 'topic' | 'image',
    post: TopicPost,
    approverUid: string | null,
    taskId: string | null
  ) => {
    const item = put(
      (
        await worker.request<{ submission: Submission }>('POST', '/posts', {
          kind,
          post,
          approverUid,
          ...(taskId ? { taskId } : {})
        })
      ).submission
    )
    if (taskId)
      tasks.value = tasks.value.map((task) => (task.id === taskId ? { ...task, status: 'done' } : task))
    return item
  }

  const approve = async (id: string) =>
    put((await worker.request<{ submission: Submission }>('POST', `/posts/${id}/approve`, {})).submission)

  const returnPost = async (id: string, comment: string) =>
    put(
      (await worker.request<{ submission: Submission }>('POST', `/posts/${id}/return`, { comment }))
        .submission
    )

  /** to the channel, with a picture of the device or an approved one; the window of the app says where it went */
  async function publish(id: string, image: string | null, imageFrom: string | null, messages: string[]) {
    const answer = await worker.request<{ submission: Submission; channel: string }>(
      'POST',
      `/posts/${id}/publish`,
      imageFrom ? { imageFrom } : image ? { image } : {}
    )
    if (imageFrom) {
      const used = submissions.value.find((item) => item.id === imageFrom)
      if (used) put({ ...used, status: 'published' })
    }
    put(answer.submission)
    worker.channelPost = { channel: answer.channel, texts: messages }
  }

  async function remove(id: string) {
    await worker.request('DELETE', `/posts/${id}`)
    submissions.value = submissions.value.filter((item) => item.id !== id)
  }

  async function createTask(
    assigneeUid: string,
    text: string,
    approverUid: string | null,
    due: string | null,
    kind: 'post' | 'image' = 'post'
  ) {
    const { task } = await worker.request<{ task: PostTask }>('POST', '/post-tasks', {
      assigneeUid,
      text,
      approverUid,
      due,
      kind
    })
    tasks.value = [task, ...tasks.value]
    return task
  }

  /** the private channel of the pictures: found by the worker among the updates of the bot */
  async function connectStorage() {
    storage.value = (
      await worker.request<{ storage: { title: string } }>('POST', '/posts/storage', {})
    ).storage
  }

  /** a picture asked by a task: kept in Telegram, then sent for the approval */
  async function sendPicture(task: PostTask, image: string) {
    const kept = (await worker.request<{ image: string }>('POST', '/posts/upload', { image })).image
    return submit('image', { title: task.text, items: [], image: kept }, null, task.id)
  }

  async function removeTask(id: string) {
    await worker.request('DELETE', `/post-tasks/${id}`)
    tasks.value = tasks.value.filter((task) => task.id !== id)
  }

  const mine = computed(() => submissions.value.filter((item) => item.authorUid === user.uid))
  /** the posts the user approves: the ones who may */
  const toApprove = computed(() =>
    canApprove.value
      ? submissions.value.filter((item) => item.approverUid === user.uid && item.status === 'pending')
      : []
  )
  /** the queue of the channel: ready first, then waiting, then the published ones */
  const queue = computed(() =>
    canPublish.value
      ? submissions.value
          .filter((item) => item.status !== 'returned')
          .sort(
            (a, b) =>
              ['approved', 'pending', 'published'].indexOf(a.status) -
                ['approved', 'pending', 'published'].indexOf(b.status) || b.createdAt - a.createdAt
          )
      : []
  )
  /** the approved pictures, waiting for a post of the channel */
  const pictures = computed(() =>
    submissions.value.filter((item) => item.kind === 'image' && item.status === 'approved')
  )
  const myTasks = computed(() =>
    tasks.value.filter((task) => task.assigneeUid === user.uid && task.status === 'open')
  )
  const givenTasks = computed(() => tasks.value.filter((task) => task.byUid === user.uid))
  /** what waits for the user: to approve, to publish, to prepare */
  const waiting = computed(
    () =>
      toApprove.value.length +
      queue.value.filter((item) => item.status === 'approved').length +
      myTasks.value.length
  )

  return {
    submissions,
    tasks,
    approvers,
    people,
    canApprove,
    canPublish,
    storage,
    channelBot,
    channel,
    loaded,
    load,
    submit,
    approve,
    returnPost,
    publish,
    remove,
    createTask,
    removeTask,
    connectStorage,
    sendPicture,
    pictures,
    mine,
    toApprove,
    queue,
    myTasks,
    givenTasks,
    waiting
  }
})
