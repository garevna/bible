<template>
  <CreatableSelect
    v-model="selected"
    v-model:pending="pending"
    :items="topics.searchResult"
    item-title="title"
    item-value="_id"
    return-object
    :title-of="(item: Topic) => item.title"
    :label="selector.textSearchPrompt"
    :no-data-text="selector.noData"
    icon="$topic"
    :create-text="(name: string) => format(text.addNewTopic, { name })"
    :creatable="creatable"
    @search="topics.searchTopics"
    @create="create"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import CreatableSelect from '@/components/selectors/CreatableSelect.vue'
import { useLanguageStore } from '@/stores/language'
import { useTopicsStore } from '@/stores/topics'
import type { Topic } from '@/types'
import { format } from '@/utils/format'

const selected = defineModel<Topic | null>({ default: null })
/** typed topic title that does not exist yet; the parent may create it */
const pending = defineModel<string>('pending', { default: '' })
withDefaults(defineProps<{ creatable?: boolean }>(), { creatable: true })

const topics = useTopicsStore()
const { selector, topics: text } = storeToRefs(useLanguageStore())

async function create(name: string) {
  const topic = await topics.createTopic(name)
  topics.searchResult = [topic]
  selected.value = topic
}
</script>
