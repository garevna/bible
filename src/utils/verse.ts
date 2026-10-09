import { getVersesByRefs } from '@/db'
import type { VerseRef } from '@/types'

/**
 * Verse text followed by a link to its place in the Bible.
 * The link is handled by a delegated click listener (see `useVerseLinks`),
 * because Vue does not compile event handlers inside v-html.
 */
export function getVerseHTML({ _id, bookName, chapterNum, line, verse }: VerseRef) {
  return `${verse} <small class="link-to-verse" data-verse-id="${_id}">(${bookName} ${chapterNum}:${line + 1})</small>`
}

/** Verses for the refs, each with an html line that links back to the Bible */
export async function versesWithLinks(refs: string[]) {
  if (!refs.length) return []
  const verses = await getVersesByRefs(refs)
  return verses.map((verse) => ({ ...verse, html: getVerseHTML(verse) }))
}
