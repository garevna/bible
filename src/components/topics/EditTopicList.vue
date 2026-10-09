<template>
  <fieldset class="field-set">
    <legend>{{ text.listHeader }}</legend>

    <div v-for="topic in list" :key="topic._id" class="d-flex align-center">
      <ButtonTooltip
        icon="$removeTopic"
        color="delete"
        small
        class="delete-icon"
        :text="text.removeFromListTooltip"
        @click="remove(topic._id)"
      />
      <span class="ml-2">{{ topic.title }}</span>
    </div>

    <AddTopicToList :line-ref="lineRef" :for-note="forNote" large />
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import AddTopicToList from '@/components/topics/AddTopicToList.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'

/** Topics of a verse (lineRef) or of the note being edited (forNote) */
const props = defineProps<{ lineRef?: string; forNote?: boolean }>()

const content = useContentStore()
const notes = useNotesStore()
const { topics: text } = storeToRefs(useLanguageStore())

const list = computed(() =>
  props.lineRef ? content.lineTopics : props.forNote ? notes.currentNoteTopics : []
)

async function remove(topicId: string) {
  props.lineRef && (await content.removeTopicFromVerse(topicId, props.lineRef))
  props.forNote && notes.removeTopicFromCurrentNote(topicId)
}
</script>
