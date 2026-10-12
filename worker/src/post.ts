/** A topic as the app sends it for publishing: the texts and verses in the order of the topic */
export interface VersePost {
  /** the verse text */
  text: string
  /** e.g. "Від Матвія 1:1" */
  ref: string
}

export type TopicPostItem =
  ({ kind: 'verse' } & VersePost) | { kind: 'note'; text: string; verses: VersePost[] }

export interface TopicPost {
  title: string
  items: TopicPostItem[]
}

const MAX_ITEMS = 200
const MAX_TEXT = 20_000

const isText = (value: unknown, max = MAX_TEXT): value is string =>
  typeof value === 'string' && value.length <= max

const isVerse = (value: unknown): value is VersePost => {
  const verse = value as VersePost
  return Boolean(verse) && isText(verse.text) && isText(verse.ref, 200)
}

function isItem(value: unknown): value is TopicPostItem {
  const item = value as TopicPostItem
  if (!item) return false
  if (item.kind === 'verse') return isVerse(item)
  return (
    item.kind === 'note' &&
    isText(item.text) &&
    Array.isArray(item.verses) &&
    item.verses.length <= MAX_ITEMS &&
    item.verses.every(isVerse)
  )
}

/** The request body, or null when it is not a topic post */
export function parsePost(body: unknown): TopicPost | null {
  const post = body as TopicPost
  if (!post || !isText(post.title, 500) || !post.title.trim()) return null
  if (!Array.isArray(post.items) || post.items.length > MAX_ITEMS || !post.items.every(isItem)) return null
  return { title: post.title.trim(), items: post.items }
}
