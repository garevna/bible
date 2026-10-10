<template>
  <div class="page mx-auto" style="max-width: 960px">
    <div class="d-flex align-center flex-wrap ga-2">
      <CreateNote
        :label="text.newNote"
        :topic-id="notes.topic?._id"
        :keyword-id="notes.keyword ?? undefined"
      />
      <NotesFilterOptions class="flex-grow-1" />
      <ControlsView v-model="showControls" />
    </div>

    <div class="mt-6 notes-list">
      <p v-if="!notes.notes.length" class="pa-4 text-medium-emphasis">{{ text.noNotes }}</p>

      <Note v-for="note of notes.notes" :key="note._id" :note="note" :show-controls="showControls" />
    </div>

    <div class="notes-toolbar d-flex align-center elevation-4">
      <DatePickerDialog
        :model-value="notes.date"
        :available-dates="notes.availableDates"
        @update:model-value="notes.updateDate"
      />

      <PickerDialog
        icon="$keyword"
        :tooltip="selector.keywordPrompt"
        :title="keywords.select"
        @ok="notes.updateKeyword(keyword)"
      >
        <SelectKeyword v-model="keyword" :creatable="false" />
      </PickerDialog>

      <PickerDialog
        icon="$topic"
        :tooltip="selector.topicPrompt"
        :title="topics.select"
        @ok="notes.updateTopic(topic)"
      >
        <SelectTopic v-model="topic" :creatable="false" />
      </PickerDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ControlsView from '@/components/ControlsView.vue'
import NotesFilterOptions from '@/components/NotesFilterOptions.vue'
import CreateNote from '@/components/notes/CreateNote.vue'
import Note from '@/components/notes/Note.vue'
import DatePickerDialog from '@/components/selectors/DatePickerDialog.vue'
import PickerDialog from '@/components/selectors/PickerDialog.vue'
import SelectKeyword from '@/components/selectors/SelectKeyword.vue'
import SelectTopic from '@/components/selectors/SelectTopic.vue'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import type { Topic } from '@/types'

const notes = useNotesStore()
const { notes: text, keywords, selector, topics } = storeToRefs(useLanguageStore())

const showControls = ref(true)
const keyword = ref<string | null>(notes.keyword)
const topic = ref<Topic | null>(null)
</script>

<style scoped>
.notes-toolbar {
  position: fixed;
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: var(--app-border);
  border-radius: var(--app-radius);
  padding: 2px 8px;
}
</style>
