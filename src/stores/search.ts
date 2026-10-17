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

    // a translation read online has no full text here: nothing is searched (the page says so)
    if (content.remote) return []
    const verses = (await app.withProgress(() => getAllRecords<Verse>('content'))) ?? []
    verses.sort((a, b) => (a._id < b._id ? -1 : 1))
    index.value = verses.map((verse) => ({ verse, text: normalize(verse.verse) }))
    return index.value
  }

  function inScope(verse: Verse, value: SearchScope) {
    switch (value) {
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

  /** A query is searchable when it has a word of two or more letters */
  const searchable = (wordList: string[]) => wordList.some((word) => word.length >= 2)

  /** Verses that contain all words (as word parts), in Bible order */
  async function findVerses(wordList: string[], value: SearchScope = 'all') {
    if (!searchable(wordList)) return []
    const verses = await loadIndex()
    return verses
      .filter(({ verse, text }) => inScope(verse, value) && wordList.every((word) => text.includes(word)))
      .map(({ verse }) => verse)
  }

  /** Runs the query of the Search page */
  async function search() {
    words.value = queryWords(query.value ?? '')
    shown.value = PAGE
    found.value = await findVerses(words.value, scope.value)
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

  return { query, scope, words, results, total, hasMore, search, showMore, findVerses, searchable }
})
