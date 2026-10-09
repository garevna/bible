import type { VerseRef } from '@/types'

/**
 * Verse text followed by a link to its place in the Bible.
 * The link is handled by a delegated click listener (see `useVerseLinks`),
 * because Vue does not compile event handlers inside v-html.
 */
export function getVerseHTML({ _id, bookName, chapterNum, line, verse }: VerseRef) {
  return `${verse} <small class="link-to-verse" data-verse-id="${_id}">(${bookName} ${chapterNum}:${line + 1})</small>`
}
