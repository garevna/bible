import { useContentStore } from '@/stores/content'
import { useNotesStore } from '@/stores/notes'
import { useTopicsStore } from '@/stores/topics'
import type { Attachment } from '@/stores/worker'

import type { VersePost } from './topicPost'

/** note ids are creation timestamps: two notes saved in one millisecond would share one */
const nextMillisecond = () => new Promise((resolve) => setTimeout(resolve, 2))

const refsOf = (verses: VersePost[]) => verses.flatMap((verse) => (verse.id ? [verse.id] : []))

async function saveNote(text: string, verses: VersePost[], topicId?: string) {
  const notes = useNotesStore()
  await notes.startNewNote(topicId ? { topicId } : {})
  notes.updateCurrentNoteText(text)
  await notes.addVersesToCurrentNote(refsOf(verses))
  await notes.saveCurrentNote()
  await nextMillisecond()
}

/**
 * Makes a note or a topic sent in a message one's own: a note with its verses,
 * or a topic with its verses and notes, in their order.
 */
export async function saveAttachment({ kind, post }: Attachment) {
  if (kind === 'note') {
    for (const item of post.items) if (item.kind === 'note') await saveNote(item.text, item.verses)
    return
  }
  const topic = await useTopicsStore().createTopic(post.title || '…')
  for (const item of post.items) {
    if (item.kind === 'note') await saveNote(item.text, item.verses, topic._id)
    else if (item.id) await useContentStore().addTopicToVerse(topic._id, item.id)
  }
}
