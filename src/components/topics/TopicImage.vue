<template>
  <!-- the picture in the head of the topic; while editing it is added, changed or taken away -->
  <div v-if="topics.currentTopic?.image" class="topic-image mt-4 mb-6">
    <img :src="topics.currentTopic.image" alt="" />
    <div v-if="editable" class="topic-image__actions">
      <ButtonTooltip icon="mdi-image-edit-outline" :text="text.changeImage" color="white" @click="choose" />
      <ButtonTooltip icon="mdi-image-remove-outline" :text="text.removeImage" color="white" @click="remove" />
    </div>
  </div>

  <button v-else-if="editable" type="button" class="topic-image-add mt-4 mb-6" @click="choose">
    <v-icon icon="mdi-image-plus-outline" class="mr-2" />{{ text.addImage }}
  </button>

  <v-snackbar v-model="failed" color="error" timeout="4000">{{ text.imageFailed }}</v-snackbar>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { useLanguageStore } from '@/stores/language'
import { useTopicsStore } from '@/stores/topics'
import { pickImage, resizeImage } from '@/utils/image'

defineProps<{ editable: boolean }>()

const topics = useTopicsStore()
const { topics: text } = storeToRefs(useLanguageStore())

const failed = ref(false)

/** at most 1280 px: sharp enough for Telegram and small enough to keep in the topic */
async function choose() {
  const file = await pickImage()
  if (!file) return
  try {
    await topics.setCurrentTopicImage(await resizeImage(file, { size: 1280, quality: 0.8 }))
  } catch {
    failed.value = true
  }
}

const remove = () => topics.setCurrentTopicImage(null)
</script>

<style scoped>
.topic-image {
  position: relative;
  border-radius: var(--app-radius-large);
  overflow: hidden;
}

.topic-image img {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}

.topic-image__actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  padding: 2px 6px;
  border-radius: var(--app-radius);
  background: rgb(0 0 0 / 40%);
}

.topic-image-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 72px;
  border: dashed 2px var(--app-border);
  border-radius: var(--app-radius-large);
  color: var(--app-text-muted);
  cursor: pointer;
}

.topic-image-add:hover {
  border-color: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-secondary));
}
</style>
