<template>
  <AppDialog
    v-model="open"
    :title="kind === 'topic' ? text.pickTopic : text.pickNote"
    icon="$note"
    max-width="560"
  >
    <v-text-field
      v-model="search"
      prepend-inner-icon="$search"
      density="compact"
      hide-details
      clearable
      class="mb-2"
      :aria-label="kind === 'topic' ? text.pickTopic : text.pickNote"
    />
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
    <v-list density="compact" class="choices">
      <v-list-item
        v-for="item of found"
        :key="item.id"
        :title="item.title"
        :subtitle="item.subtitle"
        :disabled="busy"
        @click="pick(item.id)"
      />
      <p v-if="!busy && !found.length" class="empty">{{ text.nothingToPick }}</p>
    </v-list>
    <template #actions>
      <v-btn variant="text" class="text-none" @click="open = false">{{ common.cancel }}</v-btn>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import { getAllRecords, getVersesByRefs, noteDate } from '@/db'
import { useLanguageStore } from '@/stores/language'
import { topicItemsOf } from '@/stores/topics'
import type { Note, Topic } from '@/types'
import { notePost, topicPost, type TopicPost } from '@/utils/topicPost'

/** One of the user's own notes or topics, as a post with its verses: the material of a role */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ kind: 'note' | 'topic' }>()
const emit = defineEmits<{ picked: [post: TopicPost] }>()

const { calendar: text, common } = storeToRefs(useLanguageStore())

const notes = shallowRef<Note[]>([])
const topics = shallowRef<Topic[]>([])
const search = ref('')
const busy = ref(false)

watch(open, async (value) => {
  if (!value) return
  search.value = ''
  busy.value = true
  try {
    if (props.kind === 'topic') topics.value = await getAllRecords<Topic>('topics')
    else notes.value = (await getAllRecords<Note>('notes')).sort((a, b) => Number(b._id) - Number(a._id))
  } finally {
    busy.value = false
  }
})

const items = computed(() =>
  props.kind === 'topic'
    ? topics.value.map((topic) => ({ id: topic._id, title: topic.title, subtitle: '' }))
    : notes.value.map((note) => ({
        id: note._id,
        title: note.text.split('\n')[0]!.slice(0, 90) || '…',
        subtitle: noteDate(note)
      }))
)

const found = computed(() => {
  const query = (search.value ?? '').trim().toLowerCase()
  return query ? items.value.filter((item) => item.title.toLowerCase().includes(query)) : items.value
})

async function pick(id: string) {
  busy.value = true
  try {
    if (props.kind === 'topic') {
      const topic = topics.value.find((item) => item._id === id)!
      emit('picked', topicPost(topic.title, await topicItemsOf(topic)))
    } else {
      const note = notes.value.find((item) => item._id === id)!
      emit('picked', notePost(note.text, await getVersesByRefs(note.refs)))
    }
    open.value = false
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.choices {
  max-height: 50vh;
  overflow-y: auto;
}

.empty {
  color: var(--app-text-muted);
  font-size: 13px;
  padding: 8px 16px;
  margin: 0;
}
</style>
