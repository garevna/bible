<template>
  <div class="page mx-auto" style="max-width: 960px">
    <p v-if="!worker.canReceive" class="text-medium-emphasis">{{ admin.noAccess }}</p>

    <template v-else>
      <div class="d-flex align-center ga-2 mb-2">
        <h2 class="messages-title flex-grow-1">{{ text.title }}</h2>
        <SendMessage v-if="worker.canSend" />
        <ButtonTooltip icon="mdi-refresh" :text="admin.reload" color="secondary" @click="load" />
      </div>
      <p class="hint">{{ text.hint }}</p>

      <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

      <p v-if="!busy && !worker.messages.length" class="text-medium-emphasis">{{ text.noMessages }}</p>

      <article
        v-for="message of worker.messages"
        :key="message.id"
        class="message"
        :class="{
          'message--incoming': incoming(message),
          'message--unread': incoming(message) && !message.readAt
        }"
      >
        <header class="d-flex align-center ga-2 mb-1">
          <v-icon
            :icon="incoming(message) ? 'mdi-message-arrow-left-outline' : 'mdi-message-arrow-right'"
            size="small"
            color="secondary"
          />
          <span class="message__who">
            {{
              incoming(message)
                ? format(text.from, { name: message.fromName })
                : format(text.to, { name: message.toName })
            }}
          </span>
          <v-spacer />
          <small class="text-medium-emphasis">{{ time(message.createdAt) }}</small>
        </header>

        <p v-if="message.text" class="message__text">{{ message.text }}</p>
        <AttachmentView v-if="message.attachment" :attachment="message.attachment" class="mb-2" />

        <div v-if="incoming(message)" class="d-flex flex-wrap ga-2">
          <SendMessage :reply-to="message" />
          <v-btn
            v-if="message.attachment"
            variant="text"
            color="buttons"
            size="small"
            class="text-none"
            prepend-icon="mdi-content-save-outline"
            :disabled="savedIds.includes(message.id)"
            @click="save(message)"
          >
            {{
              savedIds.includes(message.id)
                ? text.saved
                : message.attachment.kind === 'topic'
                  ? text.saveTopic
                  : text.saveNote
            }}
          </v-btn>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import SendMessage from '@/components/messages/SendMessage.vue'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError, type Message } from '@/stores/worker'
import { format } from '@/utils/format'
import { saveAttachment } from '@/utils/saveAttachment'

/** Messages between ministers of the last day: what one got and what one sent */
const worker = useWorkerStore()
const user = useUserStore()
const { admin, messages: text, publish } = storeToRefs(useLanguageStore())

const busy = ref(false)
const error = ref('')
const savedIds = ref<string[]>([])

const incoming = (message: Message) => message.toUid === user.uid

const time = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })

async function run(action: () => Promise<void>) {
  error.value = ''
  try {
    await action()
  } catch (cause) {
    const reason =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
    error.value = format(text.value.failed, { name: reason })
  }
}

/** the messages are read once they are on the screen */
async function load() {
  if (!worker.canReceive) return
  busy.value = true
  await run(async () => {
    await worker.loadMessages()
    await Promise.all(
      worker.messages.filter((message) => incoming(message) && !message.readAt).map(worker.markRead)
    )
  })
  busy.value = false
}

const save = (message: Message) =>
  run(async () => {
    if (!message.attachment) return
    await saveAttachment(message.attachment)
    savedIds.value = [...savedIds.value, message.id]
  })

onMounted(load)
// the rights come from the worker after the page may already be open
watch(() => worker.canReceive, load)
</script>

<style scoped>
.messages-title {
  font-size: 18px;
  color: rgb(var(--v-theme-primary));
}

.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 16px;
}

.message {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 10px 14px;
  margin-bottom: 10px;
}

.message--incoming {
  background: var(--app-surface);
}

.message--unread {
  border-color: rgb(var(--v-theme-secondary));
}

.message__who {
  font-weight: 600;
}

.message__text {
  white-space: pre-wrap;
  margin: 4px 0 8px;
}
</style>
