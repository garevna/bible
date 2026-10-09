<template>
  <div class="mx-auto" style="max-width: 960px">
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
      :total-visible="7"
      density="comfortable"
      active-color="buttons"
    />

    <Chapter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import Chapter from '@/components/bible/Chapter.vue'
import { useContentStore } from '@/stores/content'

const content = useContentStore()

const chapter = computed({
  get: () => content.chapterIndex + 1,
  set: (value: number) => content.selectChapter(value - 1)
})
</script>
