import { translationMenuItems } from '@/configs'
import type { VerseRef } from '@/types'
import { getBookRef, getChapterRef, getLineRef, parseLineRef } from '@/utils/refs'
import { normalize } from '@/utils/search'

/** public/bible-*.json */
export type BibleJSON = { title: string; books: { title: string; chapters: string[][] }[] }[]

/**
 * Translations other than the one in IndexedDB, read straight from their files when a verse
 * of theirs is shown or picked; each is fetched once per session (and then from the HTTP cache).
 */
const bibles = new Map<string, Promise<BibleJSON>>()

export function loadBible(translation: string): Promise<BibleJSON> {
  let bible = bibles.get(translation)
  if (!bible) {
    const json = translationMenuItems.find((item) => item.value === translation)?.json
    bible = json
      ? fetch(`${import.meta.env.BASE_URL}${json}`).then((response) => {
          if (!response.ok) throw new Error(`Failed to load ${json}: ${response.status}`)
          return response.json() as Promise<BibleJSON>
        })
      : Promise.reject(new Error(`Unknown translation: ${translation}`))
    // a failed load is tried again next time
    bible.catch(() => bibles.delete(translation))
    bibles.set(translation, bible)
  }
  return bible
}

/** The verse at a line ref of this Bible, as the other verses of the app */
export function verseOf(bible: BibleJSON, lineRef: string, translation: string): VerseRef | null {
  const [covenant = 0, bookNum = 0, chapter = 0, line = 0] = parseLineRef(lineRef)
  const book = bible[covenant]?.books[bookNum]
  const text = book?.chapters[chapter]?.[line]
  if (!book || text === undefined) return null
  return {
    _id: getLineRef(covenant, bookNum, chapter, line),
    covenant,
    book: getBookRef(covenant, bookNum),
    chapter: getChapterRef(covenant, bookNum, chapter),
    line,
    verse: text,
    bookName: book.title,
    chapterNum: chapter + 1,
    translation
  }
}

/** Verses of a chapter (chapter: 0-based) */
export const chapterVersesOf = (
  bible: BibleJSON,
  covenant: number,
  bookNum: number,
  chapter: number,
  translation: string
) =>
  (bible[covenant]?.books[bookNum]?.chapters[chapter] ?? []).flatMap(
    (_, line) => verseOf(bible, getLineRef(covenant, bookNum, chapter, line), translation) ?? []
  )

/** Verses with all the words (normalized as in the search of the app) */
export function searchBible(bible: BibleJSON, words: string[], translation: string): VerseRef[] {
  const found: VerseRef[] = []
  bible.forEach(({ books }, covenant) =>
    books.forEach(({ chapters }, bookNum) =>
      chapters.forEach((lines, chapter) =>
        lines.forEach((text, line) => {
          if (!words.every((word) => normalize(text).includes(word))) return
          const verse = verseOf(bible, getLineRef(covenant, bookNum, chapter, line), translation)
          verse && found.push(verse)
        })
      )
    )
  )
  return found
}
