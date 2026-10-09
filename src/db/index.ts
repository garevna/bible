import type { Book, Keyword, Note, Topic, Verse, VerseRef } from '@/types'

import { dbKeys, dbName, storeNames, type StoreName } from './config'

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
  (await filterRecords<Keyword>('keywords', (keyword) => keyword.refs.includes(lineRef))).map(
    (keyword) => keyword._id
  )

export const searchLineTopics = (lineRef: string) =>
  filterRecords<Topic>('topics', (topic) => topic.refs.includes(lineRef))

export interface NotesFilter {
  lineRef?: string | null
  keyword?: string | null
  topic?: string | null
  date?: string | null
}

/** Note ids are creation timestamps, so the date filter compares them as ISO dates */
export const noteDate = (note: Pick<Note, '_id'>) => new Date(Number(note._id)).toISOString().slice(0, 10)

export const searchNotes = ({ lineRef, keyword, topic, date }: NotesFilter) =>
  filterRecords<Note>(
    'notes',
    (note) =>
      (!lineRef || note.refs.includes(lineRef)) &&
      (!keyword || note.keywords.includes(keyword)) &&
      (!topic || note.topics.includes(topic)) &&
      (!date || noteDate(note) === date)
  )

/** Verses with the title of their book and the 1-based chapter number */
export async function getVersesByRefs(refs: string[]): Promise<VerseRef[]> {
  const verses = await getRecordsByKeys<Verse>('content', refs)
  const bookRefs = Array.from(new Set(verses.map((verse) => verse.book)))
  const books = await getRecordsByKeys<Book>('books', bookRefs)

  return verses.map((verse) => ({
    ...verse,
    bookName: books.find((book) => book._id === verse.book)?.title,
    chapterNum: Number(verse.chapter.slice(6)) + 1
  }))
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
