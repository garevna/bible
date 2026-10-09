<template>
  <div class="mx-auto pt-8 px-2 pb-16" style="max-width: 960px">
    <v-text-field
      v-model="search.query"
      :placeholder="text.placeholder"
      :hint="text.hint"
      persistent-hint
      prepend-inner-icon="$search"
      variant="outlined"
      density="comfortable"
      clearable
      autofocus
    />

    <v-chip-group v-model="search.scope" mandatory selected-class="text-secondary" class="my-2">
      <v-chip value="all" filter>{{ text.scopeAll }}</v-chip>
      <v-chip value="old" filter>{{ text.scopeOld }}</v-chip>
      <v-chip value="new" filter>{{ text.scopeNew }}</v-chip>
      <v-chip v-if="content.book" value="book" filter>{{ content.book.title }}</v-chip>
    </v-chip-group>

    <template v-if="search.query?.trim()">
      <p v-if="!search.words.some((word) => word.length >= 2)" class="text-medium-emphasis">
        {{ text.tooShort }}
      </p>
      <p v-else class="text-medium-emphasis mb-4">
        {{ text.found }}: <span class="found-count">{{ search.total }}</span>
      </p>
    </template>

    <div
      v-for="verse of search.results"
      :key="verse._id"
      class="result draggable-item mb-2"
      @click="content.gotoVerse(verse._id)"
    >
      <small class="link-to-verse mr-2">{{ reference(verse) }}</small>
      <span v-html="verse.html" />
    </div>

    <div v-if="search.hasMore" class="text-center my-4">
      <v-btn variant="outlined" color="buttons" @click="search.showMore()">{{ text.showMore }}</v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useSearchStore } from '@/stores/search'
import type { Verse } from '@/types'

const content = useContentStore()
const search = useSearchStore()
const { search: text } = storeToRefs(useLanguageStore())

/** 'Від Матвія 1:2' */
function reference({ covenant, book, chapter, line }: Verse) {
  const title = content.books?.[covenant]?.[Number(book.slice(2))]?.title ?? ''
  return `${title} ${Number(chapter.slice(6)) + 1}:${line + 1}`
}

let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => [search.query, search.scope],
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => search.search(), 300)
  },
  { immediate: true }
)
</script>

<style scoped>
.result {
  cursor: pointer;
}

.result :deep(mark) {
  background: #ff07;
  color: inherit;
  padding: 0 1px;
  border-radius: 2px;
}
</style>
