<template>
  <!-- the icon shows the mode it switches to -->
  <v-tooltip :text="show ? showControls.readMode : showControls.editMode">
    <template #activator="{ props: tooltip }">
      <v-btn
        v-bind="tooltip"
        :icon="show ? '$readMode' : '$editMode'"
        :aria-label="show ? showControls.readMode : showControls.editMode"
        :aria-pressed="!show"
        variant="text"
        color="secondary"
        @click="show = !show"
      />
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'

/** Editing mode (true) or reading mode; with storageKey the choice is remembered */
const show = defineModel<boolean>({ default: true })
const props = defineProps<{ storageKey?: string }>()

const { showControls } = storeToRefs(useLanguageStore())

onMounted(() => {
  if (props.storageKey && localStorage.getItem(props.storageKey) === 'read') show.value = false
})

watch(show, (value) => props.storageKey && localStorage.setItem(props.storageKey, value ? 'edit' : 'read'))
</script>
