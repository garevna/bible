<template>
  <ButtonTooltip
    :icon="icon"
    :text="tooltip || text.createNoteTooltip"
    :small="small"
    :large="large"
    :fab="fab"
    @click="open"
  />
  <UpdateNote v-model="dialog" @saved="emit('saved', $event)" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import UpdateNote from '@/components/notes/UpdateNote.vue'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types'

/** Opens the editor with a new note attached to the given verse, topic or keyword */
const props = withDefaults(
  defineProps<{
    lineRef?: string
    topicId?: string
    keywordId?: string
    icon?: string
    tooltip?: string
    small?: boolean
    large?: boolean
    fab?: boolean
  }>(),
  { lineRef: undefined, topicId: undefined, keywordId: undefined, icon: '$addNote', tooltip: '' }
)

const emit = defineEmits<{ saved: [note: Note] }>()

const notes = useNotesStore()
const { notes: text } = storeToRefs(useLanguageStore())

const dialog = ref(false)

async function open() {
  await notes.startNewNote({ lineRef: props.lineRef, topicId: props.topicId, keywordId: props.keywordId })
  dialog.value = true
}
</script>
