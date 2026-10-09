<template>
  <v-autocomplete
    v-model="selected"
    v-model:search="search"
    v-model:menu="menu"
    :items="keywords.searchResult"
    :label="selector.textSearchPrompt"
    :no-data-text="selector.noData"
    :prepend-inner-icon="canCreate ? '$add' : '$search'"
    variant="outlined"
    density="compact"
    clearable
    hide-details
    @click:prepend-inner="create"
    @keyup.enter="create"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useKeywordsStore } from '@/stores/keywords'
import { useLanguageStore } from '@/stores/language'

const selected = defineModel<string | null>({ default: null })

const keywords = useKeywordsStore()
const { selector } = storeToRefs(useLanguageStore())

const search = ref('')
const menu = ref(false)

/** the typed text matches no keyword: the prepend icon creates it */
const canCreate = computed(() => Boolean(search.value?.trim()) && !keywords.searchResult.length)

watch(search, (value) => value && value !== selected.value && keywords.searchKeywords(value))

/** after Enter the autocomplete would reopen its list over the dialog buttons */
async function closeMenu() {
  ;(document.activeElement as HTMLElement | null)?.blur()
  await nextTick()
  menu.value = false
}

async function create() {
  if (!canCreate.value) return
  const name = search.value.trim()
  await keywords.createKeyword(name)
  selected.value = name
  closeMenu()
}
</script>
