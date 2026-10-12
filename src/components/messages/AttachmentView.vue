<template>
  <!-- a note or a topic sent in a message: its title, texts and verses -->
  <div class="attachment">
    <div class="attachment__kind">
      <v-icon :icon="attachment.kind === 'topic' ? '$topic' : '$note'" size="small" class="mr-1" />
      {{ attachment.post.title || text.attached }}
    </div>
    <template v-for="(item, index) of attachment.post.items" :key="index">
      <blockquote v-if="item.kind === 'verse'" class="attachment__verse">
        {{ item.text }} <small>({{ item.ref }})</small>
      </blockquote>
      <template v-else>
        <p class="attachment__note">{{ item.text }}</p>
        <blockquote v-for="(verse, line) of item.verses" :key="line" class="attachment__verse">
          {{ verse.text }} <small>({{ verse.ref }})</small>
        </blockquote>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import type { Attachment } from '@/stores/worker'

defineProps<{ attachment: Attachment }>()

const { messages: text } = storeToRefs(useLanguageStore())
</script>

<style scoped>
.attachment {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 8px 12px;
  background: var(--app-surface);
}

.attachment__kind {
  font-weight: 600;
  color: rgb(var(--v-theme-secondary));
  margin-bottom: 4px;
}

.attachment__note {
  white-space: pre-wrap;
  margin: 6px 0;
}

.attachment__verse {
  border-left: solid 3px rgb(var(--v-theme-secondary));
  background: rgb(var(--v-theme-secondary) / 8%);
  border-radius: 4px;
  padding: 4px 10px;
  margin: 4px 0;
}

.attachment__verse small {
  color: rgb(var(--v-theme-secondary));
  font-weight: 600;
}
</style>
