import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  deleteRecord,
  getAllKeys,
  getAllRecords,
  getRecord,
  getVersesByRefs,
  putRecord,
  searchNotes
} from '@/db'
import type { Note, Topic, VerseRef } from '@/types'
import { clone, idFrom, isEqual, removeById } from '@/utils/array'
import { getVerseHTML } from '@/utils/verse'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useFirebaseStore } from './firebase'
import { useNotesStore } from './notes'

export type TopicVerseItem = VerseRef & { type: 'verse'; html: string }
export type TopicNoteItem = Note & { type: 'note'; verses: TopicVerseItem[] }
/** Item of the draggable list on the Topic page */
export type TopicItem = TopicVerseItem | TopicNoteItem

const toVerseItems = async (refs: string[]): Promise<TopicVerseItem[]> =>
  refs.length
    ? (await getVersesByRefs(refs)).map((verse) => ({ ...verse, type: 'verse', html: getVerseHTML(verse) }))
    : []

export const newTopic = (title = ''): Topic => ({
  _id: Date.now().toString(),
  title,
  refs: [],
  order: []
})

export const useTopicsStore = defineStore('topics', () => {
  const app = useAppStore()

  const topicList = ref<Topic[]>([])
  const topicIdList = ref<string[]>([])
  const searchResult = ref<Topic[]>([])

  const currentTopic = ref<Topic | null>(null)
  const currentTopicData = ref<TopicItem[]>([])

  async function getTopics() {
    topicList.value = (await app.withProgress(() => getAllRecords<Topic>('topics'))) ?? []
  }

  async function getTopicIdList() {
    topicIdList.value = ((await app.withProgress(() => getAllKeys('topics'))) ?? []).map(String)
  }

  async function putTopic(topic: Topic) {
    const { _id = Date.now().toString(), title, refs = [], order = [] } = topic
    const record: Topic = clone({ _id, title, refs, order })

    await app.withProgress(async () => {
      await putRecord('topics', record)
      useFirebaseStore().saveFirebaseDocument('topics', record)
    })

    const index = topicList.value.findIndex((item) => item._id === record._id)
    index === -1 ? topicList.value.push(record) : topicList.value.splice(index, 1, record)

    return record
  }

  /** Creates a topic, optionally attached to a verse */
  const createTopic = (title: string, lineRef?: string) => {
    const topic = newTopic(title.trim())
    lineRef && topic.refs.push(lineRef)
    return putTopic(topic)
  }

  /** Deletes the topic and removes it from the notes that link to it */
  async function deleteTopic(topicId: string) {
    await useNotesStore().unlinkFromNotes('topics', topicId)
    removeById(useContentStore().lineTopics, topicId)

    await app.withProgress(async () => {
      useFirebaseStore().deleteDocument('topics', topicId)
      await deleteRecord('topics', topicId)
    })
    removeById(topicList.value, topicId)
  }

  async function searchTopics(searchLine: string) {
    const search = searchLine.toLowerCase()
    const topics = (await app.withProgress(() => getAllRecords<Topic>('topics'))) ?? []
    searchResult.value = topics.filter((topic) => topic.title.toLowerCase().includes(search))
  }

  /* ---------- the Topic page ---------- */

  async function getCurrentTopic(topicId: string) {
    const topic = await app.withProgress(() => getRecord<Topic>('topics', topicId))
    currentTopic.value = topic ? { ...topic, order: topic.order ?? [] } : null
  }

  function updateCurrentTopic(data: Partial<Topic>) {
    currentTopic.value && Object.assign(currentTopic.value, data)
  }

  /** Sorts the items by the saved order */
  function applyOrder() {
    const order = currentTopic.value?.order ?? []
    currentTopicData.value = order
      .map((id) => currentTopicData.value.find((item) => item._id === id))
      .filter((item): item is TopicItem => Boolean(item))
  }

  /** Drops ids that are gone from the saved order and appends new items to its end */
  async function updateOrder() {
    if (!currentTopic.value) return

    const actual = Array.from(new Set(currentTopicData.value.map((item) => item._id)))
    const order = currentTopic.value.order.filter((id) => actual.includes(id))

    if (isEqual(actual, order)) return

    order.push(...actual.filter((id) => !order.includes(id)))
    updateCurrentTopic({ order })
    await putTopic(currentTopic.value)
  }

  /** Loads the notes and verses of the current topic */
  async function getTopicData() {
    const topic = currentTopic.value
    if (!topic) return

    const items = await app.withProgress(async () => {
      const notes = await searchNotes({ topic: topic._id })
      const noteItems: TopicNoteItem[] = await Promise.all(
        notes.map(async (note) => ({ ...note, type: 'note' as const, verses: await toVerseItems(note.refs) }))
      )
      return [...noteItems, ...(await toVerseItems(topic.refs))]
    })

    currentTopicData.value = items ?? []

    await updateOrder()
    applyOrder()
  }

  async function initTopic() {
    const topicId = localStorage.getItem('topic')
    if (!topicId) return
    await getCurrentTopic(topicId)
    await getTopicData()
  }

  async function gotoTopic(topic: string | Topic) {
    const topicId = idFrom(topic)
    localStorage.setItem('topic', topicId)
    await app.setPage('topic')
  }

  async function returnToTopicList() {
    currentTopic.value = null
    currentTopicData.value = []
    localStorage.removeItem('topic')
    await app.setPage('topics')
  }

  function removeCurrentTopicDataItem(id: string) {
    removeById(currentTopicData.value, id)
  }

  /** Saves the order of items and the notes whose verses were moved by drag and drop */
  async function saveCurrentTopic() {
    if (!currentTopic.value) return

    const notesStore = useNotesStore()
    const noteItems = currentTopicData.value.filter((item): item is TopicNoteItem => item.type === 'note')

    await Promise.all(
      noteItems.map(({ _id, keywords, topics, text, verses }) =>
        notesStore.putNote({ _id, keywords, topics, text, refs: verses.map((verse) => verse._id) })
      )
    )

    updateCurrentTopic({
      order: currentTopicData.value.map((item) => item._id),
      refs: currentTopicData.value.filter((item) => item.type === 'verse').map((item) => item._id)
    })

    await putTopic(currentTopic.value)
  }

  return {
    topicList,
    topicIdList,
    searchResult,
    currentTopic,
    currentTopicData,
    getTopics,
    getTopicIdList,
    putTopic,
    createTopic,
    deleteTopic,
    searchTopics,
    getCurrentTopic,
    updateCurrentTopic,
    applyOrder,
    updateOrder,
    getTopicData,
    initTopic,
    gotoTopic,
    returnToTopicList,
    removeCurrentTopicDataItem,
    saveCurrentTopic
  }
})
