<template>
  <AddButton v-if="!hideActivator" :label="text.addExistingNotes" icon="$note" @click="open = true" />

  <AppDialog v-model="open" :title="text.addExistingTitle" icon="$note" max-width="760">
    <template #subheader>
      <div class="filters px-6 pb-3">
        <v-text-field
          v-model="query"
          :placeholder="text.searchNotesText"
          prepend-inner-icon="$search"
          density="compact"
          clearable
          hide-details
          class="filter-wide"
        />
        <SelectKeyword v-model="keyword" :creatable="false" class="filter-wide" />
        <v-text-field
          v-model="from"
          type="date"
          :label="text.fromDate"
          density="compact"
          hide-details
          clearable
          class="filter-date"
        />
        <v-text-field
          v-model="to"
          type="date"
          :label="text.toDate"
          density="compact"
          hide-details
          clearable
          class="filter-date"
        />
      </div>
    </template>

    <p v-if="!candidates.length" class="text-medium-emphasis my-0">{{ text.noNotes }}</p>

    <label v-for="note of candidates.slice(0, shown)" :key="note._id" class="candidate d-flex align-start">
      <v-checkbox-btn v-model="ticked" :value="note._id" color="secondary" density="compact" />
      <div class="flex-grow-1 py-2">
        <v-chip size="x-small" variant="tonal" class="mr-2">{{ noteDate(note) }}</v-chip>
        <span class="candidate-text">{{ note.text }}</span>
        <div v-if="note.keywords.length" class="mt-1">
          <v-chip
            v-for="item in note.keywords"
            :key="item"
            size="x-small"
            variant="tonal"
            color="#888"
            class="mr-1"
          >
            #{{ item }}
          </v-chip>
        </div>
      </div>
    </label>

    <div v-if="candidates.length > shown" class="text-center mt-2">
      <v-btn variant="text" color="buttons" class="text-none" @click="shown += 50">{{
        search.showMore
      }}</v-btn>
    </div>

    <template #actions>
      <DialogButtons
        :confirm-text="`${common.add} (${ticked.length})`"
        :disabled="!ticked.length"
        @cancel="open = false"
        @confirm="add"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AddButton from '@/components/AddButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import SelectKeyword from '@/components/selectors/SelectKeyword.vue'
import { noteDate } from '@/db'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { useTopicsStore } from '@/stores/topics'
import type { Note } from '@/types'

/** Finds notes by text, keyword and dates and adds the ticked ones to the current topic */
/** hideActivator: no own button, the parent opens it with show() (e.g. from a menu) */
defineProps<{ hideActivator?: boolean }>()
const notes = useNotesStore()
const topics = useTopicsStore()
const { common, notes: text, search } = storeToRefs(useLanguageStore())

const open = ref(false)
const query = ref('')
const keyword = ref<string | null>(null)
const from = ref<string | null>(null)
const to = ref<string | null>(null)
const found = shallowRef<Note[]>([])
const ticked = ref<string[]>([])
const shown = ref(50)

/** notes that are not in the topic yet */
const candidates = computed(() => {
  const topicId = topics.currentTopic?._id
  return found.value.filter((note) => !topicId || !note.topics.includes(topicId))
})

let timer: ReturnType<typeof setTimeout> | undefined
function find() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    shown.value = 50
    found.value = await notes.findNotes({
      text: query.value,
      keyword: keyword.value,
      from: from.value,
      to: to.value
    })
  }, 300)
}

watch([query, keyword, from, to], find)

watch(open, (value) => {
  if (!value) return
  ticked.value = []
  find()
})

async function add() {
  const ids = [...ticked.value]
  open.value = false
  await topics.addNotesToTopic(ids)
}

defineExpose({ show: () => (open.value = true) })
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-wide {
  flex: 2 1 220px;
}

.filter-date {
  flex: 1 1 150px;
}

.candidate {
  cursor: pointer;
}

.candidate + .candidate {
  border-top: solid 1px #eee;
}

.candidate-text {
  white-space: pre-wrap;
}
</style>
