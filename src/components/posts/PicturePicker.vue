<template>
  <!-- a picture kept already: chosen from the archive, not uploaded again -->
  <AppDialog v-model="open" :title="text.archivePick" icon="mdi-image-multiple-outline" max-width="860">
    <PicturesArchive v-if="open" pick @picked="chosen" />
  </AppDialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import PicturesArchive from '@/components/posts/PicturesArchive.vue'
import { useLanguageStore } from '@/stores/language'

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ picked: [image: string] }>()

const { posts: text } = storeToRefs(useLanguageStore())

function chosen(image: string) {
  open.value = false
  emit('picked', image)
}
</script>
