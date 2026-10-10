<template>
  <FieldSet :title="text.listHeader" :empty="!content.lineNotes.length">
    <template #action>
      <CreateNote :line-ref="lineRef" icon="$link" large :tooltip="text.addNoteToVerseTooltip" />
    </template>

    <div v-for="note in content.lineNotes" :key="note._id" class="d-flex align-center row-item">
      <span class="note-text flex-grow-1">{{ note.text }}</span>
      <DialogToUpdateNote :note="note" small />
      <ButtonTooltip
        icon="$unlink"
        color="delete"
        small
        class="delete-icon"
        :text="text.removeFromListTooltip"
        @click="content.removeNoteFromVerse(note, lineRef)"
      />
    </div>
  </FieldSet>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import FieldSet from '@/components/FieldSet.vue'
import CreateNote from '@/components/notes/CreateNote.vue'
import DialogToUpdateNote from '@/components/notes/DialogToUpdateNote.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'

/** Notes attached to a verse */
defineProps<{ lineRef: string }>()

const content = useContentStore()
const { notes: text } = storeToRefs(useLanguageStore())
</script>

<style scoped>
.note-text {
  white-space: pre-wrap;
}
</style>
