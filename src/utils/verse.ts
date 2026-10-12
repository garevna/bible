import { translationMenuItems } from '@/configs'
import { getVersesByRefs } from '@/db'
import type { VerseRef } from '@/types'

import { loadedTranslation } from './refs'

/** 'СП' for a verse of the Synodal translation */
const shortName = (translation: string) =>
  translationMenuItems.find((item) => item.value === translation)?.short ?? translation

/** The abbreviation of the translation of a verse: its own, or the one chosen in the menu; '' when unknown */
export const translationOf = (verse: VerseRef) => {
  const translation = verse.translation ?? loadedTranslation()
  return translation ? shortName(translation) : ''
}

/** "СП, Бытие 1:3": the abbreviation of the translation first */
const withTranslation = (verse: VerseRef) => {
  const reference = `${verse.bookName ?? ''} ${verse.chapterNum}:${verse.line + 1}`.trim()
  const short = translationOf(verse)
  return short ? `${short}, ${reference}` : reference
}

/**
 * Verse text followed by a link to its place in the Bible.
 * The link is handled by a delegated click listener (see `useVerseLinks`),
 * because Vue does not compile event handlers inside v-html.
 * A verse of another translation has no link: the Bible shows the translation chosen in the menu.
 */
export function getVerseHTML(verse: VerseRef) {
  const foreign = Boolean(verse.translation) && verse.translation !== loadedTranslation()
  const reference = withTranslation(verse)
  return foreign
    ? `${verse.verse} <small class="verse-reference">(${reference})</small>`
    : `${verse.verse} <small class="link-to-verse" data-verse-id="${verse._id}">(${reference})</small>`
}

/** Verses for the refs, each with an html line that links back to the Bible */
export async function versesWithLinks(refs: string[]) {
  if (!refs.length) return []
  const verses = await getVersesByRefs(refs)
  return verses.map((verse) => ({ ...verse, html: getVerseHTML(verse) }))
}

/** "Огієнко, Від Матвія 1:1" (e.g. under a verse of a post) */
export const verseReference = withTranslation
