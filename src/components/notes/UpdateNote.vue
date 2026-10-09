<template>
  <v-dialog v-model="dialog" max-width="960">
    <v-card color="homefone" class="pa-4">
      <v-toolbar flat density="compact" color="transparent">
        <v-spacer />
        <v-btn icon="$close" @click="dialog = false" />
      </v-toolbar>

      <div v-if="notes.currentNote" class="pa-0 pa-md-8">
        <EditTopicList for-note />

        <v-textarea
          :model-value="notes.currentNote.text"
          class="mb-8"
          auto-grow
          autofocus
          clearable
          counter
          clear-icon="mdi-close-circle"
          @update:model-value="notes.updateCurrentNoteText($event ?? '')"
        />

        <div v-if="notes.currentNoteVerses.length" class="mb-8">
          <div v-for="verse of notes.currentNoteVerses" :key="verse._id" class="d-flex align-start">
            <ButtonTooltip
              icon="$remove"
              color="delete"
              small
              class="delete-icon"
              :text="nestedDraggable.removeFromNoteTooltip"
              @click="notes.removeVerseFromCurrentNote(verse._id)"
            />
            <p class="ml-2 mt-2" v-html="verse.html" />
          </div>
        </div>

        <EditKeywordList for-note />

        <v-btn variant="outlined" color="buttons" width="160" class="d-block mt-5 mx-auto" @click="save">
          {{ text.saveButton }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import EditKeywordList from '@/components/keywords/EditKeywordList.vue'
import EditTopicList from '@/components/topics/EditTopicList.vue'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'

/** Editor of notes.currentNote; the opener puts the note there before opening */
const dialog = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()

const notes = useNotesStore()
const { notes: text, nestedDraggable } = storeToRefs(useLanguageStore())

watch(dialog, (open) => !open && notes.resetCurrentNote())

async function save() {
  await notes.saveCurrentNote()
  emit('saved')
  dialog.value = false
}
</script>
