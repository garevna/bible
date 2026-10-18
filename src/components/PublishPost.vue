<template>
  <ButtonTooltip
    icon="$publish"
    :text="text.toTelegram"
    color="secondary"
    :large="!small"
    :small="small"
    @click="openDialog"
  />

  <AppDialog v-model="open" :title="text.toTelegram" icon="$publish" max-width="640">
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-4" />

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
    <template v-if="messages.length">
      <p class="hint">{{ text.previewHint }}</p>
      <p v-if="messages.length > 1" class="hint">{{ format(text.messages, { count: messages.length }) }}</p>
      <!-- Telegram HTML: the worker escapes the texts, the tags are b, i and blockquote -->
      <!-- a picture goes first, as a photo with the title -->
      <div v-if="post?.image" class="telegram-message telegram-photo">
        <img :src="post.image" alt="" />
        <div v-if="caption" class="telegram-caption" v-html="caption" />
      </div>
      <div v-for="(message, index) of previews" :key="index" class="telegram-message" v-html="message" />
    </template>

    <template #actions>
      <DialogButtons
        :confirm-text="text.publishButton"
        :disabled="busy || !messages.length"
        @cancel="open = false"
        @confirm="publishPost"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'
import type { TopicPost } from '@/utils/topicPost'

/**
 * A post of the Telegram channel (a topic, a note), previewed and then posted.
 * build: makes the post when the dialog opens, from what is on the page right now.
 */
const props = defineProps<{ build: () => TopicPost | Promise<TopicPost>; small?: boolean }>()

const worker = useWorkerStore()
const { publish: text } = storeToRefs(useLanguageStore())

const open = ref(false)
const busy = ref(false)
const messages = ref<string[]>([])
const caption = ref<string | null>(null)
const error = ref('')

/** the quotes are blocks here, so the empty lines around them would double the gaps */
const previews = computed(() =>
  messages.value.map((message) => message.replace(/\n*(<\/?blockquote>)\n*/g, '$1'))
)

const post = shallowRef<TopicPost | null>(null)

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : text.value.unreachable

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
  post.value = null
  run(async () => {
    const built = await props.build()
    if (!built.items.length) {
      error.value = text.value.emptyTopic
      return
    }
    post.value = built
    ;({ messages: messages.value, caption: caption.value } = await worker.preview(built))
  })
}

const publishPost = () =>
  run(async () => {
    if (!post.value) return
    // the caption of the picture goes first
    await worker.publishToTelegram(post.value, [...(caption.value ? [caption.value] : []), ...messages.value])
    // ChannelPostDialog says where it went
    open.value = false
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

.telegram-photo {
  padding: 0;
  overflow: hidden;
}

.telegram-photo img {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: cover;
}

.telegram-caption {
  padding: 8px 16px;
}

.telegram-message :deep(blockquote) {
  border-left: solid 3px rgb(var(--v-theme-secondary));
  background: rgb(var(--v-theme-secondary) / 8%);
  border-radius: 4px;
  padding: 6px 10px;
  margin: 12px 0;
}
</style>
