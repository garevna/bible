import { ref } from 'vue'
import { defineStore } from 'pinia'

import { deleteRecord, getAllKeys, getAllRecords, putRecord, searchNotes } from '@/db'
import type { Keyword } from '@/types'
import { removeById } from '@/utils/array'

import { useAppStore } from './app'
import { useContentStore } from './content'
import { useFirebaseStore } from './firebase'
import { useNotesStore } from './notes'

export const useKeywordsStore = defineStore('keywords', () => {
  const app = useAppStore()

  const keywordList = ref<Keyword[]>([])
  /** keyword ids matching the last search */
  const searchResult = ref<string[]>([])

  async function getFullList() {
    keywordList.value = (await app.withProgress(() => getAllRecords<Keyword>('keywords'))) ?? []
  }

  async function putKeyword(keyword: Keyword) {
    if (!keyword._id) return console.warn('Illegal keyword: ', keyword)

    await app.withProgress(async () => {
      await putRecord('keywords', keyword)
      useFirebaseStore().saveFirebaseDocument('keywords', keyword)
    })
  }

  /** Creates an empty keyword and offers it as the only search result */
  async function createKeyword(name: string) {
    const keyword = name.trim()
    if (!keyword) return
    // an existing keyword keeps its verses
    const existing = keywordList.value.find((item) => item._id === keyword)
    if (!existing) {
      await putKeyword({ _id: keyword, refs: [] })
      keywordList.value.push({ _id: keyword, refs: [] })
    }
    searchResult.value = [keyword]
  }

  /** Links the keyword to the verses and keeps the list in step */
  async function addKeywordToVerses(keyword: string, verseIds: string[]) {
    const content = useContentStore()
    for (const verseId of verseIds) await content.addKeywordToVerse(keyword, verseId)
    await getFullList()
  }

  async function removeKeywordFromVerse(keyword: string, verseId: string) {
    await useContentStore().removeKeywordFromVerse(keyword, verseId)
    await getFullList()
  }

  /** Deletes the keyword and removes it from the notes that link to it */
  async function deleteKeyword(keyword: Keyword) {
    await useNotesStore().unlinkFromNotes('keywords', keyword._id)
    removeById(useContentStore().lineKeywords, keyword._id)

    await app.withProgress(async () => {
      await deleteRecord('keywords', keyword._id)
      useFirebaseStore().deleteDocument('keywords', keyword._id)
    })
    removeById(keywordList.value, keyword._id)
  }

  async function searchKeywords(searchLine: string) {
    const search = searchLine.toLowerCase()
    const keys = (await app.withProgress(() => getAllKeys('keywords'))) ?? []
    searchResult.value = keys.map(String).filter((keyword) => keyword.toLowerCase().includes(search))
  }

  /** Notes marked with the keyword */
  async function getKeywordNotes(keyword: string) {
    return (await app.withProgress(() => searchNotes({ keyword }))) ?? []
  }

  return {
    keywordList,
    searchResult,
    getFullList,
    putKeyword,
    createKeyword,
    deleteKeyword,
    searchKeywords,
    addKeywordToVerses,
    removeKeywordFromVerse,
    getKeywordNotes
  }
})
