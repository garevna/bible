<template>
  <fieldset class="field-set">
    <legend>{{ text.listHeader }}</legend>

    <div v-for="note in content.lineNotes" :key="note._id" class="d-flex align-start py-1">
      <ButtonTooltip
        icon="$remove"
        color="delete"
        small
        class="delete-icon"
        :text="text.removeFromListTooltip"
        @click="content.removeNoteFromVerse(note, lineRef)"
      />
      <span class="note-text flex-grow-1 mx-2 mt-2">{{ note.text }}</span>
      <DialogToUpdateNote :note="note" small />
    </div>

    <v-divider class="my-3" />

    <CreateNote :line-ref="lineRef" large :tooltip="text.addNoteToVerseTooltip" />
  </fieldset>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
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
