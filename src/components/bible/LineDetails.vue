<template>
  <AppDialog v-model="dialog" :title="reference" icon="$verse" max-width="900">
    <template #subheader>
      <v-tabs v-model="tab" hide-slider density="comfortable" selected-class="app-tab--active" class="px-6">
        <v-tab
          v-for="item of tabs"
          :key="item.value"
          :value="item.value"
          class="app-tab"
          :prepend-icon="item.icon"
        >
          {{ item.text }}
        </v-tab>
      </v-tabs>
    </template>

    <template v-if="content.currentLineId">
      <blockquote class="verse-quote mb-6">{{ content.verse?.verse }}</blockquote>

      <v-window v-model="tab">
        <v-window-item value="keywords">
          <EditKeywordList :line-ref="content.currentLineId" />
        </v-window-item>
        <v-window-item value="topics">
          <EditTopicList :line-ref="content.currentLineId" />
        </v-window-item>
        <v-window-item value="notes">
          <EditNoteList :line-ref="content.currentLineId" />
        </v-window-item>
      </v-window>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import EditKeywordList from '@/components/keywords/EditKeywordList.vue'
import EditNoteList from '@/components/notes/EditNoteList.vue'
import EditTopicList from '@/components/topics/EditTopicList.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'

/** Keywords, topics and notes of content.verse */
const dialog = defineModel<boolean>({ default: false })

const content = useContentStore()
const { keywords, topics, notes } = storeToRefs(useLanguageStore())

const tab = ref<'keywords' | 'topics' | 'notes'>('keywords')

const tabs = computed(() => [
  { value: 'keywords', icon: '$keywords', text: keywords.value.listHeader },
  { value: 'topics', icon: '$topics', text: topics.value.listHeader },
  { value: 'notes', icon: '$notes', text: notes.value.listHeader }
])

/** 'Від Матвія 1:2' */
const reference = computed(() => {
  const verse = content.verse
  if (!verse) return ''
  const title = content.books?.[verse.covenant]?.[Number(verse.book.slice(2))]?.title ?? ''
  return `${title} ${Number(verse.chapter.slice(6)) + 1}:${verse.line + 1}`
})

watch(dialog, (open) => !open && content.resetCurrentVerse())
</script>

<style scoped>
.verse-quote {
  border-left: solid 3px rgb(var(--v-theme-secondary));
  padding: 4px 0 4px 12px;
  color: var(--app-text);
  font-size: 15px;
}
</style>
