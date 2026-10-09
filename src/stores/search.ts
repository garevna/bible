import { computed, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'

import { getAllRecords } from '@/db'
import type { Verse } from '@/types'
import { markWords, normalize, queryWords } from '@/utils/search'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useUserStore } from './user'

export type SearchScope = 'all' | 'old' | 'new' | 'book'

interface IndexedVerse {
  verse: Verse
  text: string
}

/** results are rendered in pages of this size */
const PAGE = 100

export const useSearchStore = defineStore('search', () => {
  const app = useAppStore()
  const content = useContentStore()
  const user = useUserStore()

  const query = ref('')
  const scope = ref<SearchScope>('all')
  const shown = ref(PAGE)

  /** all verses of the current translation, loaded on the first search */
  const index = shallowRef<IndexedVerse[] | null>(null)
  const found = shallowRef<Verse[]>([])
  const words = ref<string[]>([])

  // the index belongs to the translation it was built from
  watch(
    () => user.translation,
    () => (index.value = null)
  )

  async function loadIndex() {
    if (index.value) return index.value

    const verses = (await app.withProgress(() => getAllRecords<Verse>('content'))) ?? []
    verses.sort((a, b) => (a._id < b._id ? -1 : 1))
    index.value = verses.map((verse) => ({ verse, text: normalize(verse.verse) }))
    return index.value
  }

  function inScope(verse: Verse) {
    switch (scope.value) {
      case 'old':
        return verse.covenant === 0
      case 'new':
        return verse.covenant === 1
      case 'book':
        return verse.book === content.bookRef
      default:
        return true
    }
  }

  /** Verses that contain all words of the query (as word parts), in Bible order */
  async function search() {
    words.value = queryWords(query.value ?? '')
    shown.value = PAGE

    if (!words.value.some((word) => word.length >= 2)) {
      found.value = []
      return
    }

    const verses = await loadIndex()
    found.value = verses
      .filter(({ verse, text }) => inScope(verse) && words.value.every((word) => text.includes(word)))
      .map(({ verse }) => verse)
  }

  const results = computed(() =>
    found.value
      .slice(0, shown.value)
      .map((verse) => ({ ...verse, html: markWords(verse.verse, words.value) }))
  )

  const total = computed(() => found.value.length)
  const hasMore = computed(() => shown.value < found.value.length)

  function showMore() {
    shown.value += PAGE
  }

  return { query, scope, words, results, total, hasMore, search, showMore }
})
