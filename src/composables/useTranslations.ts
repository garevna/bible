import { computed, watch } from 'vue'

import { defaultTranslation, translationMenuItems } from '@/configs'
import { useContentStore } from '@/stores/content'
import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'

/**
 * The translations the user may read: the free ones, and the ones that need a permission (the menu warns
 * of them) for the owners, the administrators and the people of some ministries. A user on one of those
 * without the right is moved to a free translation, once the worker says what the user may.
 * This is the interface only: the files of the texts stay on the site.
 */
export function useTranslations() {
  const worker = useWorkerStore()

  const translations = computed(() =>
    translationMenuItems.filter((item) => !item.rights || worker.allTranslations)
  )

  return { translations }
}

/** Keeps the user on a translation they may read (App.vue) */
export function useTranslationAccess() {
  const worker = useWorkerStore()
  const user = useUserStore()
  const content = useContentStore()
  const { translations } = useTranslations()

  watch(
    // a guest is known at once; a signed in user once the worker answered
    () => [user.translation, translations.value, !user.signed || worker.calendar] as const,
    ([translation, list, known]) => {
      if (!known || list.some((item) => item.value === translation)) return
      content.switchTranslation(defaultTranslation)
    },
    { immediate: true }
  )
}
