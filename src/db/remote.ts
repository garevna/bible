import { translationMenuItems } from '@/configs'
import type { Book, Verse, VerseRef } from '@/types'
import { getBookRef, getChapterRef, getLineRef, parseLineRef } from '@/utils/refs'

/**
 * Translations read online (licensed on the YouVersion Platform, e.g. the New Russian Translation):
 * the app never holds them whole. The worker gives the list of the books and one chapter at a time
 * (worker/src/remoteBible.ts); they are kept in memory for this page only, never in IndexedDB.
 * There is no full text search in them: it would need the whole text.
 */

const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '')

export interface RemoteBible {
  title: string
  /** the notice the license asks to show with the text */
  copyright: string
  covenants: { title: string; books: { code: string; title: string; chapters: number[] }[] }[]
}

export const isRemote = (translation: string | null | undefined) =>
  Boolean(translation && translationMenuItems.find((item) => item.value === translation)?.remote)

const bibles = new Map<string, Promise<RemoteBible>>()
const chapters = new Map<string, Promise<string[]>>()

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${workerUrl}${path}`)
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`)
  return (await response.json()) as T
}

/** the books of a translation read online (once a session) */
export function loadRemote(translation: string): Promise<RemoteBible> {
  let bible = bibles.get(translation)
  if (!bible) {
    bible = get<RemoteBible>(`/bible/${translation}/books`)
    bible.catch(() => bibles.delete(translation))
    bibles.set(translation, bible)
  }
  return bible
}

/** the texts of the verses of a chapter (chapter: 0-based) */
export function loadRemoteChapter(translation: string, covenant: number, book: number, chapter: number) {
  const key = `${translation}|${covenant}|${book}|${chapter}`
  let lines = chapters.get(key)
  if (!lines) {
    lines = get<{ verses: string[] }>(`/bible/${translation}/${covenant}/${book}/${chapter}`).then(
      (answer) => answer.verses
    )
    lines.catch(() => chapters.delete(key))
    chapters.set(key, lines)
  }
  return lines
}

/** The books as the records of the books of IndexedDB */
export const remoteBooks = (bible: RemoteBible, divider: (title: string) => boolean): Book[][] =>
  bible.covenants.map((covenant, covenantIndex) =>
    covenant.books.map((book, bookNum) => ({
      _id: getBookRef(covenantIndex, bookNum),
      covenant: covenantIndex,
      book: bookNum,
      title: book.title,
      chapters: book.chapters.length,
      div: divider(book.title)
    }))
  )

/** The verses of a chapter as the verses of IndexedDB */
export async function remoteChapterLines(
  translation: string,
  covenant: number,
  book: number,
  chapter: number
): Promise<Verse[]> {
  const lines = await loadRemoteChapter(translation, covenant, book, chapter)
  return lines.map((text, line) => ({
    _id: getLineRef(covenant, book, chapter, line),
    covenant,
    book: getBookRef(covenant, book),
    chapter: getChapterRef(covenant, book, chapter),
    line,
    verse: text
  }))
}

/** The verses of a chapter as the verses of the app, with the title of the book */
export async function remoteChapterVerses(
  translation: string,
  covenant: number,
  book: number,
  chapter: number
): Promise<VerseRef[]> {
  const [bible, lines] = await Promise.all([
    loadRemote(translation),
    remoteChapterLines(translation, covenant, book, chapter)
  ])
  const bookName = bible.covenants[covenant]?.books[book]?.title
  return lines.map((verse) => ({ ...verse, bookName, chapterNum: chapter + 1, translation }))
}

/** The verse at a line ref of a translation read online */
export async function remoteVerse(translation: string, lineRef: string): Promise<VerseRef | null> {
  const [covenant = 0, book = 0, chapter = 0, line = 0] = parseLineRef(lineRef)
  const verses = await remoteChapterVerses(translation, covenant, book, chapter).catch(() => [])
  return verses[line] ?? null
}
