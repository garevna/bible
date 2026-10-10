<template>
  <v-dialog v-model="open" :max-width="maxWidth" scrollable>
    <v-card color="homefone" class="app-dialog">
      <!-- always visible: what this window is -->
      <v-toolbar flat density="comfortable" color="transparent" class="app-dialog__header">
        <v-toolbar-title class="app-dialog__title">
          <v-icon v-if="icon" :icon="icon" size="small" color="secondary" class="mr-2" />{{ title }}
        </v-toolbar-title>
        <slot name="header" />
        <v-btn
          icon="$close"
          variant="text"
          size="small"
          class="mr-1"
          :aria-label="common.close"
          @click="open = false"
        />
      </v-toolbar>
      <!-- e.g. tabs: fixed too -->
      <slot name="subheader" />
      <v-divider />

      <!-- the only part that scrolls -->
      <v-card-text class="app-dialog__body">
        <slot />
      </v-card-text>

      <!-- always visible: the buttons -->
      <template v-if="$slots.actions">
        <v-divider />
        <v-card-actions class="app-dialog__footer">
          <slot name="actions" />
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'

/**
 * Popup of the app: a fixed header with the title, a scrolling body
 * and a fixed footer with the buttons (slot "actions").
 */
withDefaults(defineProps<{ title: string; icon?: string; maxWidth?: number | string }>(), {
  icon: undefined,
  maxWidth: 600
})

const open = defineModel<boolean>({ default: false })

const { common } = storeToRefs(useLanguageStore())
</script>

<style scoped>
.app-dialog {
  border-radius: 12px !important;
}

.app-dialog__title {
  font-size: 17px;
  font-weight: 600;
}

.app-dialog__body {
  padding: 24px !important;
}

.app-dialog__footer {
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px !important;
}
</style>
