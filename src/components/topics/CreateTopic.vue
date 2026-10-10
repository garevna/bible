<template>
  <PickerDialog
    icon="$newTopic"
    :tooltip="topics.addTopicTooltip"
    :title="topics.createNewTopicLabel"
    :disabled="!title.trim()"
    :label="topics.newTopic"
    @ok="create"
  >
    <v-text-field
      v-model="title"
      :label="topics.createNewTopicLabel"
      variant="outlined"
      density="compact"
      hide-details
      autofocus
    />
  </PickerDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import PickerDialog from '@/components/selectors/PickerDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useTopicsStore } from '@/stores/topics'

const topicsStore = useTopicsStore()
const { topics } = storeToRefs(useLanguageStore())

const title = ref('')

async function create() {
  await topicsStore.createTopic(title.value)
  title.value = ''
}
</script>
