<template>
  <PickerDialog
    :icon="icon"
    :activator-icon="activatorIcon"
    :tooltip="tooltip || topics.addTopicTooltip"
    :title="topics.select"
    :small="small"
    :large="large"
    :disabled="!topic && !pending"
    @ok="add"
  >
    <SelectTopic v-model="topic" v-model:pending="pending" />
  </PickerDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import PickerDialog from '@/components/selectors/PickerDialog.vue'
import SelectTopic from '@/components/selectors/SelectTopic.vue'
import { useContentStore } from '@/stores/content'
import { useLanguageStore } from '@/stores/language'
import { useNotesStore } from '@/stores/notes'
import { useTopicsStore } from '@/stores/topics'
import type { Topic } from '@/types'

/** Adds a topic to a verse (lineRef) or to the note being edited (forNote); emits the chosen topic */
const props = withDefaults(
  defineProps<{
    lineRef?: string
    forNote?: boolean
    icon?: string
    activatorIcon?: string
    tooltip?: string
    small?: boolean
    large?: boolean
  }>(),
  { lineRef: undefined, icon: '$addTopic', activatorIcon: undefined, tooltip: '' }
)

const emit = defineEmits<{ selected: [topic: Topic] }>()

const content = useContentStore()
const notes = useNotesStore()
const topicsStore = useTopicsStore()
const { topics } = storeToRefs(useLanguageStore())

const topic = ref<Topic | null>(null)
/** typed but not created yet: OK creates it */
const pending = ref('')

async function add() {
  if (!topic.value && pending.value) topic.value = await topicsStore.createTopic(pending.value)
  if (!topic.value) return
  props.lineRef && (await content.addTopicToVerse(topic.value, props.lineRef))
  props.forNote && notes.addTopicToCurrentNote(topic.value)
  emit('selected', topic.value)
  topic.value = null
}
</script>
