<template>
  <PickerDialog
    :icon="icon"
    :tooltip="tooltip || keywords.lineActionsTooltip"
    :title="keywords.select"
    :small="small"
    :large="large"
    :disabled="!keyword && !pending"
    @ok="add"
  >
    <SelectKeyword v-model="keyword" v-model:pending="pending" />
  </PickerDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import PickerDialog from '@/components/selectors/PickerDialog.vue'
import SelectKeyword from '@/components/selectors/SelectKeyword.vue'
import { useContentStore } from '@/stores/content'
import { useKeywordsStore } from '@/stores/keywords'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'

/** Adds a keyword to a verse (lineRef) or to the note being edited (forNote) */
const props = withDefaults(
  defineProps<{
    lineRef?: string
    forNote?: boolean
    icon?: string
    tooltip?: string
    small?: boolean
    large?: boolean
  }>(),
  { lineRef: undefined, icon: '$addKeyword', tooltip: '' }
)

const content = useContentStore()
const notes = useNotesStore()
const keywordsStore = useKeywordsStore()
const { keywords } = storeToRefs(useLanguageStore())

const keyword = ref<string | null>(null)
/** typed but not created yet: OK creates it */
const pending = ref('')

async function add() {
  if (!keyword.value && pending.value) {
    await keywordsStore.createKeyword(pending.value)
    keyword.value = pending.value
  }
  if (!keyword.value) return
  props.lineRef && (await content.addKeywordToVerse(keyword.value, props.lineRef))
  props.forNote && notes.addKeywordToCurrentNote(keyword.value)
  keyword.value = null
}
</script>
