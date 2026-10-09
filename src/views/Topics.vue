<template>
  <div class="mx-auto my-7 px-2 pb-16" style="max-width: 600px">
    <div class="d-flex justify-end mb-4">
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
        <v-chip size="x-small" class="mr-2">{{ topic.refs.length }}</v-chip>
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
  border-bottom: solid 1px #eee;
}

.topic-title {
  cursor: pointer;
}

.topic-title:hover {
  color: #09b;
}
</style>
