import type { Ref } from 'vue'

/**
 * Tabs changed by a swipe on a phone (the handlers of v-touch, Touch of vuetify/directives): to the left — the next tab, to the right — the one before.
 * tabs: the tabs shown now; off: while a swipe belongs to the content (e.g. a map dragged).
 */
export function useSwipeTabs<T extends string>(tab: Ref<T>, tabs: () => T[], off?: () => boolean) {
  const step = (by: number) => {
    if (off?.()) return
    const list = tabs()
    const next = list[list.indexOf(tab.value) + by]
    if (next) tab.value = next
  }
  return { left: () => step(1), right: () => step(-1) }
}
