<template>
  <ButtonTooltip :icon="icon" :text="tooltip || text.editNoteTooltip" :small="small" @click="open" />
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

const props = withDefaults(defineProps<{ note: Note; icon?: string; tooltip?: string; small?: boolean }>(), {
  icon: '$editNote',
  tooltip: ''
})

const emit = defineEmits<{ saved: [note: Note] }>()

const notes = useNotesStore()
const { notes: text } = storeToRefs(useLanguageStore())

const dialog = ref(false)

async function open() {
  await notes.setCurrentNote(props.note)
  dialog.value = true
}
</script>
