<template>
  <div ref="book" class="mx-auto" style="max-width: 960px">
    <div class="d-flex align-center px-2">
      <v-btn icon="$back" variant="text" color="secondary" @click="content.resetBook()" />
      <v-icon size="large" color="secondary">mdi-book-open-variant</v-icon>
      <h3 class="ml-2 text-secondary">{{ content.bookTitle }}</h3>
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

import Chapter from '@/components/bible/Chapter.vue'
import { useContentStore } from '@/stores/content'

const content = useContentStore()

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
</script>
