<template>
  <FieldSet :title="text.listHeader" :empty="!list.length">
    <template #action>
      <AddTopicToList :line-ref="lineRef" :for-note="forNote" small />
    </template>

    <div v-for="topic in list" :key="topic._id" class="d-flex align-center row-item">
      <span class="flex-grow-1">{{ topic.title }}</span>
      <ButtonTooltip
        icon="$removeTopic"
        color="delete"
        small
        class="delete-icon"
        :text="text.removeFromListTooltip"
        @click="remove(topic._id)"
      />
    </div>
  </FieldSet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import FieldSet from '@/components/FieldSet.vue'
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
