<template>
  <AppDialog v-model="open" :title="text.sentTitle" icon="mdi-send-check-outline" max-width="640">
    <p class="channel">{{ format(text.sentTo, { name: post?.channel ?? '' }) }}</p>
    <!-- Telegram HTML: the worker escapes the texts, the tags are b, i and blockquote -->
    <div v-for="(message, index) of messages" :key="index" class="telegram-message" v-html="message" />

    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="open = false">
        {{ common.close }}
      </v-btn>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore } from '@/stores/worker'
import { format } from '@/utils/format'

/** What went to a Telegram channel (a post, the notices of the calendar): which channel, and the text */
const worker = useWorkerStore()
const { channelPost: post } = storeToRefs(worker)
const { common, publish: text } = storeToRefs(useLanguageStore())

const open = computed({
  get: () => Boolean(post.value),
  set: (value) => value || (post.value = null)
})

/** the quotes are blocks here, so the empty lines around them would double the gaps */
const messages = computed(() =>
  (post.value?.texts ?? []).map((message) => message.replace(/\n*(<\/?blockquote>)\n*/g, '$1'))
)
</script>

<style scoped>
.channel {
  font-size: 15px;
  margin-bottom: 12px;
}

/* roughly as Telegram shows a post */
.telegram-message {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--app-surface);
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 12px 16px;
  margin-bottom: 12px;
  font-size: 15px;
}

.telegram-message :deep(blockquote) {
  border-left: solid 3px rgb(var(--v-theme-secondary));
  background: rgb(var(--v-theme-secondary) / 8%);
  border-radius: 4px;
  padding: 6px 10px;
  margin: 12px 0;
}
</style>
