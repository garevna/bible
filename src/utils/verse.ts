import { translationMenuItems } from '@/configs'
import { getVersesByRefs } from '@/db'
import type { VerseRef } from '@/types'

import { loadedTranslation } from './refs'

/** 'Синод.' for a verse of the Synodal translation */
const shortName = (translation: string) =>
  translationMenuItems.find((item) => item.value === translation)?.short ?? translation

/** The short name of the translation of a verse picked in another translation than the chosen one, or '' */
export const foreignTranslation = ({ translation }: VerseRef) =>
  translation && translation !== loadedTranslation() ? shortName(translation) : ''

/**
 * Verse text followed by a link to its place in the Bible.
 * The link is handled by a delegated click listener (see `useVerseLinks`),
 * because Vue does not compile event handlers inside v-html.
 * A verse of another translation names it and has no link: the Bible shows the chosen translation.
 */
export function getVerseHTML(verse: VerseRef) {
  const { _id, bookName, chapterNum, line, verse: text } = verse
  const foreign = foreignTranslation(verse)
  const reference = `${bookName} ${chapterNum}:${line + 1}`
  return foreign
    ? `${text} <small class="verse-reference">(${reference}, ${foreign})</small>`
    : `${text} <small class="link-to-verse" data-verse-id="${_id}">(${reference})</small>`
}

/** Verses for the refs, each with an html line that links back to the Bible */
export async function versesWithLinks(refs: string[]) {
  if (!refs.length) return []
  const verses = await getVersesByRefs(refs)
  return verses.map((verse) => ({ ...verse, html: getVerseHTML(verse) }))
}

/** "Від Матвія 1:1", and the translation when the verse was picked in one: "От Иоанна 3:16, Синод." */
export const verseReference = (verse: VerseRef) => {
  const reference = `${verse.bookName ?? ''} ${verse.chapterNum}:${verse.line + 1}`.trim()
  return verse.translation ? `${reference}, ${shortName(verse.translation)}` : reference
}
