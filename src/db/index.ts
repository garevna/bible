import type { Book, Keyword, Note, Topic, Verse, VerseRef } from '@/types'

import { loadedTranslation, refersTo, splitRef } from '@/utils/refs'
import { normalize, queryWords } from '@/utils/search'

import { loadBible, verseOf } from './bibles'
import { dbKeys, dbName, storeNames, type StoreName } from './config'
import { isRemote, remoteVerse } from './remote'

export * from './config'

/** Wraps an IDBRequest into a promise */
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function upgradeDB(db: IDBDatabase) {
  for (const storeName of storeNames) {
    if (db.objectStoreNames.contains(storeName)) db.deleteObjectStore(storeName)

    const store = db.createObjectStore(storeName, { keyPath: '_id' })

    dbKeys[storeName].forEach((key) => store.createIndex(key, key, { multiEntry: true }))
  }
}

/** True when the existing database lacks some store or index from the config */
function schemaChanged(db: IDBDatabase) {
  if (storeNames.some((storeName) => !db.objectStoreNames.contains(storeName))) return true

  const transaction = db.transaction([...storeNames], 'readonly')

  return storeNames.some((storeName) => {
    const indexes = Array.from(transaction.objectStore(storeName).indexNames)
    const expected = dbKeys[storeName]
    return indexes.length !== expected.length || expected.some((key) => !indexes.includes(key))
  })
}

/** Opens the database without a version to find out which version we need */
function detectVersion(): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName)

    req.onupgradeneeded = () => upgradeDB(req.result)

    req.onsuccess = () => {
      const db = req.result
      const version = schemaChanged(db) ? db.version + 1 : db.version
      db.close()
      resolve(version)
    }

    req.onerror = () => reject(req.error)
  })
}

function open(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version)

    req.onupgradeneeded = () => upgradeDB(req.result)

    req.onsuccess = () => {
      const db = req.result
      // another tab upgraded the schema: release the connection, the next call reopens it
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }

    req.onblocked = () => reject(new Error('IndexedDB is blocked by another open tab'))
    req.onerror = () => reject(req.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = detectVersion().then(open)
    dbPromise.catch(() => (dbPromise = null))
  }
  return dbPromise
}

async function objectStore(storeName: StoreName, mode: IDBTransactionMode = 'readonly') {
  const db = await getDB()
  return db.transaction(storeName, mode).objectStore(storeName)
}

export async function getRecord<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return request<T | undefined>((await objectStore(storeName)).get(key))
}

export async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  return request<T[]>((await objectStore(storeName)).getAll())
}

export async function getRecordsByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey
): Promise<T[]> {
  const store = await objectStore(storeName)
  return request<T[]>(store.index(indexName).getAll(IDBKeyRange.only(value)))
}

export async function getAllKeys(storeName: StoreName, indexName?: string): Promise<IDBValidKey[]> {
  const store = await objectStore(storeName)
  const source = indexName && dbKeys[storeName].includes(indexName) ? store.index(indexName) : store
  return request(source.getAllKeys())
}

/** Records for the given keys in the same order, missing ones are skipped */
export async function getRecordsByKeys<T>(storeName: StoreName, keys: IDBValidKey[]): Promise<T[]> {
  if (!keys.length) return []
  const store = await objectStore(storeName)
  const records = await Promise.all(keys.map((key) => request<T | undefined>(store.get(key))))
  return records.filter((record): record is Awaited<T> => Boolean(record))
}

export async function putRecord<T>(storeName: StoreName, record: T) {
  return request((await objectStore(storeName, 'readwrite')).put(record))
}

/** Writes all records in one transaction */
export async function putRecords<T>(storeName: StoreName, records: T[]) {
  const db = await getDB()
  const transaction = db.transaction(storeName, 'readwrite')
  const store = transaction.objectStore(storeName)

  records.forEach((record) => store.put(record))

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function deleteRecord(storeName: StoreName, key: IDBValidKey) {
  return request((await objectStore(storeName, 'readwrite')).delete(key))
}

export async function clearStore(storeName: StoreName) {
  return request((await objectStore(storeName, 'readwrite')).clear())
}

/** Iterates over all records of a store and returns the ones matching the predicate */
async function filterRecords<T>(storeName: StoreName, predicate: (record: T) => boolean): Promise<T[]> {
  const records = await getAllRecords<T>(storeName)
  return records.filter(predicate)
}

export const searchLineKeywords = async (lineRef: string) =>
  (
    await filterRecords<Keyword>('keywords', (keyword) => keyword.refs.some((ref) => refersTo(ref, lineRef)))
  ).map((keyword) => keyword._id)

export const searchLineTopics = (lineRef: string) =>
  filterRecords<Topic>('topics', (topic) => topic.refs.some((ref) => refersTo(ref, lineRef)))

export interface NotesFilter {
  lineRef?: string | null
  keyword?: string | null
  topic?: string | null
  date?: string | null
  /** words of the note text (case, apostrophes and punctuation are ignored) */
  text?: string | null
  /** dates as 'YYYY-MM-DD', inclusive */
  from?: string | null
  to?: string | null
}

/** 'YYYY-MM-DD' of the date in the local time zone */
export const localISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Note ids are creation timestamps, so the date filter compares their local dates */
export const noteDate = (note: Pick<Note, '_id'>) => localISODate(new Date(Number(note._id)))

export function searchNotes({ lineRef, keyword, topic, date, text, from, to }: NotesFilter) {
  const words = queryWords(text ?? '')
  return filterRecords<Note>('notes', (note) => {
    const day = noteDate(note)
    return (
      (!lineRef || note.refs.some((ref) => refersTo(ref, lineRef))) &&
      (!keyword || note.keywords.includes(keyword)) &&
      (!topic || note.topics.includes(topic)) &&
      (!date || day === date) &&
      (!from || day >= from) &&
      (!to || day <= to) &&
      (!words.length || words.every((word) => normalize(note.text).includes(word)))
    )
  })
}

/** Verses of the loaded translation (IndexedDB) with the title of their book and the 1-based chapter number */
async function loadedVerses(lineRefs: string[]): Promise<VerseRef[]> {
  const verses = await getRecordsByKeys<Verse>('content', lineRefs)
  const bookRefs = Array.from(new Set(verses.map((verse) => verse.book)))
  const books = await getRecordsByKeys<Book>('books', bookRefs)

  return verses.map((verse) => ({
    ...verse,
    bookName: books.find((book) => book._id === verse.book)?.title,
    chapterNum: Number(verse.chapter.slice(6)) + 1
  }))
}

/**
 * Verses of the refs, in their order; each keeps its ref as `_id`. Plain refs and the refs
 * of the loaded translation come from IndexedDB, the others from the files of their translations.
 */
export async function getVersesByRefs(refs: string[]): Promise<VerseRef[]> {
  const loaded = loadedTranslation()
  // a translation read online: its verses (the plain refs too) come from the worker, a chapter at a time
  const parts = refs.map((ref) => {
    const split = splitRef(ref)
    return { ref, ...split, online: isRemote(split.translation ?? loaded) }
  })
  const byRef = new Map<string, VerseRef>()
  for (const part of parts.filter((item) => item.online)) {
    const verse = await remoteVerse(part.translation ?? loaded!, part.lineRef)
    verse &&
      byRef.set(part.ref, {
        ...verse,
        _id: part.ref,
        ...(part.translation ? {} : { translation: undefined })
      })
  }
  const local = parts.filter(({ translation, online }) => !online && (!translation || translation === loaded))

  const fromDB = await loadedVerses(local.map(({ lineRef }) => lineRef))
  for (const { ref, translation, lineRef } of local) {
    const verse = fromDB.find((item) => item._id === lineRef)
    verse && byRef.set(ref, { ...verse, _id: ref, ...(translation ? { translation } : {}) })
  }

  const others = parts.filter(({ translation, online }) => !online && translation && translation !== loaded)
  for (const translation of new Set(others.map((part) => part.translation!))) {
    const bible = await loadBible(translation).catch(() => null)
    if (!bible) continue
    for (const part of others.filter((item) => item.translation === translation)) {
      const verse = verseOf(bible, part.lineRef, translation)
      verse && byRef.set(part.ref, { ...verse, _id: part.ref })
    }
  }

  return refs.flatMap((ref) => byRef.get(ref) ?? [])
}

/** True when the database is usable and the Bible text has already been saved into it */
export async function testLocalDB() {
  try {
    return Boolean(await getRecord('content', '1.001.001.005'))
  } catch (error) {
    console.error('INDEXEDDB ERROR!\n', error)
    return false
  }
}
