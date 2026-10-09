import { ref } from 'vue'
import { defineStore } from 'pinia'

import {
  deleteRecord,
  getAllKeys,
  getRecordsByKeys,
  getVersesByRefs,
  noteDate,
  putRecord,
  searchNotes
} from '@/db'
import type { Note, Topic, VerseRef } from '@/types'
import { clone, idFrom, pushUnique, removeById } from '@/utils/array'
import { getVerseHTML } from '@/utils/verse'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useFirebaseStore } from './firebase'

export type TopicFilter = Pick<Topic, '_id' | 'title'>

interface NotesSelector {
  date: string | null
  keyword: string | null
  topic: TopicFilter | null
}

const selectorKey = 'notes-selector'

function readSelector(): NotesSelector {
  try {
    const {
      date = null,
      keyword = null,
      topic = null
    } = JSON.parse(localStorage.getItem(selectorKey) || '{}')
    return { date, keyword, topic: topic?._id ? topic : null }
  } catch {
    return { date: null, keyword: null, topic: null }
  }
}

export const newNote = (): Note => ({
  _id: Date.now().toString(),
  refs: [],
  topics: [],
  keywords: [],
  text: ''
})

export const useNotesStore = defineStore('notes', () => {
  const app = useAppStore()

  const notes = ref<Note[]>([])

  /* filter of the Notes page */
  const date = ref<string | null>(null)
  const keyword = ref<string | null>(null)
  const topic = ref<TopicFilter | null>(null)

  /** note opened in the editor */
  const currentNote = ref<Note | null>(null)
  const currentNoteTopics = ref<Topic[]>([])
  const currentNoteVerses = ref<(VerseRef & { html: string })[]>([])

  /** dates (YYYY-MM-DD) that have notes, ascending */
  const availableDates = ref<string[]>([])

  const hasFilter = () => Boolean(date.value || keyword.value || topic.value)

  function saveSelector() {
    localStorage.setItem(
      selectorKey,
      JSON.stringify({ date: date.value, keyword: keyword.value, topic: topic.value })
    )
  }

  async function getAvailableDates() {
    const keys = (await app.withProgress(() => getAllKeys('notes'))) ?? []
    availableDates.value = Array.from(new Set(keys.map((key) => noteDate({ _id: String(key) })))).sort()
  }

  async function getNotes() {
    notes.value =
      (await app.withProgress(() =>
        searchNotes({ date: date.value, keyword: keyword.value, topic: topic.value?._id })
      )) ?? []
  }

  async function init() {
    ;({ date: date.value, keyword: keyword.value, topic: topic.value } = readSelector())

    await getAvailableDates()

    if (!hasFilter()) date.value = availableDates.value.at(-1) ?? null

    await getNotes()
  }

  async function updateFilter(update: () => void) {
    update()
    saveSelector()
    await getNotes()
  }

  const updateDate = (value: string | null) => updateFilter(() => (date.value = value))
  const updateKeyword = (value: string | null) => updateFilter(() => (keyword.value = value))
  const updateTopic = (value: TopicFilter | null) =>
    updateFilter(() => (topic.value = value?._id ? { _id: value._id, title: value.title } : null))

  async function putNote(note: Note) {
    const record = clone(note)
    await app.withProgress(async () => {
      await putRecord('notes', record)
      await useFirebaseStore().saveFirebaseDocument('notes', record)
    })
  }

  async function removeNote(note: string | Note) {
    const noteId = idFrom(note)
    await app.withProgress(async () => {
      await deleteRecord('notes', noteId)
      await useFirebaseStore().deleteDocument('notes', noteId)
    })
    removeById(notes.value, noteId)
    removeById(useContentStore().lineNotes, noteId)
  }

  /* ---------- the note editor ---------- */

  async function getCurrentNoteTopics() {
    if (!currentNote.value) return
    const refs = currentNote.value.topics
    currentNoteTopics.value = (await app.withProgress(() => getRecordsByKeys<Topic>('topics', refs))) ?? []
  }

  async function getCurrentNoteVerses() {
    if (!currentNote.value) return
    const refs = currentNote.value.refs
    const verses = (await app.withProgress(() => getVersesByRefs(refs))) ?? []
    currentNoteVerses.value = verses.map((verse) => ({ ...verse, html: getVerseHTML(verse) }))
  }

  /** Opens an existing note in the editor */
  async function setCurrentNote(note: Note) {
    currentNote.value = clone(note)
    await Promise.all([getCurrentNoteTopics(), getCurrentNoteVerses()])
  }

  /** Opens a new note in the editor, optionally attached to a verse, topic or keyword */
  async function startNewNote({
    lineRef,
    topicId,
    keywordId
  }: { lineRef?: string; topicId?: string; keywordId?: string } = {}) {
    const note = newNote()
    lineRef && note.refs.push(lineRef)
    topicId && note.topics.push(topicId)
    keywordId && note.keywords.push(keywordId)
    await setCurrentNote(note)
  }

  function resetCurrentNote() {
    currentNote.value = null
    currentNoteTopics.value = []
    currentNoteVerses.value = []
  }

  function updateCurrentNoteText(text: string) {
    currentNote.value && (currentNote.value.text = text)
  }

  function addTopicToCurrentNote(item: Topic) {
    if (!currentNote.value) return
    pushUnique(currentNote.value.topics, item._id)
    pushUnique(currentNoteTopics.value, item)
  }

  function removeTopicFromCurrentNote(topicId: string) {
    if (!currentNote.value) return
    removeById(currentNote.value.topics, topicId)
    removeById(currentNoteTopics.value, topicId)
  }

  function addKeywordToCurrentNote(item: string) {
    currentNote.value && item && pushUnique(currentNote.value.keywords, item)
  }

  function removeKeywordFromCurrentNote(keywordId: string) {
    currentNote.value && removeById(currentNote.value.keywords, keywordId)
  }

  function removeVerseFromCurrentNote(verseId: string) {
    if (!currentNote.value) return
    removeById(currentNote.value.refs, verseId)
    removeById(currentNoteVerses.value, verseId)
  }

  /** Saves the edited note and refreshes the lists that show it */
  async function saveCurrentNote() {
    const note = currentNote.value
    if (!note) return

    await putNote(note)

    const saved = clone(note)
    const index = notes.value.findIndex((item) => item._id === saved._id)
    index === -1 ? notes.value.push(saved) : notes.value.splice(index, 1, saved)

    const content = useContentStore()
    if (content.currentLineId) {
      removeById(content.lineNotes, saved._id)
      saved.refs.includes(content.currentLineId) && content.lineNotes.push(saved)
    }

    pushUnique(availableDates.value, noteDate(saved))
    availableDates.value.sort()
  }

  return {
    notes,
    date,
    keyword,
    topic,
    currentNote,
    currentNoteTopics,
    currentNoteVerses,
    availableDates,
    init,
    getAvailableDates,
    getNotes,
    updateDate,
    updateKeyword,
    updateTopic,
    putNote,
    removeNote,
    getCurrentNoteTopics,
    getCurrentNoteVerses,
    setCurrentNote,
    startNewNote,
    resetCurrentNote,
    updateCurrentNoteText,
    addTopicToCurrentNote,
    removeTopicFromCurrentNote,
    addKeywordToCurrentNote,
    removeKeywordFromCurrentNote,
    removeVerseFromCurrentNote,
    saveCurrentNote
  }
})
