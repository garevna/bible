<template>
  <template v-if="!hideActivator">
    <AddButton v-if="label" :label="label" icon="$addVerse" @click="open = true" />
    <ButtonTooltip
      v-else
      :icon="activatorIcon || '$addVerse'"
      :text="text.addVerses"
      :small="!large"
      :large="large"
      @click="open = true"
    />
  </template>

  <AppDialog v-model="open" :title="text.addVerses" icon="$addVerse" max-width="760">
    <template #subheader>
      <!-- the translation to pick from; the one in the menu stays as it is -->
      <div class="d-flex align-center flex-wrap ga-2 px-6 pt-3">
        <v-select
          v-model="source"
          :items="translationItems"
          :label="text.pickerTranslation"
          :loading="loadingBible"
          density="compact"
          hide-details
          class="field-translation"
        />
        <small class="text-medium-emphasis">{{ text.pickerTranslationHint }}</small>
      </div>
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
import { useTranslations } from '@/composables/useTranslations'
import { getRecordsByIndex } from '@/db'
import { chapterVersesOf, loadBible, searchBible, type BibleJSON } from '@/db/bibles'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useSearchStore } from '@/stores/search'
import { useUserStore } from '@/stores/user'
import type { Verse } from '@/types'
import { getChapterRef, loadedTranslation, qualifiedRef } from '@/utils/refs'
import { markWords, queryWords } from '@/utils/search'

/** Picks Bible verses, found by text or chosen by reference, and emits their ids */
/** hideActivator: no own button, the parent opens it with show() (e.g. from a menu) */
defineProps<{ label?: string; hideActivator?: boolean; activatorIcon?: string; large?: boolean }>()
/** the translations the user may read */
const { translations } = useTranslations()
const emit = defineEmits<{ add: [verseIds: string[]] }>()

const content = useContentStore()
const search = useSearchStore()
const user = useUserStore()
const { notes: text, search: searchText, common } = storeToRefs(useLanguageStore())

const open = ref(false)
const tab = ref<'search' | 'reference'>('search')

const range = (count: number) => Array.from({ length: count }, (_, index) => index + 1)

/** 'Від Матвія 1:2' */
function reference({ covenant, book, chapter, line, bookName }: Verse & { bookName?: string }) {
  const title = bookName ?? content.books?.[covenant]?.[Number(book.slice(2))]?.title ?? ''
  return `${title} ${Number(chapter.slice(6)) + 1}:${line + 1}`
}

/* ---------- translation ---------- */

/** the translation of this picker; another one than in the menu is read from its file */
const source = ref(user.translation)
const bible = shallowRef<BibleJSON | null>(null)
const loadingBible = ref(false)
const foreign = computed(() => source.value !== loadedTranslation() && Boolean(bible.value))

const translationItems = computed(() =>
  translations.value.map((item) => ({ value: item.value, title: item.text[user.lang] }))
)

watch(source, async (value) => {
  bible.value = null
  if (value !== loadedTranslation()) {
    loadingBible.value = true
    bible.value = await loadBible(value).catch(() => null)
    loadingBible.value = false
  }
  // the same place, as far as this translation has it
  const books = bookTitles.value
  if (bookNum.value >= books.length) selectBook(0)
  else if (chapter.value > chapterCount.value) chapter.value = 1
  ticked.value = []
  runSearch(words.value)
  loadChapter()
})

/* ---------- search ---------- */

const query = ref('')
const words = computed(() => queryWords(query.value ?? ''))
const found = shallowRef<(Verse & { bookName?: string })[]>([])
const shown = ref(50)
const ticked = ref<string[]>([])

/** another translation is still loading: the search and the chapter wait, its load runs them */
const waiting = () => source.value !== loadedTranslation() && !bible.value

let searchRun = 0
async function runSearch(value: string[]) {
  if (waiting()) return
  // a slower search started earlier (e.g. in the translation of the menu) must not overwrite this one
  const run = ++searchRun
  shown.value = 50
  const result = foreign.value
    ? search.searchable(value)
      ? searchBible(bible.value!, value, source.value)
      : []
    : await search.findVerses(value)
  if (run === searchRun) found.value = result
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(words, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => runSearch(value), 300)
})

/* ---------- reference ---------- */

const covenant = ref(1)
const bookNum = ref(0)
const chapter = ref(1)
const fromVerse = ref(1)
const toVerse = ref<number | null>(null)
const chapterVerses = shallowRef<Verse[]>([])

const covenantItems = computed(() => {
  const names = foreign.value
    ? bible.value!.map((item) => item.title)
    : content.covenantNames.length === 2
      ? content.covenantNames
      : common.value.covenantNames
  return names.map((title: string, value: number) => ({ title, value }))
})
const bookTitles = computed(() =>
  foreign.value
    ? (bible.value![covenant.value]?.books ?? []).map((book) => book.title)
    : (content.books?.[covenant.value] ?? []).map((book) => book.title)
)
const bookItems = computed(() => bookTitles.value.map((title, value) => ({ title, value })))
const chapterCount = computed(() =>
  foreign.value
    ? (bible.value![covenant.value]?.books[bookNum.value]?.chapters.length ?? 0)
    : (content.books?.[covenant.value]?.[bookNum.value]?.chapters ?? 0)
)

const rangeVerses = computed(() =>
  chapterVerses.value.filter(
    (verse) => verse.line + 1 >= fromVerse.value && verse.line + 1 <= (toVerse.value ?? fromVerse.value)
  )
)

function selectBook(num: number) {
  bookNum.value = num
  chapter.value = 1
}

let chapterRun = 0
async function loadChapter() {
  if (waiting()) return
  const run = ++chapterRun
  fromVerse.value = 1
  toVerse.value = null
  if (foreign.value) {
    chapterVerses.value = chapterVersesOf(
      bible.value!,
      covenant.value,
      bookNum.value,
      chapter.value - 1,
      source.value
    )
    return
  }
  const lines = await getRecordsByIndex<Verse>(
    'content',
    'chapter',
    getChapterRef(covenant.value, bookNum.value, chapter.value - 1)
  )
  if (run === chapterRun) chapterVerses.value = lines.sort((a, b) => a.line - b.line)
}

watch([covenant, bookNum, chapter], loadChapter, { immediate: true })

/** starts from the place being read */
watch(open, (value) => {
  if (!value) return
  ticked.value = []
  source.value = user.translation
  covenant.value = content.covenantIndex
  bookNum.value = content.bookIndex ?? 0
  chapter.value = content.chapterIndex + 1
})

/* ---------- result ---------- */

const selection = computed(() =>
  tab.value === 'search' ? ticked.value : rangeVerses.value.map((verse) => verse._id)
)

/** each verse keeps the translation it was picked in */
function add() {
  emit(
    'add',
    selection.value.map((id) => qualifiedRef(source.value, id))
  )
  open.value = false
}

defineExpose({ show: () => (open.value = true) })
</script>

<style scoped>
.verse-picker {
  min-height: 360px;
}

.verse-picker :deep(mark) {
  background: var(--app-mark);
  color: inherit;
}

.field {
  flex: 1 1 110px;
  max-width: 160px;
}

.field-translation {
  flex: 0 1 300px;
}

.field-covenant {
  flex: 2 1 170px;
}

.field-wide {
  flex: 3 1 220px;
}
</style>
