<template>
  <CreatableSelect
    v-model="selected"
    v-model:pending="pending"
    :items="keywords.searchResult"
    :title-of="(item: string) => item"
    :label="selector.textSearchPrompt"
    :no-data-text="selector.noData"
    icon="$search"
    :create-text="(name: string) => format(text.addNewKeyword, { name })"
    :creatable="creatable"
    @search="keywords.searchKeywords"
    @create="create"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import CreatableSelect from '@/components/selectors/CreatableSelect.vue'
import { useKeywordsStore } from '@/stores/keywords'
import { useLanguageStore } from '@/stores/language'
import { format } from '@/utils/format'

const selected = defineModel<string | null>({ default: null })
/** typed keyword that does not exist yet; the parent may create it */
const pending = defineModel<string>('pending', { default: '' })
withDefaults(defineProps<{ creatable?: boolean }>(), { creatable: true })

const keywords = useKeywordsStore()
const { selector, keywords: text } = storeToRefs(useLanguageStore())

async function create(name: string) {
  await keywords.createKeyword(name)
  selected.value = name
}
</script>
