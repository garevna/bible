<template>
  <div class="page mx-auto" style="max-width: 960px">
    <div class="d-flex align-center">
      <v-btn icon="$return" variant="text" color="primary" @click="topics.returnToTopicList()" />
      <span class="topic-title text-primary ml-2 flex-grow-1">{{ topics.currentTopic?.title }}</span>
      <!-- editing mode, publishers only: the topic as a post of the Telegram channel -->
      <PublishTopic
        v-if="showControls && topics.currentTopic && publish.role === 'publisher' && publish.telegram"
      />
      <ControlsView v-model="showControls" storage-key="topicMode" />

      <!-- editing mode, phones: the ways to add in a dropdown menu on the right -->
      <v-menu v-if="showControls && compact && topics.currentTopic" location="bottom end">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon="mdi-menu"
            variant="tonal"
            color="buttons"
            size="small"
            :aria-label="nestedDraggable.addToTopic"
          />
        </template>
        <v-list density="compact" bg-color="homefone">
          <v-list-subheader>{{ nestedDraggable.addToTopic }}</v-list-subheader>
          <v-list-item v-for="item of addItems" :key="item.text" :title="item.text" @click="item.open()" />
        </v-list>
      </v-menu>
    </div>

    <!-- editing mode, wider screens: "Add to topic ›" opens the three ways to add; "‹" or a choice closes them -->
    <div
      v-if="topics.currentTopic && showControls"
      class="add-menu d-flex flex-wrap align-center ga-2 mt-4 mb-6"
    >
      <v-btn
        v-if="!compact && collapsed"
        variant="tonal"
        color="buttons"
        class="text-none"
        append-icon="mdi-chevron-right"
        @click="openAddMenu"
      >
        {{ nestedDraggable.addToTopic }}
      </v-btn>
      <v-btn
        v-else-if="!compact"
        variant="tonal"
        color="buttons"
        icon="mdi-chevron-left"
        size="small"
        :aria-label="nestedDraggable.closeMenu"
        @click="addMenu = false"
      />
      <!-- always mounted, so the buttons slide in from the left one after another -->
      <TransitionGroup v-if="!compact" name="slide-in" @after-leave="onButtonGone">
        <v-btn
          v-for="(item, index) of addMenu ? addItems : []"
          :key="item.text"
          :data-index="index"
          variant="tonal"
          color="buttons"
          class="text-none"
          :style="{
            '--delay': `${index * 70}ms`,
            '--leave-delay': `${(addItems.length - 1 - index) * 50}ms`
          }"
          @click="choose(item.open)"
        >
          {{ item.text }}
        </v-btn>
      </TransitionGroup>
    </div>

    <!-- the dialogs of the add menu -->
    <template v-if="topics.currentTopic">
      <CreateNote
        ref="newNote"
        :topic-id="topics.currentTopic._id"
        hide-activator
        @saved="topics.getTopicData()"
      />
      <AddExistingNotes ref="existingNotes" hide-activator />
      <AddVerses ref="verses" hide-activator @add="addVerses" />
    </template>

    <p v-if="!topics.currentTopicData.length" class="text-medium-emphasis">{{ common.noData }}</p>

    <NestedDraggable
      :items="topics.currentTopicData"
      :show-controls="showControls"
      :class="{ 'mt-6': !showControls }"
      @remove="removeItem"
      @remove-from-note="removeVerseFromNote"
      @note-saved="updateNote"
    />

    <div v-if="showControls" class="text-center mt-8">
      <v-btn
        variant="flat"
        color="primary"
        class="text-none px-8"
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
import { computed, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import ControlsView from '@/components/ControlsView.vue'
import CreateNote from '@/components/notes/CreateNote.vue'
import AddVerses from '@/components/selectors/AddVerses.vue'
import AddExistingNotes from '@/components/topics/AddExistingNotes.vue'
import PublishTopic from '@/components/topics/PublishTopic.vue'
import NestedDraggable from '@/components/topics/NestedDraggable.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { usePublishStore } from '@/stores/publish'
import { useTopicsStore, type TopicItem, type TopicNoteItem } from '@/stores/topics'
import type { Note } from '@/types'
import { removeById } from '@/utils/array'
import { versesWithLinks } from '@/utils/verse'

const topics = useTopicsStore()
const content = useContentStore()
const notes = useNotesStore()
const publish = usePublishStore()
const { common, nestedDraggable } = storeToRefs(useLanguageStore())

const showControls = ref(true)

const newNote = useTemplateRef<InstanceType<typeof CreateNote>>('newNote')
const existingNotes = useTemplateRef<InstanceType<typeof AddExistingNotes>>('existingNotes')
const verses = useTemplateRef<InstanceType<typeof AddVerses>>('verses')

/** phones: a dropdown menu instead of the row of buttons */
const { smAndDown: compact } = useDisplay()

const addMenu = ref(false)
/** true once the buttons have slid back, then "Add to topic ›" replaces "‹" */
const collapsed = ref(true)

function openAddMenu() {
  collapsed.value = false
  addMenu.value = true
}

/** the first button slides back last */
function onButtonGone(el: Element) {
  if (!addMenu.value && (el as HTMLElement).dataset.index === '0') collapsed.value = true
}

const addItems = computed(() => [
  { text: nestedDraggable.value.addNewNote, open: () => newNote.value?.show() },
  { text: nestedDraggable.value.addExistingNote, open: () => existingNotes.value?.show() },
  { text: nestedDraggable.value.addBibleVerses, open: () => verses.value?.show() }
])

/** a choice closes the menu and opens its dialog */
function choose(open: () => void) {
  addMenu.value = false
  open()
}

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

/** Links the verses to the topic; they appear at the end of its list */
async function addVerses(verseIds: string[]) {
  const topic = topics.currentTopic
  if (!topic) return
  for (const verseId of verseIds) await content.addTopicToVerse(topic._id, verseId)
  await topics.getCurrentTopic(topic._id)
  await topics.getTopicData()
}
</script>

<style scoped>
.slide-in-enter-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
  transition-delay: var(--delay, 0ms);
}

/* closing: back to the left, the last one first */
.slide-in-leave-active {
  transition:
    transform 0.2s ease-in,
    opacity 0.2s ease-in;
  transition-delay: var(--leave-delay, 0ms);
}

.slide-in-enter-from {
  opacity: 0;
  transform: translateX(-32px);
}

.slide-in-leave-to {
  opacity: 0;
  transform: translateX(-32px);
}

.topic-title {
  font-size: 16px;
  font-weight: bold;
}
</style>
