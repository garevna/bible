<template>
  <fieldset class="field-set">
    <legend>{{ text.listHeader }}</legend>

    <div v-for="keyword in list" :key="keyword" class="d-flex align-center">
      <ButtonTooltip
        icon="$remove"
        color="delete"
        small
        class="delete-icon"
        :text="text.removeFromListTooltip"
        @click="remove(keyword)"
      />
      <span class="ml-2">#{{ keyword }}</span>
    </div>

    <AddKeywordToList :line-ref="lineRef" :for-note="forNote" large :tooltip="text.addToListTooltip" />
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import AddKeywordToList from '@/components/keywords/AddKeywordToList.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'

/** Keywords of a verse (lineRef) or of the note being edited (forNote) */
const props = defineProps<{ lineRef?: string; forNote?: boolean }>()

const content = useContentStore()
const notes = useNotesStore()
const { keywords: text } = storeToRefs(useLanguageStore())

const list = computed(() =>
  props.lineRef ? content.lineKeywords : props.forNote ? (notes.currentNote?.keywords ?? []) : []
)

async function remove(keyword: string) {
  props.lineRef && (await content.removeKeywordFromVerse(keyword, props.lineRef))
  props.forNote && notes.removeKeywordFromCurrentNote(keyword)
}
</script>
