<template>
  <div class="page mx-auto" style="max-width: 1008px">
    <div class="d-flex align-center justify-end my-2">
      <v-btn variant="text" :disabled="content.covenantIndex !== 0" @click="content.resetBook()">
        <small>{{ covenantTitles[0] }}</small>
      </v-btn>

      <v-switch
        :model-value="content.covenantIndex === 1"
        color="buttons"
        base-color="buttons"
        hide-details
        inset
        density="compact"
        class="flex-grow-0 mx-2"
        @update:model-value="content.switchCovenant()"
      />

      <v-btn variant="text" :disabled="content.covenantIndex !== 1" @click="content.resetBook()">
        <small>{{ covenantTitles[1] }}</small>
      </v-btn>
    </div>

    <Book v-if="content.bookIndex !== null" />

    <div v-else-if="covenantBooks.length" class="pa-4">
      <h5 class="mb-4">{{ covenantTitles[content.covenantIndex] }}</h5>
      <v-divider class="mb-5" />

      <template v-for="(book, num) in covenantBooks" :key="book._id">
        <p class="book-menu-item mb-1" @click="content.selectBook(num)">
          <v-icon size="small" color="buttons" class="mr-1">$book</v-icon>
          {{ book.title }}
        </p>
        <v-divider v-if="book.div" class="my-3" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import Book from '@/components/bible/Book.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'

const content = useContentStore()
const { common } = storeToRefs(useLanguageStore())

/** titles from the translation file, or the UI language ones until the file is loaded */
const covenantTitles = computed(() =>
  content.covenantNames.length === 2 ? content.covenantNames : common.value.covenantNames
)

const covenantBooks = computed(() => content.books?.[content.covenantIndex] ?? [])
</script>

<style scoped>
.book-menu-item {
  cursor: pointer;
  width: max-content;
  padding: 0 8px;
  border-radius: 4px;
}

.book-menu-item:hover {
  background: rgb(var(--v-theme-secondary) / 25%);
  color: rgb(var(--v-theme-secondary));
}
</style>
