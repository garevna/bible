<template>
  <img v-if="url" :src="url" alt="" class="stored-image" />
  <v-progress-circular v-else-if="loading" indeterminate size="24" color="secondary" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { useWorkerStore } from '@/stores/worker'

/**
 * A picture of a post: a data URL as it is, or a picture kept in Telegram ('tg:…'), brought by the
 * worker with the token of the user (an <img> cannot send it) and shown from memory
 */
const props = defineProps<{ src: string | null | undefined }>()

const worker = useWorkerStore()
const url = ref('')
const loading = ref(false)
let made = ''

function forget() {
  if (made) URL.revokeObjectURL(made)
  made = ''
}

watch(
  () => props.src,
  async (src) => {
    forget()
    url.value = ''
    if (!src) return
    if (!src.startsWith('tg:')) {
      url.value = src
      return
    }
    loading.value = true
    try {
      made = URL.createObjectURL(await worker.requestBlob(`/files/${encodeURIComponent(src)}`))
      url.value = made
    } catch {
      // not shown: the rest of the post is
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

onBeforeUnmount(forget)
</script>

<style scoped>
.stored-image {
  display: block;
  max-width: 100%;
  max-height: 320px;
  border-radius: var(--app-radius);
}
</style>
