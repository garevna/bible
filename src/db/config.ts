export const dbName = 'bible'

export const storeNames = [
  'books',
  'content',
  'notes',
  'stored',
  'search',
  'keywords',
  'topics',
  'highlights'
] as const

export type StoreName = (typeof storeNames)[number]

/** Stores that belong to the signed-in user and are synced with Firestore */
export const userStoreNames = ['keywords', 'topics', 'notes', 'highlights'] as const

export type UserStoreName = (typeof userStoreNames)[number]

/** Indexes of each object store (all records use `_id` as the key path) */
export const dbKeys: Record<StoreName, string[]> = {
  content: ['covenant', 'book', 'chapter', 'line'],
  books: ['covenant'],
  keywords: [],
  topics: [],
  notes: [],
  highlights: ['chapter'],
  stored: ['topic', 'keyword'],
  search: ['topic', 'keyword']
}
