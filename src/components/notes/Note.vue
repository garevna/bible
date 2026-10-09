<template>
  <div class="draggable-item note mb-3">
    <div v-if="showControls" class="d-flex align-center mb-2">
      <ConfirmButton :text="notes.deleteNote" @confirm="remove" />
      <v-spacer />
      <DialogToUpdateNote :note="note" />
    </div>

    <div>
      <v-chip size="small" class="mr-2">{{ date }}</v-chip>
      <span class="note-text">{{ note.text }}</span>
    </div>

    <div v-if="note.keywords.length" class="text-right mt-1">
      <v-chip v-for="keyword in note.keywords" :key="keyword" size="small" color="#999" class="ml-1">
        #{{ keyword }}
      </v-chip>
    </div>

    <template v-if="note.refs.length">
      <div class="text-center">
        <v-btn :icon="expanded ? '$collapse' : '$expand'" variant="text" size="small" @click="toggle" />
      </div>

      <v-expand-transition>
        <div v-if="expanded">
          <p v-for="verse of verses" :key="verse._id" class="draggable-item" v-html="verse.html" />
        </div>
      </v-expand-transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import DialogToUpdateNote from '@/components/notes/DialogToUpdateNote.vue'
import { noteDate } from '@/db'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types'
import { versesWithLinks } from '@/utils/verse'

const props = withDefaults(defineProps<{ note: Note; showControls?: boolean }>(), { showControls: true })

const notesStore = useNotesStore()
const { notes } = storeToRefs(useLanguageStore())

const date = computed(() => noteDate(props.note))

const expanded = ref(false)
const verses = ref<Awaited<ReturnType<typeof versesWithLinks>>>([])

async function toggle() {
  expanded.value = !expanded.value
  if (expanded.value) verses.value = await versesWithLinks(props.note.refs)
}

const remove = () => notesStore.removeNote(props.note)
</script>

<style scoped>
.note {
  cursor: default;
}

.note-text {
  white-space: pre-wrap;
}
</style>
