<template>
  <v-tooltip :text="show ? showControls.hide : showControls.show">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :icon="show ? '$hide' : '$show'"
        variant="text"
        color="secondary"
        @click="show = !show"
      />
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'

const show = defineModel<boolean>({ default: true })

const { showControls } = storeToRefs(useLanguageStore())
</script>
