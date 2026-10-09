import { onBeforeUnmount, onMounted } from 'vue'

import { useContentStore } from '@/stores/content'

/**
 * Opens the Bible on a verse when a `.link-to-verse[data-verse-id]` produced by
 * `getVerseHTML` is clicked anywhere in the app.
 */
export function useVerseLinks() {
  const content = useContentStore()

  function onClick(event: MouseEvent) {
    const link = (event.target as Element | null)?.closest<HTMLElement>('[data-verse-id]')
    const verseId = link?.dataset.verseId
    if (!verseId) return
    event.stopPropagation()
    content.gotoVerse(verseId)
  }

  onMounted(() => document.addEventListener('click', onClick))
  onBeforeUnmount(() => document.removeEventListener('click', onClick))
}
