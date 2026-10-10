<template>
  <template v-if="!hideActivator">
    <AddButton v-if="label" :label="label" :icon="icon" @click="open" />
    <ButtonTooltip
      v-else
      :icon="icon"
      :text="tooltip || text.createNoteTooltip"
      :small="small"
      :large="large"
      @click="open"
    />
  </template>
  <UpdateNote v-model="dialog" is-new @saved="emit('saved', $event)" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import AddButton from '@/components/AddButton.vue'
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
    /** a button with this text instead of an icon */
    label?: string
    /** no own button: the parent opens it with show() (e.g. from a menu) */
    hideActivator?: boolean
  }>(),
  {
    lineRef: undefined,
    topicId: undefined,
    keywordId: undefined,
    icon: '$addNote',
    tooltip: '',
    label: undefined
  }
)

const emit = defineEmits<{ saved: [note: Note] }>()

const notes = useNotesStore()
const { notes: text } = storeToRefs(useLanguageStore())

const dialog = ref(false)

async function open() {
  await notes.startNewNote({ lineRef: props.lineRef, topicId: props.topicId, keywordId: props.keywordId })
  dialog.value = true
}

defineExpose({ show: open })
</script>
