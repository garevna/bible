<template>
  <AppDialog
    v-model="dialog"
    :title="isNew ? text.newNote : text.editNoteTooltip"
    :icon="isNew ? '$addNote' : '$editNote'"
    max-width="900"
  >
    <template v-if="notes.currentNote">
      <v-textarea
        :model-value="notes.currentNote.text"
        :placeholder="text.textPlaceholder"
        auto-grow
        autofocus
        clearable
        counter
        rows="4"
        clear-icon="mdi-close-circle"
        class="mb-6"
        @update:model-value="notes.updateCurrentNoteText($event ?? '')"
      />

      <FieldSet :title="text.versesHeader" :empty="!notes.currentNoteVerses.length">
        <template #action>
          <AddVerses activator-icon="$link" large @add="notes.addVersesToCurrentNote" />
        </template>

        <div v-for="verse of notes.currentNoteVerses" :key="verse._id" class="d-flex align-center row-item">
          <p class="flex-grow-1 my-0" v-html="verse.html" />
          <ButtonTooltip
            icon="$unlink"
            color="delete"
            small
            class="delete-icon"
            :text="text.removeVerse"
            @click="notes.removeVerseFromCurrentNote(verse._id)"
          />
        </div>
      </FieldSet>

      <EditTopicList for-note />
      <EditKeywordList for-note />
    </template>

    <template #actions>
      <DialogButtons :confirm-text="common.save" @cancel="dialog = false" @confirm="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import FieldSet from '@/components/FieldSet.vue'
import EditKeywordList from '@/components/keywords/EditKeywordList.vue'
import AddVerses from '@/components/selectors/AddVerses.vue'
import EditTopicList from '@/components/topics/EditTopicList.vue'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types'

/** Editor of notes.currentNote; the opener puts the note there before opening */
const dialog = defineModel<boolean>({ default: false })
defineProps<{ isNew?: boolean }>()
const emit = defineEmits<{ saved: [note: Note] }>()

const notes = useNotesStore()
const { common, notes: text } = storeToRefs(useLanguageStore())

watch(dialog, (open) => !open && notes.resetCurrentNote())

async function save() {
  const saved = await notes.saveCurrentNote()
  saved && emit('saved', saved)
  dialog.value = false
}
</script>
