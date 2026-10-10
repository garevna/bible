<template>
  <FieldSet :title="text.listHeader" :empty="!list.length">
    <template #action>
      <AddKeywordToList
        :line-ref="lineRef"
        :for-note="forNote"
        activator-icon="$link"
        large
        :tooltip="text.addToListTooltip"
      />
    </template>

    <div v-for="keyword in list" :key="keyword" class="d-flex align-center row-item">
      <span class="flex-grow-1">#{{ keyword }}</span>
      <ButtonTooltip
        icon="$unlink"
        color="delete"
        small
        class="delete-icon"
        :text="text.removeFromListTooltip"
        @click="remove(keyword)"
      />
    </div>
  </FieldSet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import FieldSet from '@/components/FieldSet.vue'
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
