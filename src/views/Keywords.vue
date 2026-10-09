<template>
  <div class="mx-auto my-4 px-2 pb-16" style="max-width: 700px">
    <div class="d-flex align-center mb-4">
      <h4 class="text-secondary flex-grow-1">{{ current ? `#${current._id}` : '' }}</h4>

      <v-btn-toggle v-model="mode" mandatory color="buttons" density="comfortable">
        <v-btn value="verses" prepend-icon="$verses">
          <span v-if="mode === 'verses'">{{ text.toggleButtonVerses }}</span>
          <v-tooltip activator="parent" :text="text.toggleButtonVersesTooltip" />
        </v-btn>
        <v-btn value="notes" prepend-icon="$notes">
          <span v-if="mode === 'notes'">{{ text.toggleButtonNotes }}</span>
          <v-tooltip activator="parent" :text="text.toggleButtonNotesTooltip" />
        </v-btn>
      </v-btn-toggle>
    </div>

    <p v-if="!keywords.keywordList.length" class="text-medium-emphasis">{{ common.noData }}</p>

    <v-expansion-panels v-model="panel" variant="popout" bg-color="transparent">
      <v-expansion-panel
        v-for="keyword in keywords.keywordList"
        :key="keyword._id"
        :value="keyword._id"
        elevation="0"
      >
        <v-expansion-panel-title>
          <DeleteLinkedButton
            :id="keyword._id"
            :name="`#${keyword._id}`"
            field="keywords"
            :tooltip="text.deleteKeyword"
            @confirm="remove(keyword)"
          />
          #{{ keyword._id }}
          <v-chip size="x-small" class="ml-2">{{ keyword.refs.length }}</v-chip>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <template v-if="mode === 'verses'">
            <p v-if="!content.listOfVerses.length" class="text-medium-emphasis">{{ common.noData }}</p>
            <p
              v-for="verse in content.listOfVerses"
              :key="verse._id"
              class="draggable-item"
              v-html="verse.html"
            />
          </template>

          <template v-else>
            <p v-if="!keywordNotes.length" class="text-medium-emphasis">{{ common.noData }}</p>
            <Note v-for="note in keywordNotes" :key="note._id" :note="note" :show-controls="false" />
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import DeleteLinkedButton from '@/components/DeleteLinkedButton.vue'
import Note from '@/components/notes/Note.vue'
import { useContentStore } from '@/stores/content'
import { useKeywordsStore } from '@/stores/keywords'
import { useLanguageStore } from '@/stores/language'
import type { Keyword, Note as NoteRecord } from '@/types'

const content = useContentStore()
const keywords = useKeywordsStore()
const { common, keywords: text } = storeToRefs(useLanguageStore())

const mode = ref<'verses' | 'notes'>('verses')
const panel = ref<string | null>(null)
const keywordNotes = ref<NoteRecord[]>([])

const current = computed(() => keywords.keywordList.find((keyword) => keyword._id === panel.value) ?? null)

/** Loads verses or notes of the expanded keyword */
watch([current, mode], async ([keyword, value]) => {
  if (!keyword) return
  if (value === 'verses') await content.getListOfVerses(keyword.refs)
  else keywordNotes.value = await keywords.getKeywordNotes(keyword._id)
})

async function remove(keyword: Keyword) {
  if (panel.value === keyword._id) panel.value = null
  await keywords.deleteKeyword(keyword)
}
</script>
