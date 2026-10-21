<template>
  <AppDialog v-model="open" :title="text.addVideo" icon="mdi-youtube" max-width="560">
    <!-- the link of a video of YouTube: its title and its picture come by themselves -->
    <v-text-field
      v-model="url"
      :label="text.videoLink"
      placeholder="https://www.youtube.com/watch?v=…"
      :loading="finding"
      :error-messages="url && !valid ? text.videoNotYouTube : ''"
      prepend-inner-icon="mdi-link-variant"
      density="compact"
      clearable
    />
    <v-text-field v-model="title" :label="text.videoTitle" density="compact" hide-details class="mb-3" />
    <a v-if="picture" :href="url" target="_blank" rel="noopener" class="preview">
      <img :src="picture" alt="" />
      <span v-if="author" class="author">{{ author }}</span>
    </a>

    <template #actions>
      <DialogButtons
        :confirm-text="common.save"
        :disabled="!valid || !title.trim()"
        @cancel="open = false"
        @confirm="save"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import { youTubeId } from '@/stores/schedule'
import { useWorkerStore } from '@/stores/worker'

/** A video of YouTube as a material: its link, and its title (found by itself, changed if wanted) */
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ picked: [url: string, title: string] }>()

const worker = useWorkerStore()
const { calendar: text, common } = storeToRefs(useLanguageStore())

const url = ref('')
const title = ref('')
const author = ref('')
const finding = ref(false)

watch(open, (value) => {
  if (!value) return
  url.value = ''
  title.value = ''
  author.value = ''
})

const YOUTUBE =
  /^https:\/\/(www\.|m\.)?(youtube\.com\/(watch\?(.+&)?v=|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}/
const valid = computed(() => YOUTUBE.test((url.value ?? '').trim()))
const picture = computed(() => {
  const id = valid.value ? youTubeId(url.value.trim()) : null
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''
})

// a link given: its title, unless one is written already
watch(valid, async (ok) => {
  if (!ok) return
  finding.value = true
  try {
    const video = await worker.videoInfo(url.value.trim())
    if (!title.value.trim()) title.value = video.title
    author.value = video.author
  } catch {
    // no title: it is written by hand
  } finally {
    finding.value = false
  }
})

function save() {
  emit('picked', url.value.trim(), title.value.trim())
  open.value = false
}
</script>

<style scoped>
.preview {
  display: block;
  position: relative;
  border-radius: var(--app-radius);
  overflow: hidden;
}

.preview img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
}

.author {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #000a;
  color: #fff;
  font-size: 12px;
}
</style>
