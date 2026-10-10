<template>
  <div class="page mx-auto" style="max-width: 640px">
    <div class="d-flex mb-6">
      <CreateTopic />
    </div>

    <p v-if="!sorted.length" class="text-medium-emphasis">{{ common.noData }}</p>

    <div v-for="topic in sorted" :key="topic._id" class="topic-row d-flex align-center py-1">
      <DeleteLinkedButton
        :id="topic._id"
        :name="topic.title"
        field="topics"
        :tooltip="text.deleteTopic"
        @confirm="topics.deleteTopic(topic._id)"
      />

      <v-text-field
        v-if="editing === topic._id"
        v-model="title"
        variant="outlined"
        density="compact"
        hide-details
        autofocus
        prepend-inner-icon="$reset"
        append-inner-icon="$save"
        class="mx-2"
        @click:prepend-inner="editing = null"
        @click:append-inner="rename(topic)"
        @keyup.enter="rename(topic)"
        @keyup.esc="editing = null"
      />

      <template v-else>
        <span class="topic-title flex-grow-1 mx-2" @click="topics.gotoTopic(topic)">{{ topic.title }}</span>
        <v-tooltip :text="format(text.notesInTopic, { count: topics.noteCounts[topic._id] ?? 0 })">
          <template #activator="{ props }">
            <v-chip v-bind="props" size="small" variant="tonal" prepend-icon="$note" class="mr-2">
              {{ topics.noteCounts[topic._id] ?? 0 }}
            </v-chip>
          </template>
        </v-tooltip>
        <ButtonTooltip
          icon="$edit"
          color="primary"
          small
          :text="text.renameTopic"
          @click="startEditing(topic)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DeleteLinkedButton from '@/components/DeleteLinkedButton.vue'
import CreateTopic from '@/components/topics/CreateTopic.vue'
import { useLanguageStore } from '@/stores/language'
import { useTopicsStore } from '@/stores/topics'
import type { Topic } from '@/types'
import { format } from '@/utils/format'

const topics = useTopicsStore()
const { common, topics: text } = storeToRefs(useLanguageStore())

const sorted = computed(() => [...topics.topicList].sort((a, b) => a.title.localeCompare(b.title)))

const editing = ref<string | null>(null)
const title = ref('')

function startEditing(topic: Topic) {
  editing.value = topic._id
  title.value = topic.title
}

async function rename(topic: Topic) {
  const value = title.value.trim()
  if (value && value !== topic.title) await topics.putTopic({ ...topic, title: value })
  editing.value = null
}
</script>

<style scoped>
.topic-row {
  border-bottom: solid 1px var(--app-border-light);
}

.topic-title {
  cursor: pointer;
}

.topic-title:hover {
  color: rgb(var(--v-theme-secondary));
}
</style>
