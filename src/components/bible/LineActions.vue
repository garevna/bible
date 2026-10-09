<template>
  <div class="line-actions d-flex">
    <AddKeywordToList :line-ref="lineRef" small />
    <AddTopicToList :line-ref="lineRef" small />
    <CreateNote :line-ref="lineRef" small :tooltip="notes.addNoteToVerseTooltip" />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import AddKeywordToList from '@/components/keywords/AddKeywordToList.vue'
import CreateNote from '@/components/notes/CreateNote.vue'
import AddTopicToList from '@/components/topics/AddTopicToList.vue'
import { useLanguageStore } from '@/stores/language'

/** Quick actions next to a verse */
defineProps<{ lineRef: string }>()

const { notes } = storeToRefs(useLanguageStore())
</script>

<style scoped>
.line-actions {
  min-width: 120px;
  justify-content: flex-end;
}
</style>
