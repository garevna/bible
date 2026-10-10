<template>
  <fieldset class="field-set">
    <legend>{{ title }}</legend>
    <!-- the add button sits on the frame, in the top right corner -->
    <div v-if="$slots.action" class="field-set__action">
      <slot name="action" />
    </div>
    <slot />
    <p v-if="empty" class="field-set__empty">{{ common.noData }}</p>
  </fieldset>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'

/** A framed block with a title on the left and an action on the right of the frame */
defineProps<{ title: string; empty?: boolean }>()

const { common } = storeToRefs(useLanguageStore())
</script>

<style scoped>
.field-set {
  position: relative;
  padding: 12px 16px;
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  margin-bottom: 24px;
  min-height: 56px;
}

.field-set > legend {
  color: rgb(var(--v-theme-secondary) / 50%);
  padding: 0 8px;
  font-size: 13px;
  font-weight: bold;
}

.field-set__action {
  position: absolute;
  top: -22px;
  right: 12px;
  background: rgb(var(--v-theme-homefone));
  padding: 0 4px;
}

.field-set__empty {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}
</style>
