<template>
  <div class="mx-auto my-4 px-2 pb-16" style="max-width: 760px">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <PickerDialog
        icon="$addKeyword"
        :label="text.newKeyword"
        :title="text.newKeyword"
        :disabled="!newKeyword.trim()"
        @ok="create"
      >
        <v-text-field
          v-model="newKeyword"
          :placeholder="text.createNewKeywordLabel"
          prepend-inner-icon="$keyword"
          density="compact"
          hide-details
          autofocus
          @keyup.enter="newKeyword.trim() && create()"
        />
      </PickerDialog>
      <v-spacer />
      <h4 class="text-secondary">{{ current ? `#${current._id}` : '' }}</h4>
    </div>

    <v-tabs v-model="mode" hide-slider density="comfortable" selected-class="app-tab--active" class="mb-4">
      <v-tab value="verses" class="app-tab" prepend-icon="$verses">{{ text.toggleButtonVerses }}</v-tab>
      <v-tab value="notes" class="app-tab" prepend-icon="$notes">{{ text.toggleButtonNotes }}</v-tab>
    </v-tabs>

    <p v-if="!keywords.keywordList.length" class="text-medium-emphasis">{{ common.noData }}</p>

    <v-expansion-panels v-model="panel" variant="accordion" bg-color="transparent">
      <v-expansion-panel
        v-for="keyword in sortedKeywords"
        :key="keyword._id"
        :value="keyword._id"
        elevation="0"
        class="keyword-panel"
      >
        <v-expansion-panel-title>
          <DeleteLinkedButton
            :id="keyword._id"
            :name="`#${keyword._id}`"
            field="keywords"
            :tooltip="text.deleteKeyword"
            @confirm="remove(keyword)"
          />
          <span class="ml-1">#{{ keyword._id }}</span>
          <v-chip size="x-small" class="ml-2">{{ keyword.refs.length }}</v-chip>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <!-- verses of the keyword -->
          <template v-if="mode === 'verses'">
            <div
              v-for="verse in content.listOfVerses"
              :key="verse._id"
              class="d-flex align-center keyword-verse"
            >
              <p class="flex-grow-1 my-0" v-html="verse.html" />
              <ButtonTooltip
                icon="$remove"
                color="delete"
                small
                class="delete-icon"
                :text="text.removeFromListTooltip"
                @click="keywords.removeKeywordFromVerse(keyword._id, verse._id).then(load)"
              />
            </div>
            <AddVerses :label="notesText.addVerses" class="mt-2" @add="addVerses(keyword._id, $event)" />
          </template>

          <!-- notes with the keyword -->
          <template v-else>
            <Note v-for="note in keywordNotes" :key="note._id" :note="note" @removed="load" @changed="load" />
            <CreateNote :label="notesText.newNote" :keyword-id="keyword._id" @saved="load" />
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DeleteLinkedButton from '@/components/DeleteLinkedButton.vue'
import CreateNote from '@/components/notes/CreateNote.vue'
import Note from '@/components/notes/Note.vue'
import AddVerses from '@/components/selectors/AddVerses.vue'
import PickerDialog from '@/components/selectors/PickerDialog.vue'
import { useContentStore } from '@/stores/content'
import { useKeywordsStore } from '@/stores/keywords'
import { useLanguageStore } from '@/stores/language'
import type { Keyword, Note as NoteRecord } from '@/types'

const content = useContentStore()
const keywords = useKeywordsStore()
const { common, keywords: text, notes: notesText } = storeToRefs(useLanguageStore())

const mode = ref<'verses' | 'notes'>('verses')
const panel = ref<string | null>(null)
const keywordNotes = ref<NoteRecord[]>([])
const newKeyword = ref('')

const sortedKeywords = computed(() => [...keywords.keywordList].sort((a, b) => a._id.localeCompare(b._id)))
const current = computed(() => keywords.keywordList.find((keyword) => keyword._id === panel.value) ?? null)

/** Loads the verses or notes of the expanded keyword */
async function load() {
  const keyword = current.value
  if (!keyword) return
  if (mode.value === 'verses') await content.getListOfVerses(keyword.refs)
  else keywordNotes.value = await keywords.getKeywordNotes(keyword._id)
}

watch([current, mode], load)

async function create() {
  const name = newKeyword.value.trim()
  await keywords.createKeyword(name)
  newKeyword.value = ''
  panel.value = name
}

async function addVerses(keyword: string, verseIds: string[]) {
  await keywords.addKeywordToVerses(keyword, verseIds)
  await load()
}

async function remove(keyword: Keyword) {
  if (panel.value === keyword._id) panel.value = null
  await keywords.deleteKeyword(keyword)
}
</script>

<style scoped>
.keyword-panel {
  border: solid 1px #e4e4e4;
  margin-bottom: 4px;
  border-radius: 8px !important;
}

.keyword-verse + .keyword-verse {
  border-top: solid 1px #eee;
}

.keyword-verse {
  padding: 4px 0;
}
</style>
