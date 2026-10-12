import type { TopicItem } from '@/stores/topics'
import type { VerseRef } from '@/types'

import { verseReference } from './verse'

/** The body of POST /telegram/preview and /telegram/publish (see worker/src/post.ts) */
export interface VersePost {
  text: string
  ref: string
}

export type TopicPostItem =
  ({ kind: 'verse' } & VersePost) | { kind: 'note'; text: string; verses: VersePost[] }

export interface TopicPost {
  title: string
  items: TopicPostItem[]
}

const versePost = (verse: VerseRef): VersePost => ({ text: verse.verse, ref: verseReference(verse) })

/** The topic in the order of the page: notes with their verses, and the verses of the topic */
export const topicPost = (title: string, items: TopicItem[]): TopicPost => ({
  title,
  items: items.map((item) =>
    item.type === 'note'
      ? { kind: 'note', text: item.text, verses: item.verses.map(versePost) }
      : { kind: 'verse', ...versePost(item) }
  )
})
