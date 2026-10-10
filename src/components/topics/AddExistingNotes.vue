<template>
  <AddButton v-if="!hideActivator" :label="text.addExistingNotes" icon="$note" @click="open = true" />

  <AppDialog v-model="open" :title="text.addExistingTitle" icon="$note" max-width="760">
    <!-- first the kind of search; on phones the tabs are icons only -->
    <template #subheader>
      <v-tabs v-model="mode" hide-slider density="comfortable" selected-class="app-tab--active" class="px-6">
        <v-tab value="keyword" class="app-tab" :aria-label="text.byKeyword">
          <v-icon icon="mdi-tag-search" :start="!compact" />
          <span v-if="!compact">{{ text.byKeyword }}</span>
        </v-tab>
        <v-tab value="text" class="app-tab" :aria-label="text.byText">
          <v-icon icon="mdi-text-search" :start="!compact" />
          <span v-if="!compact">{{ text.byText }}</span>
        </v-tab>
        <v-tab value="date" class="app-tab" :aria-label="text.byDate">
          <v-icon icon="mdi-calendar-question" :start="!compact" />
          <span v-if="!compact">{{ text.byDate }}</span>
        </v-tab>
      </v-tabs>
    </template>

    <!-- then what it is and its one field -->
    <section class="mb-6">
      <template v-if="mode === 'keyword'">
        <p class="hint">{{ text.byKeywordHint }}</p>
        <SelectKeyword v-model="keyword" :creatable="false" />
      </template>

      <template v-else-if="mode === 'text'">
        <p class="hint">{{ text.byTextHint }}</p>
        <v-text-field
          v-model="query"
          :placeholder="text.searchNotesText"
          prepend-inner-icon="$search"
          density="compact"
          clearable
          hide-details
          autofocus
        />
      </template>

      <template v-else>
        <p class="hint">{{ text.byDateHint }}</p>
        <NotesCalendar v-model="dates" :available-dates="notes.availableDates" />
      </template>
    </section>

    <template v-if="searched">
      <p v-if="!candidates.length" class="text-medium-emphasis my-0">{{ text.noNotes }}</p>

      <label v-for="note of candidates.slice(0, shown)" :key="note._id" class="candidate d-flex align-start">
        <v-checkbox-btn
          v-model="ticked"
          :value="note._id"
          color="secondary"
          density="compact"
          class="flex-grow-0"
        />
        <div class="flex-grow-1 py-2">
          <v-chip size="x-small" variant="tonal" class="mr-2">{{ noteDate(note) }}</v-chip>
          <span class="candidate-text">{{ note.text }}</span>
          <div v-if="note.keywords.length" class="mt-1">
            <v-chip v-for="item in note.keywords" :key="item" size="x-small" variant="tonal" class="mr-1">
              #{{ item }}
            </v-chip>
          </div>
        </div>
      </label>

      <div v-if="candidates.length > shown" class="text-center mt-2">
        <v-btn variant="text" color="buttons" class="text-none" @click="shown += 50">
          {{ search.showMore }}
        </v-btn>
      </div>
    </template>

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
import { useDisplay } from 'vuetify'

import AddButton from '@/components/AddButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import NotesCalendar, { type DateRange } from '@/components/selectors/NotesCalendar.vue'
import SelectKeyword from '@/components/selectors/SelectKeyword.vue'
import { noteDate, type NotesFilter } from '@/db'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { useTopicsStore } from '@/stores/topics'
import type { Note } from '@/types'

/** Finds notes by a keyword, a piece of text or the creation date and adds the ticked ones to the topic */
/** hideActivator: no own button, the parent opens it with show() (e.g. from a menu) */
defineProps<{ hideActivator?: boolean }>()

const notes = useNotesStore()
const topics = useTopicsStore()
const { common, notes: text, search } = storeToRefs(useLanguageStore())

const open = ref(false)
const { xs: compact } = useDisplay()

const mode = ref<'keyword' | 'text' | 'date'>('keyword')
const keyword = ref<string | null>(null)
const query = ref('')
const dates = ref<DateRange>({ from: null, to: null })

const found = shallowRef<Note[]>([])
const ticked = ref<string[]>([])
const shown = ref(50)

/** the filter of the chosen kind of search, or null while it is empty */
const filter = computed<NotesFilter | null>(() => {
  if (mode.value === 'keyword') return keyword.value ? { keyword: keyword.value } : null
  if (mode.value === 'text') return query.value?.trim() ? { text: query.value } : null
  return dates.value.from ? { from: dates.value.from, to: dates.value.to } : null
})
const searched = computed(() => Boolean(filter.value))

/** notes that are not in the topic yet */
const candidates = computed(() => {
  const topicId = topics.currentTopic?._id
  return found.value.filter((note) => !topicId || !note.topics.includes(topicId))
})

let timer: ReturnType<typeof setTimeout> | undefined
watch(filter, (value) => {
  clearTimeout(timer)
  if (!value) {
    found.value = []
    return
  }
  timer = setTimeout(async () => {
    shown.value = 50
    found.value = await notes.findNotes(value)
  }, 300)
})

watch(open, (value) => {
  if (!value) return
  ticked.value = []
  notes.getAvailableDates()
})

async function add() {
  const ids = [...ticked.value]
  open.value = false
  await topics.addNotesToTopic(ids)
}

defineExpose({ show: () => (open.value = true) })
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 12px;
}

.candidate {
  cursor: pointer;
}

.candidate + .candidate {
  border-top: solid 1px var(--app-border-light);
}

.candidate-text {
  white-space: pre-wrap;
}
</style>
