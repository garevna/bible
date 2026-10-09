import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { footerMenu } from '@/configs'
import type { Page } from '@/types'

import { useContentStore } from './content'
import { useKeywordsStore } from './keywords'
import { useNotesStore } from './notes'
import { useTopicsStore } from './topics'
import { useUserStore } from './user'

const pages = footerMenu.map((item) => item.value)

export const useAppStore = defineStore('app', () => {
  const viewportWidth = ref(window.innerWidth)
  const viewportHeight = ref(window.innerHeight)

  const page = ref<Page | null>(null)

  /** number of running operations; the progress bar is shown while it is above zero */
  const pending = ref(0)
  const progress = computed(() => pending.value > 0)

  const currentView = computed(() => footerMenu.find((item) => item.value === page.value)?.component ?? null)

  function changeViewport() {
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.innerHeight
  }

  /** Runs an async operation with the progress bar on; errors are logged, not rethrown */
  async function withProgress<T>(operation: () => Promise<T>): Promise<T | undefined> {
    pending.value++
    try {
      return await operation()
    } catch (error) {
      console.error(error)
      return undefined
    } finally {
      pending.value--
    }
  }

  function switchPage(value: Page) {
    page.value = value
  }

  async function initPage(value: Page) {
    switch (value) {
      case 'topic':
        await useTopicsStore().initTopic()
        break
      case 'topics':
        await useTopicsStore().getTopics()
        break
      case 'notes':
        await useNotesStore().init()
        break
      case 'keywords':
        await useKeywordsStore().getFullList()
        break
    }
    switchPage(value)
  }

  async function setPage(value: Page) {
    localStorage.setItem('page', value)
    await initPage(value)
  }

  async function init() {
    const user = useUserStore()
    const content = useContentStore()

    await user.initUser()

    content.initOptions()
    await content.initContent()

    const stored = localStorage.getItem('page') as Page | null
    await initPage(user.signed && stored && pages.includes(stored) ? stored : 'bible')
  }

  return {
    viewportWidth,
    viewportHeight,
    page,
    progress,
    currentView,
    changeViewport,
    withProgress,
    switchPage,
    initPage,
    setPage,
    init
  }
})
