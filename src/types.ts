export type Lang = 'ua' | 'en' | 'ru'

export type Localized<T = string> = Record<Lang, T>

export interface Marker {
  start: number
  end: number
  color: string
}

/** Record of the `books` IndexedDB store */
export interface Book {
  _id: string
  covenant: number
  book: number
  title: string
  chapters: number
  div: boolean
}

/** Record of the `content` IndexedDB store: one verse */
export interface Verse {
  _id: string
  covenant: number
  book: string
  chapter: string
  line: number
  verse: string
  colored?: Marker[]
  html?: string
}

/** Verse resolved together with its book title, used in lists of verses */
export interface VerseRef extends Verse {
  bookName?: string
  chapterNum: number
  /** set when the verse was picked in a translation of its own (see qualifiedRef) */
  translation?: string
}

export interface HighlightRecord {
  _id: string
  chapter: string
  colored: Marker[]
}

export interface Keyword {
  _id: string
  refs: string[]
}

/** The type of a note or a topic and how long it is kept (the types: src/utils/noteTypes.ts) */
export interface Typed {
  /** the id of its type, e.g. 'sermon'; none: the default type */
  typeId?: string
  /** ms; it is deleted after that (none: it is kept until its author deletes it) */
  expiresAt?: number
  /** it is deleted once it is posted to the channel */
  deleteAfterPublish?: boolean
  /** a copy saved from a message: whom it came from (they are its author) */
  from?: string
}

export interface Topic extends Typed {
  _id: string
  title: string
  refs: string[]
  order: string[]
  /** the picture in the head of the topic: a JPEG data URL */
  image?: string
}

export interface Note extends Typed {
  _id: string
  refs: string[]
  topics: string[]
  keywords: string[]
  text: string
}

/** users/{login} document in Firestore */
export interface Profile {
  userName?: string
  avatar?: string
  city?: string
  country?: string
  translation?: string
  lang?: Lang
}

/** Signed in user: the profile plus the Firebase Auth uid and email */
export interface User extends Profile {
  uid: string
  email?: string | null
}

export type Page =
  | 'bible'
  | 'notes'
  | 'keywords'
  | 'topics'
  | 'topic'
  | 'search'
  | 'admin'
  | 'messages'
  | 'calendar'
  | 'groups'

export interface MenuItem {
  value: string
  text: string
  icon?: string
}
