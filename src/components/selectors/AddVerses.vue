<template>
  <template v-if="!hideActivator">
    <AddButton v-if="label" :label="label" icon="$addVerse" @click="open = true" />
    <ButtonTooltip v-else icon="$addVerse" :text="text.addVerses" small @click="open = true" />
  </template>

  <AppDialog v-model="open" :title="text.addVerses" icon="$addVerse" max-width="760">
    <template #subheader>
      <v-tabs v-model="tab" hide-slider density="comfortable" selected-class="app-tab--active" class="px-6">
        <v-tab value="search" class="app-tab" prepend-icon="$search">{{ text.bySearch }}</v-tab>
        <v-tab value="reference" class="app-tab" prepend-icon="$book">{{ text.byReference }}</v-tab>
      </v-tabs>
    </template>

    <v-window v-model="tab" class="verse-picker">
      <!-- full-text search: tick the verses to add -->
      <v-window-item value="search" class="pt-2">
        <v-text-field
          v-model="query"
          :placeholder="searchText.placeholder"
          prepend-inner-icon="$search"
          density="compact"
          clearable
          hide-details
          autofocus
          class="mb-3"
        />
        <p v-if="query && !search.searchable(words)" class="text-medium-emphasis">
          {{ searchText.tooShort }}
        </p>
        <p v-else-if="query" class="text-medium-emphasis mb-2">{{ searchText.found }}: {{ found.length }}</p>

        <div v-for="verse of found.slice(0, shown)" :key="verse._id" class="d-flex align-start">
          <v-checkbox-btn v-model="ticked" :value="verse._id" color="secondary" density="compact" />
          <p class="mt-2">
            <small class="text-secondary font-weight-bold mr-1">{{ reference(verse) }}</small>
            <span v-html="markWords(verse.verse, words)" />
          </p>
        </div>

        <div v-if="found.length > shown" class="text-center">
          <v-btn variant="text" color="buttons" @click="shown += 50">{{ searchText.showMore }}</v-btn>
        </div>
      </v-window-item>

      <!-- by reference: testament, book, chapter, verse range -->
      <v-window-item value="reference" class="pt-2">
        <div class="d-flex flex-wrap ga-2">
          <v-select
            v-model="covenant"
            :items="covenantItems"
            :label="text.covenant"
            density="compact"
            class="field-covenant"
            @update:model-value="selectBook(0)"
          />
          <v-autocomplete
            :model-value="bookNum"
            :items="bookItems"
            :label="text.book"
            density="compact"
            class="field-wide"
            @update:model-value="selectBook"
          />
          <v-select
            v-model="chapter"
            :items="range(chapterCount)"
            :label="text.chapter"
            density="compact"
            class="field"
          />
          <v-select
            v-model="fromVerse"
            :items="range(chapterVerses.length)"
            :label="text.verse"
            density="compact"
            class="field"
          />
          <v-select
            v-model="toVerse"
            :items="range(chapterVerses.length).filter((num) => num >= fromVerse)"
            :label="text.toVerse"
            density="compact"
            clearable
            class="field"
          />
        </div>

        <p v-for="verse of rangeVerses" :key="verse._id" class="mb-1">
          <small class="text-secondary font-weight-bold mr-1">{{ verse.line + 1 }}</small
          >{{ verse.verse }}
        </p>
      </v-window-item>
    </v-window>

    <template #actions>
      <DialogButtons
        :confirm-text="`${text.addSelected} (${selection.length})`"
        :disabled="!selection.length"
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
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { getRecordsByIndex } from '@/db'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useSearchStore } from '@/stores/search'
import type { Verse } from '@/types'
import { getChapterRef } from '@/utils/refs'
import { markWords, queryWords } from '@/utils/search'

/** Picks Bible verses, found by text or chosen by reference, and emits their ids */
/** hideActivator: no own button, the parent opens it with show() (e.g. from a menu) */
defineProps<{ label?: string; hideActivator?: boolean }>()
const emit = defineEmits<{ add: [verseIds: string[]] }>()

const content = useContentStore()
const search = useSearchStore()
const { notes: text, search: searchText, common } = storeToRefs(useLanguageStore())

const open = ref(false)
const tab = ref<'search' | 'reference'>('search')

const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1)

/** 'Від Матвія 1:2' */
function reference({ covenant, book, chapter, line }: Verse) {
  const title = content.books?.[covenant]?.[Number(book.slice(2))]?.title ?? ''
  return `${title} ${Number(chapter.slice(6)) + 1}:${line + 1}`
}

/* ---------- search ---------- */

const query = ref('')
const words = computed(() => queryWords(query.value ?? ''))
const found = shallowRef<Verse[]>([])
const shown = ref(50)
const ticked = ref<string[]>([])

let timer: ReturnType<typeof setTimeout> | undefined
watch(words, (value) => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    shown.value = 50
    found.value = await search.findVerses(value)
  }, 300)
})

/* ---------- reference ---------- */

const covenant = ref(1)
const bookNum = ref(0)
const chapter = ref(1)
const fromVerse = ref(1)
const toVerse = ref<number | null>(null)
const chapterVerses = shallowRef<Verse[]>([])

const covenantItems = computed(() =>
  (content.covenantNames.length === 2 ? content.covenantNames : common.value.covenantNames).map(
    (title: string, value: number) => ({ title, value })
  )
)
const bookItems = computed(() =>
  (content.books?.[covenant.value] ?? []).map((book, value) => ({ title: book.title, value }))
)
const chapterCount = computed(() => content.books?.[covenant.value]?.[bookNum.value]?.chapters ?? 0)

const rangeVerses = computed(() =>
  chapterVerses.value.filter(
    (verse) => verse.line + 1 >= fromVerse.value && verse.line + 1 <= (toVerse.value ?? fromVerse.value)
  )
)

function selectBook(num: number) {
  bookNum.value = num
  chapter.value = 1
}

watch(
  [covenant, bookNum, chapter],
  async () => {
    fromVerse.value = 1
    toVerse.value = null
    const lines = await getRecordsByIndex<Verse>(
      'content',
      'chapter',
      getChapterRef(covenant.value, bookNum.value, chapter.value - 1)
    )
    chapterVerses.value = lines.sort((a, b) => a.line - b.line)
  },
  { immediate: true }
)

/** starts from the place being read */
watch(open, (value) => {
  if (!value) return
  ticked.value = []
  covenant.value = content.covenantIndex
  bookNum.value = content.bookIndex ?? 0
  chapter.value = content.chapterIndex + 1
})

/* ---------- result ---------- */

const selection = computed(() =>
  tab.value === 'search' ? ticked.value : rangeVerses.value.map((verse) => verse._id)
)

function add() {
  emit('add', [...selection.value])
  open.value = false
}

defineExpose({ show: () => (open.value = true) })
</script>

<style scoped>
.verse-picker {
  min-height: 360px;
}

.verse-picker :deep(mark) {
  background: #ff07;
  color: inherit;
}

.field {
  flex: 1 1 110px;
  max-width: 160px;
}

.field-covenant {
  flex: 2 1 170px;
}

.field-wide {
  flex: 3 1 220px;
}
</style>
