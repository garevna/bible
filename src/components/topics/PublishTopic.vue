<template>
  <ButtonTooltip icon="$publish" :text="text.toTelegram" color="secondary" large @click="openDialog" />

  <AppDialog v-model="open" :title="text.toTelegram" icon="$publish" max-width="640">
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-4" />

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="sent" type="success" variant="tonal" density="compact" class="mb-4">
      {{ format(text.published, { count: sent }) }}
    </v-alert>

    <template v-if="!sent && messages.length">
      <p class="hint">{{ text.previewHint }}</p>
      <p v-if="messages.length > 1" class="hint">{{ format(text.messages, { count: messages.length }) }}</p>
      <!-- Telegram HTML: the worker escapes the texts, the tags are b, i and blockquote -->
      <div v-for="(message, index) of previews" :key="index" class="telegram-message" v-html="message" />
    </template>

    <template #actions>
      <v-btn v-if="sent" variant="flat" color="primary" class="text-none px-6" @click="open = false">
        {{ common.close }}
      </v-btn>
      <DialogButtons
        v-else
        :confirm-text="text.publishButton"
        :disabled="busy || !messages.length"
        @cancel="open = false"
        @confirm="publishPost"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import { PublishError, usePublishStore } from '@/stores/publish'
import { useTopicsStore } from '@/stores/topics'
import { format } from '@/utils/format'
import { topicPost } from '@/utils/topicPost'

/** The current topic as it is on the page, previewed and then posted to the Telegram channel */
const publish = usePublishStore()
const topics = useTopicsStore()
const { common, publish: text } = storeToRefs(useLanguageStore())

const open = ref(false)
const busy = ref(false)
const messages = ref<string[]>([])
const sent = ref(0)
const error = ref('')

/** the quotes are blocks here, so the empty lines around them would double the gaps */
const previews = computed(() =>
  messages.value.map((message) => message.replace(/\n*(<\/?blockquote>)\n*/g, '$1'))
)

const post = computed(() => topicPost(topics.currentTopic?.title ?? '', topics.currentTopicData))

const reason = (cause: unknown) =>
  cause instanceof PublishError && cause.message !== 'unreachable' ? cause.message : text.value.unreachable

async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = format(text.value.failed, { name: reason(cause) })
  } finally {
    busy.value = false
  }
}

function openDialog() {
  open.value = true
  messages.value = []
  sent.value = 0
  if (!post.value.items.length) {
    error.value = text.value.emptyTopic
    return
  }
  run(async () => {
    messages.value = await publish.preview(post.value)
  })
}

const publishPost = () =>
  run(async () => {
    sent.value = await publish.publishToTelegram(post.value)
  })
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 12px;
}

/* roughly as Telegram shows a post */
.telegram-message {
  white-space: pre-wrap;
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
