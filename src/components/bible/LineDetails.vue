<template>
  <v-dialog v-model="dialog" transition="dialog-bottom-transition" max-width="900">
    <v-card color="homefone">
      <v-toolbar flat color="primary">
        <v-icon class="mx-3">$verse</v-icon>
        <span class="shorted-text">{{ content.verse?.verse }}</span>
        <v-spacer />
        <v-btn icon="$close" @click="dialog = false" />
      </v-toolbar>

      <div v-if="content.currentLineId" class="pa-4">
        <v-btn-toggle v-model="tab" mandatory color="primary" class="mb-4">
          <v-btn v-for="item of tabs" :key="item.value" :value="item.value" :prepend-icon="item.icon">
            <span v-if="tab === item.value">{{ item.text }}</span>
          </v-btn>
        </v-btn-toggle>

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
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

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

watch(dialog, (open) => !open && content.resetCurrentVerse())
</script>

<style scoped>
.shorted-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1 1 auto;
}
</style>
