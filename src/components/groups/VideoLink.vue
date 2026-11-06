<template>
  <!-- a video of YouTube: its picture opens it on YouTube -->
  <a :href="url" target="_blank" rel="noopener" class="video">
    <img :src="`https://i.ytimg.com/vi/${youTubeId(url)}/hqdefault.jpg`" alt="" />
    <v-icon icon="mdi-play-circle" size="56" color="white" class="play" />
  </a>
</template>

<script setup lang="ts">
import { youTubeId } from '@/stores/schedule'

defineProps<{ url: string }>()
</script>

<style scoped>
.video {
  display: block;
  position: relative;
  max-width: 420px;
  border-radius: var(--app-radius);
  overflow: hidden;
}

.video img {
  display: block;
  width: 100%;
}

.play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.9;
}
</style>
