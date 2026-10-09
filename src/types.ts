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

export interface Topic {
  _id: string
  title: string
  refs: string[]
  order: string[]
}

export interface Note {
  _id: string
  refs: string[]
  topics: string[]
  keywords: string[]
  text: string
}

export interface User {
  userName?: string
  avatar?: string
  city?: string
  country?: string
  translation?: string
  lang?: Lang
  login: string
  password: string
}

export type Page = 'bible' | 'notes' | 'keywords' | 'topics' | 'topic' | 'search'

export interface MenuItem {
  value: string
  text: string
  icon?: string
}
