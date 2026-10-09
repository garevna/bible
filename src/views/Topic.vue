<template>
  <div class="mx-auto py-5 px-2 pb-16" style="max-width: 960px">
    <div class="d-flex align-center mt-5 mb-4">
      <v-btn icon="$return" variant="text" color="primary" size="large" @click="topics.returnToTopicList()" />
      <span class="topic-title text-primary ml-3 flex-grow-1">{{ topics.currentTopic?.title }}</span>
      <CreateNote
        v-if="topics.currentTopic"
        :topic-id="topics.currentTopic._id"
        :tooltip="text.addNoteToTopic"
        @saved="topics.getTopicData()"
      />
      <ControlsView v-model="showControls" />
    </div>

    <p v-if="!topics.currentTopicData.length" class="text-medium-emphasis">{{ common.noData }}</p>

    <NestedDraggable
      :items="topics.currentTopicData"
      :show-controls="showControls"
      @remove="removeItem"
      @remove-from-note="removeVerseFromNote"
      @note-saved="updateNote"
    />

    <div class="text-center my-12">
      <v-btn
        variant="outlined"
        color="primary"
        prepend-icon="$save"
        :disabled="!topics.currentTopic"
        @click="topics.saveCurrentTopic()"
      >
        {{ nestedDraggable.saveButton }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ControlsView from '@/components/ControlsView.vue'
import CreateNote from '@/components/notes/CreateNote.vue'
import NestedDraggable from '@/components/topics/NestedDraggable.vue'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { useTopicsStore, type TopicItem, type TopicNoteItem } from '@/stores/topics'
import type { Note } from '@/types'
import { removeById } from '@/utils/array'
import { versesWithLinks } from '@/utils/verse'

const topics = useTopicsStore()
const notes = useNotesStore()
const { common, nestedDraggable, topics: text } = storeToRefs(useLanguageStore())

const showControls = ref(true)

const noteRecord = ({ _id, text, keywords, topics, verses }: TopicNoteItem): Note => ({
  _id,
  text,
  keywords,
  topics,
  refs: verses.map((verse) => verse._id)
})

/** A verse leaves the topic when the topic is saved; a note loses the topic right away */
async function removeItem(item: TopicItem) {
  topics.removeCurrentTopicDataItem(item._id)
  if (item.type !== 'note') return

  const topicId = topics.currentTopic?._id
  topicId && removeById(item.topics, topicId)
  await notes.putNote(noteRecord(item))
}

async function removeVerseFromNote(note: TopicNoteItem, verse: TopicItem) {
  removeById(note.verses, verse._id)
  await notes.putNote(noteRecord(note))
}

/** Applies the edited note to its item without reloading the topic (unsaved order stays) */
async function updateNote(item: TopicNoteItem, note: Note) {
  if (!topics.currentTopic || !note.topics.includes(topics.currentTopic._id)) {
    topics.removeCurrentTopicDataItem(item._id)
    return
  }
  Object.assign(item, { text: note.text, keywords: note.keywords, topics: note.topics })
  item.verses = (await versesWithLinks(note.refs)).map((verse) => ({ ...verse, type: 'verse' as const }))
}
</script>

<style scoped>
.topic-title {
  font-size: 16px;
  font-weight: bold;
}
</style>
