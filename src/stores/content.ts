import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { beforeDivider, translationMenuItems } from '@/configs'
import {
  clearStore,
  getRecord,
  getRecordsByIndex,
  getVersesByRefs,
  putRecord,
  putRecords,
  searchLineKeywords,
  searchLineTopics,
  searchNotes,
  testLocalDB,
  userStoreNames
} from '@/db'
import type { Book, HighlightRecord, Keyword, Note, Topic, Verse, VerseRef } from '@/types'
import { idFrom, pushUnique, removeById } from '@/utils/array'
import { clearHighlights, getHTML, updateIntervals } from '@/utils/highlights'
import { chapterOf, getBookRef, getChapterRef, getLineRef, parseLineRef } from '@/utils/refs'
import { getVerseHTML } from '@/utils/verse'

import { useAppStore } from './app'
import { useFirebaseStore } from './firebase'
import { useUserStore } from './user'

/** Shape of public/bible-*.json */
type BibleJSON = { title: string; books: { title: string; chapters: string[][] }[] }[]

const NO_COLOR = '#0000'

function readCovenantNames(): string[] {
  const stored = localStorage.getItem('covenant-names')
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    // the Vue 2 version stored them as 'Old,New'
    return stored.split(',')
  }
}

const storedNumber = (key: string, fallback: number) => {
  const value = localStorage.getItem(key)
  return value === null || value === '' ? fallback : Number(value)
}

export const useContentStore = defineStore('content', () => {
  const app = useAppStore()
  const user = useUserStore()

  const covenantNames = ref<string[]>([])
  const covenantIndex = ref(1)
  const books = shallowRef<Book[][] | null>(null)
  const bookIndex = ref<number | null>(null)
  const bookTitle = ref<string | null>(null)
  const chapterIndex = ref(0)
  const chapterContent = ref<Verse[] | null>(null)
  const lineIndex = ref(0)
  /** verse to emphasize and scroll to after navigating to it */
  const verseId = ref<string | null>(null)

  const highlightColor = ref(NO_COLOR)
  const cursor = ref('default')
  const previousCursorState = ref({ highlightColor: NO_COLOR, cursor: 'default' })

  /** verse opened in the details dialog */
  const currentLineId = ref<string | null>(null)
  const verse = ref<Verse | null>(null)

  const lineTopics = ref<Topic[]>([])
  const lineKeywords = ref<string[]>([])
  const lineNotes = ref<Note[]>([])

  const listOfVerses = ref<(VerseRef & { html: string })[]>([])

  const pathToResource = computed(() => {
    const json = translationMenuItems.find((item) => item.value === user.translation)?.json
    return `${import.meta.env.BASE_URL}${json}`
  })

  const covenantName = computed(() => covenantNames.value[covenantIndex.value])
  const bookRef = computed(() =>
    bookIndex.value === null ? null : getBookRef(covenantIndex.value, bookIndex.value)
  )
  const chapterRef = computed(() =>
    bookIndex.value === null ? null : getChapterRef(covenantIndex.value, bookIndex.value, chapterIndex.value)
  )
  const lineRef = computed(() =>
    bookIndex.value === null
      ? null
      : getLineRef(covenantIndex.value, bookIndex.value, chapterIndex.value, lineIndex.value)
  )
  const book = computed(() =>
    books.value && bookIndex.value !== null
      ? (books.value[covenantIndex.value]?.[bookIndex.value] ?? null)
      : null
  )
  const chapters = computed(() => book.value?.chapters ?? 0)
  const cursorStyle = computed(() =>
    cursor.value === 'default' ? 'cursor: default' : `cursor: url('${cursor.value}'), auto`
  )

  /* ---------- navigation ---------- */

  function initOptions() {
    covenantIndex.value = storedNumber('covenant', 1)
    bookIndex.value = storedNumber('book-index', 0)
    chapterIndex.value = storedNumber('chapter', 0)
    bookTitle.value = localStorage.getItem('book-title') || ''
    verseId.value = localStorage.getItem('verse')
    covenantNames.value = readCovenantNames()
  }

  function setCovenant(index: number) {
    covenantIndex.value = index
    localStorage.setItem('covenant', String(index))
  }

  function selectBook(index: number) {
    bookIndex.value = index
    bookTitle.value = books.value?.[covenantIndex.value]?.[index]?.title ?? ''
    chapterIndex.value = 0
    localStorage.setItem('book-index', String(index))
    localStorage.setItem('book-title', bookTitle.value)
    localStorage.setItem('chapter', '0')
  }

  function resetBook() {
    ;['book-index', 'book-title', 'chapter'].forEach((key) => localStorage.removeItem(key))
    bookIndex.value = null
    bookTitle.value = null
    chapterIndex.value = 0
  }

  function switchCovenant() {
    resetBook()
    setCovenant(covenantIndex.value ? 0 : 1)
  }

  function setChapterIndex(index: number) {
    chapterIndex.value = index
    localStorage.setItem('chapter', String(index))
  }

  function setLineIndex(index: number) {
    lineIndex.value = index
    localStorage.setItem('line', String(index))
  }

  function setVerseId(id: string | null) {
    verseId.value = id
    id ? localStorage.setItem('verse', id) : localStorage.removeItem('verse')
  }

  async function selectChapter(index: number) {
    setChapterIndex(index)
    await getChapterContent()
  }

  /** Opens the Bible on the given verse ('1.004.002.010') */
  async function gotoVerse(id: string) {
    const [covenant, bookNum, chapter, line] = parseLineRef(id)
    if ([covenant, bookNum, chapter, line].some((value) => Number.isNaN(value))) return

    setCovenant(covenant)
    selectBook(bookNum)
    setChapterIndex(chapter)
    setLineIndex(line)
    setVerseId(id)
    localStorage.removeItem('topic')

    await app.setPage('bible')
    await getChapterContent()
  }

  /* ---------- loading the Bible text ---------- */

  async function getBooks() {
    books.value = await Promise.all(
      [0, 1].map((covenant) => getRecordsByIndex<Book>('books', 'covenant', covenant))
    )
    if (book.value) bookTitle.value = book.value.title
  }

  /** Loads the current translation into IndexedDB unless it is already there */
  async function refreshContent(forced = false) {
    const loaded = localStorage.getItem('content-translation')
    const upToDate = !loaded || loaded === user.translation

    if (!forced && upToDate && covenantNames.value.length && (await testLocalDB())) {
      await getBooks()
      return
    }

    const response = await fetch(pathToResource.value)
    if (!response.ok) throw new Error(`Failed to load ${pathToResource.value}: ${response.status}`)
    const content: BibleJSON = await response.json()

    covenantNames.value = content.map((covenant) => covenant.title)
    localStorage.setItem('covenant-names', JSON.stringify(covenantNames.value))

    await Promise.all([clearStore('books'), clearStore('content')])
    localStorage.removeItem('content-translation')

    const bookRecords: Book[] = []

    for (const [covenant, { books: covenantBooks }] of content.entries()) {
      for (const [bookNum, { title, chapters: bookChapters }] of covenantBooks.entries()) {
        bookRecords.push({
          _id: getBookRef(covenant, bookNum),
          covenant,
          book: bookNum,
          title,
          chapters: bookChapters.length,
          div: beforeDivider.includes(title)
        })

        const verses: Verse[] = bookChapters.flatMap((lines, chapter) =>
          lines.map((text, line) => ({
            _id: getLineRef(covenant, bookNum, chapter, line),
            covenant,
            book: getBookRef(covenant, bookNum),
            chapter: getChapterRef(covenant, bookNum, chapter),
            line,
            verse: text
          }))
        )

        await putRecords('content', verses)
      }
    }

    await putRecords('books', bookRecords)
    localStorage.setItem('content-translation', user.translation)
    await getBooks()
  }

  const initContent = () => app.withProgress(() => refreshContent())

  async function switchTranslation(translation: string) {
    await app.withProgress(async () => {
      await user.updateUserTranslation(translation)
      await refreshContent(true)
      bookIndex.value !== null && (await getChapterContent())
    })
  }

  async function getChapterContent() {
    const ref = chapterRef.value
    if (!ref) return

    await app.withProgress(async () => {
      const lines = await getRecordsByIndex<Verse>('content', 'chapter', ref)

      if (user.signed) {
        const markers = await getRecordsByIndex<HighlightRecord>('highlights', 'chapter', ref)
        for (const { _id, colored } of markers) {
          const line = lines.find((record) => record._id === _id)
          line && Object.assign(line, { colored, html: getHTML({ verse: line.verse, colored }) })
        }
      }

      lines.sort((a, b) => a.line - b.line)
      chapterContent.value = lines
    })
  }

  async function getListOfVerses(refs: string[]) {
    await app.withProgress(async () => {
      const verses = await getVersesByRefs(refs)
      listOfVerses.value = verses.map((item) => ({ ...item, html: getVerseHTML(item) }))
    })
  }

  async function resetLocalDB() {
    await Promise.all(userStoreNames.map((storeName) => clearStore(storeName)))
    await getChapterContent()
  }

  /* ---------- the verse opened in the details dialog ---------- */

  function setCurrentVerse(item: Verse | null) {
    currentLineId.value = item?._id ?? null
    verse.value = item
  }

  function resetCurrentVerse() {
    setCurrentVerse(null)
    lineKeywords.value = []
    lineTopics.value = []
    lineNotes.value = []
  }

  async function getLine(id: string) {
    currentLineId.value = id
    verse.value = (await app.withProgress(() => getRecord<Verse>('content', id))) ?? null
  }

  async function getLineKeywords(id: string) {
    lineKeywords.value = (await app.withProgress(() => searchLineKeywords(id))) ?? []
  }

  async function getLineTopics(id: string) {
    lineTopics.value = (await app.withProgress(() => searchLineTopics(id))) ?? []
  }

  async function getLineNotes(id: string) {
    lineNotes.value = (await app.withProgress(() => searchNotes({ lineRef: id }))) ?? []
  }

  async function getLineDetails(id: string) {
    await Promise.all([getLineKeywords(id), getLineTopics(id), getLineNotes(id)])
  }

  /**
   * Adds or removes a verse ref in a keyword / topic / note record,
   * saves it locally and in Firestore. Returns the updated record or null.
   */
  async function updateRefs<T extends { _id: string; refs: string[] }>(
    storeName: 'keywords' | 'topics' | 'notes',
    item: string | { _id: string },
    id: string,
    action: 'add' | 'remove'
  ) {
    const record = await getRecord<T>(storeName, idFrom(item))
    if (!record) {
      console.error(`${storeName}: record ${idFrom(item)} was not found`)
      return null
    }

    const assigned = record.refs.includes(id)
    if ((action === 'add') === assigned) return null

    action === 'add' ? record.refs.push(id) : removeById(record.refs, id)

    await putRecord(storeName, record)
    await useFirebaseStore().saveFirebaseDocument(storeName, record)
    return record
  }

  async function addKeywordToVerse(keyword: string | Keyword, id: string) {
    const record = await app.withProgress(() => updateRefs<Keyword>('keywords', keyword, id, 'add'))
    record && pushUnique(lineKeywords.value, record._id)
  }

  async function removeKeywordFromVerse(keyword: string | Keyword, id: string) {
    const record = await app.withProgress(() => updateRefs<Keyword>('keywords', keyword, id, 'remove'))
    record && removeById(lineKeywords.value, record._id)
  }

  async function addTopicToVerse(topic: string | Topic, id: string) {
    const record = await app.withProgress(() => updateRefs<Topic>('topics', topic, id, 'add'))
    record && pushUnique(lineTopics.value, record)
  }

  async function removeTopicFromVerse(topic: string | Topic, id: string) {
    const record = await app.withProgress(() => updateRefs<Topic>('topics', topic, id, 'remove'))
    record && removeById(lineTopics.value, record._id)
  }

  async function addNoteToVerse(note: string | Note, id: string) {
    const record = await app.withProgress(() => updateRefs<Note>('notes', note, id, 'add'))
    record && pushUnique(lineNotes.value, record)
  }

  async function removeNoteFromVerse(note: string | Note, id: string) {
    const record = await app.withProgress(() => updateRefs<Note>('notes', note, id, 'remove'))
    record && removeById(lineNotes.value, record._id)
  }

  /* ---------- highlighting ---------- */

  function setCursor(value: string) {
    cursor.value = value
  }

  function setHighlightColor(value: string) {
    highlightColor.value = value
  }

  function resetHighlighting() {
    previousCursorState.value = { cursor: cursor.value, highlightColor: highlightColor.value }
    cursor.value = 'default'
    highlightColor.value = NO_COLOR
  }

  function restoreCursor() {
    ;({ cursor: cursor.value, highlightColor: highlightColor.value } = previousCursorState.value)
  }

  /** <p id="verse-ref"> that contains the node, or the one in the same table row */
  function verseIdOf(node: Node | null) {
    const element = node instanceof Element ? node : node?.parentElement
    return (element?.closest('p[id]') ?? element?.closest('tr')?.querySelector('p[id]'))?.id ?? null
  }

  /** Paints the selected text of the chapter with the current highlighter color */
  async function selectionChange() {
    const selection = document.getSelection()
    const lines = chapterContent.value
    if (!selection || selection.isCollapsed || !lines) return

    const ids = [verseIdOf(selection.anchorNode), verseIdOf(selection.focusNode)]
    if (ids.some((id) => !id)) return

    const [firstIndex, lastIndex] = ids
      .map((id) => lines.findIndex((line) => line._id === id))
      .sort((a, b) => a - b)
    if (firstIndex === -1) return

    const fragments = selection
      .toString()
      .replace(/\d/g, '')
      .split('\t')
      .join('')
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length)

    for (let index = firstIndex; index <= lastIndex; index++) {
      const fragment = fragments[index - firstIndex]
      if (!fragment) continue

      const line = lines[index]
      const start = line.verse.indexOf(fragment)
      if (start === -1) continue

      const added = { start, end: start + fragment.length - 1, color: highlightColor.value }
      const colored = clearHighlights(updateIntervals(line.colored, added))
      const record: HighlightRecord = { _id: line._id, chapter: chapterOf(line._id), colored }

      await putRecord('highlights', record)
      useFirebaseStore().saveFirebaseDocument('highlights', record)

      lines.splice(index, 1, { ...line, colored, html: getHTML({ verse: line.verse, colored }) })
    }
  }

  return {
    covenantNames,
    covenantIndex,
    books,
    bookIndex,
    bookTitle,
    chapterIndex,
    chapterContent,
    lineIndex,
    verseId,
    highlightColor,
    cursor,
    currentLineId,
    verse,
    lineTopics,
    lineKeywords,
    lineNotes,
    listOfVerses,

    pathToResource,
    covenantName,
    bookRef,
    chapterRef,
    lineRef,
    book,
    chapters,
    cursorStyle,

    initOptions,
    setCovenant,
    selectBook,
    resetBook,
    switchCovenant,
    setChapterIndex,
    setLineIndex,
    setVerseId,
    selectChapter,
    gotoVerse,
    getBooks,
    refreshContent,
    initContent,
    switchTranslation,
    getChapterContent,
    getListOfVerses,
    resetLocalDB,
    setCurrentVerse,
    resetCurrentVerse,
    getLine,
    getLineKeywords,
    getLineTopics,
    getLineNotes,
    getLineDetails,
    addKeywordToVerse,
    removeKeywordFromVerse,
    addTopicToVerse,
    removeTopicFromVerse,
    addNoteToVerse,
    removeNoteFromVerse,
    setCursor,
    setHighlightColor,
    resetHighlighting,
    restoreCursor,
    selectionChange
  }
})
