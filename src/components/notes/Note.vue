<template>
  <div class="note mb-3">
    <!-- date on the left, actions on the right -->
    <div class="d-flex align-center">
      <v-chip size="small" variant="tonal">{{ date }}</v-chip>
      <v-spacer />
      <template v-if="showControls">
        <PublishPost v-if="worker.canPublish" :build="noteAsPost" small />
        <DialogToUpdateNote :note="note" small @saved="emit('changed')" />
        <ConfirmButton icon="$deleteNote" :text="notes.deleteNote" @confirm="remove" />
      </template>
    </div>

    <p class="note-text my-3">{{ note.text }}</p>

    <v-expand-transition>
      <div v-if="expanded">
        <p v-for="verse of verses" :key="verse._id" class="note-verse" v-html="verse.html" />
      </div>
    </v-expand-transition>

    <!-- keywords below the text and verses, the verses toggle on the right -->
    <div v-if="note.keywords.length || note.refs.length" class="d-flex align-center flex-wrap ga-1">
      <v-chip v-for="keyword in note.keywords" :key="keyword" size="small" variant="tonal" color="#888">
        #{{ keyword }}
      </v-chip>
      <v-spacer />
      <v-btn
        v-if="note.refs.length"
        :icon="expanded ? '$collapse' : '$expand'"
        :aria-label="notes.versesHeader"
        variant="text"
        size="small"
        color="secondary"
        @click="toggle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import PublishPost from '@/components/PublishPost.vue'
import DialogToUpdateNote from '@/components/notes/DialogToUpdateNote.vue'
import { getVersesByRefs, noteDate } from '@/db'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { useWorkerStore } from '@/stores/worker'
import type { Note } from '@/types'
import { notePost } from '@/utils/topicPost'
import { versesWithLinks } from '@/utils/verse'

const props = withDefaults(defineProps<{ note: Note; showControls?: boolean }>(), { showControls: true })

const notesStore = useNotesStore()
const worker = useWorkerStore()
const { notes } = storeToRefs(useLanguageStore())

const date = computed(() => noteDate(props.note))

/** the note for the Telegram channel: its text and verses */
const noteAsPost = async () => notePost(props.note.text, await getVersesByRefs(props.note.refs))

const expanded = ref(false)
const verses = ref<Awaited<ReturnType<typeof versesWithLinks>>>([])

async function toggle() {
  expanded.value = !expanded.value
  if (expanded.value) verses.value = await versesWithLinks(props.note.refs)
}

const emit = defineEmits<{ removed: []; changed: [] }>()

async function remove() {
  await notesStore.removeNote(props.note)
  emit('removed')
}
</script>

<style scoped>
.note {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 12px 16px;
  background: var(--app-surface);
}

.note-text {
  white-space: pre-wrap;
  font-size: 15px;
}

.note-verse {
  border: solid 1px var(--app-border);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: var(--app-surface);
}
</style>
