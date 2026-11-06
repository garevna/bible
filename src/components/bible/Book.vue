<template>
  <div ref="book" class="mx-auto" style="max-width: 960px">
    <div class="d-flex flex-wrap align-center ga-2 px-2">
      <v-btn icon="$back" variant="text" color="secondary" @click="content.resetBook()" />
      <v-icon size="large" color="secondary">mdi-book-open-variant</v-icon>
      <h3 class="text-secondary">{{ content.bookTitle }}</h3>

      <!-- any chapter at once: all their numbers, one tap (a book may have 150) -->
      <v-menu v-if="content.chapters" v-model="choosing" :close-on-content-click="false" location="bottom">
        <template #activator="{ props: activator }">
          <v-btn
            v-bind="activator"
            variant="tonal"
            color="buttons"
            class="text-none chapter-button"
            append-icon="mdi-chevron-down"
            :aria-label="text.chooseChapter"
          >
            {{ text.chapter }} {{ chapter }}
          </v-btn>
        </template>
        <v-card class="chapters-card">
          <v-card-title class="text-subtitle-1">{{ text.chooseChapter }}</v-card-title>
          <v-card-text class="chapters">
            <v-btn
              v-for="number of content.chapters"
              :key="number"
              :variant="number === chapter ? 'flat' : 'outlined'"
              :color="number === chapter ? 'buttons' : undefined"
              size="small"
              class="chapter-number"
              @click="choose(number)"
            >
              {{ number }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-menu>
    </div>

    <v-pagination
      v-if="content.chapters"
      v-model="chapter"
      class="my-4"
      :length="content.chapters"
      :total-visible="visible"
      density="comfortable"
      active-color="buttons"
    />

    <Chapter />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'

import Chapter from '@/components/bible/Chapter.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'

const content = useContentStore()
const { notes: text } = storeToRefs(useLanguageStore())

/**
 * As many chapters as fit (a button and its margins take 42px, and a spare 2px; the arrows and one spare take three), or a phone zooms out.
 * The width is the book's own: the width of the window grows with whatever is too wide.
 */
const book = useTemplateRef<HTMLElement>('book')
const width = ref(960)
const visible = computed(() => Math.max(3, Math.min(7, Math.floor(width.value / 44) - 3)))
const observer = new ResizeObserver(([entry]) => (width.value = entry!.contentRect.width))
onMounted(() => book.value && observer.observe(book.value))
onBeforeUnmount(() => observer.disconnect())

const chapter = computed({
  get: () => content.chapterIndex + 1,
  set: (value: number) => content.selectChapter(value - 1)
})

const choosing = ref(false)
function choose(number: number) {
  choosing.value = false
  chapter.value = number
}
</script>

<style scoped>
.chapters-card {
  max-width: min(480px, calc(100vw - 32px));
}

.chapters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 6px;
  max-height: 60vh;
  overflow-y: auto;
}

.chapter-number {
  min-width: 0 !important;
}
</style>
