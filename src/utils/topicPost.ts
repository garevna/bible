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
  /** the picture of the topic (a data URL); in Telegram the title is its caption */
  image?: string
}

const versePost = (verse: VerseRef): VersePost => ({ text: verse.verse, ref: verseReference(verse) })

/** The topic in the order of the page: notes with their verses, and the verses of the topic */
export const topicPost = (title: string, items: TopicItem[], image?: string): TopicPost => ({
  title,
  ...(image ? { image } : {}),
  items: items.map((item) =>
    item.type === 'note'
      ? { kind: 'note', text: item.text, verses: item.verses.map(versePost) }
      : { kind: 'verse', ...versePost(item) }
  )
})

/** A note for the Telegram channel: its text and its verses, without a title */
export const notePost = (text: string, verses: VerseRef[]): TopicPost => ({
  title: '',
  items: [{ kind: 'note', text, verses: verses.map(versePost) }]
})
