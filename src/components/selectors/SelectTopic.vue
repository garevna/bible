<template>
  <v-autocomplete
    v-model="selected"
    v-model:search="search"
    :items="topics.searchResult"
    item-title="title"
    item-value="_id"
    return-object
    :label="selector.textSearchPrompt"
    :no-data-text="selector.noData"
    :prepend-inner-icon="canCreate ? '$add' : '$topic'"
    variant="outlined"
    density="compact"
    clearable
    hide-details
    @click:prepend-inner="create"
    @keyup.enter="create"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useTopicsStore } from '@/stores/topics'
import type { Topic } from '@/types'

const selected = defineModel<Topic | null>({ default: null })

const topics = useTopicsStore()
const { selector } = storeToRefs(useLanguageStore())

const search = ref('')

/** the typed text matches no topic: the prepend icon creates it */
const canCreate = computed(() => Boolean(search.value?.trim()) && !topics.searchResult.length)

watch(search, (value) => value && value !== selected.value?.title && topics.searchTopics(value))

async function create() {
  if (!canCreate.value) return
  const topic = await topics.createTopic(search.value)
  topics.searchResult = [topic]
  selected.value = topic
}
</script>
