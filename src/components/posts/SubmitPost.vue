<template>
  <ButtonTooltip
    icon="mdi-send-check-outline"
    :text="text.submit"
    color="secondary"
    :large="!small"
    :small="small"
    @click="openDialog"
  />

  <AppDialog v-model="open" :title="text.submit" icon="mdi-send-check-outline" max-width="640">
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-3" />
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>

    <!-- sent: what happens next -->
    <v-alert v-if="sent" type="success" variant="tonal" class="mb-3">{{ sentText }}</v-alert>

    <template v-else-if="post">
      <!-- a post asked by a pastor: who approves it comes with it -->
      <v-select
        v-if="posts.myTasks.length"
        v-model="taskId"
        :items="taskItems"
        :label="text.forTask"
        clearable
        density="compact"
        class="mb-2"
      />
      <v-select
        v-if="!taskId"
        v-model="approverUid"
        :items="approverItems"
        :label="text.whoApproves"
        density="compact"
        class="mb-2"
      />
      <p class="hint">{{ text.previewHint }}</p>
      <AttachmentView :attachment="{ kind, post }" />
    </template>

    <template #actions>
      <v-spacer />
      <v-btn v-if="sent" variant="flat" color="primary" class="text-none px-6" @click="open = false">
        {{ common.close }}
      </v-btn>
      <DialogButtons
        v-else
        :confirm-text="text.send"
        :disabled="busy || !post || !ready"
        @cancel="open = false"
        @confirm="send"
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
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import { usePostsStore } from '@/stores/posts'
import { WorkerError } from '@/stores/worker'
import type { TopicPost } from '@/utils/topicPost'

/**
 * A note or a topic sent for the public channel: a pastor who decides approves it (when the author
 * does not decide), then the administrator of the channel publishes it
 */
const props = defineProps<{
  build: () => TopicPost | Promise<TopicPost>
  kind: 'note' | 'topic'
  small?: boolean
}>()

const posts = usePostsStore()
const { posts: text, common, publish } = storeToRefs(useLanguageStore())

const open = ref(false)
const busy = ref(false)
const error = ref('')
const sent = ref(false)
const post = shallowRef<TopicPost | null>(null)
/** '' : no approval needed */
const approverUid = ref<string | null>(null)
const taskId = ref<string | null>(null)

/** the ones who decide need nobody: that comes first for them */
const decides = computed(() => posts.canApprove || posts.canPublish)
const approverItems = computed(() => [
  ...(decides.value ? [{ value: '', title: text.value.noApproval }] : []),
  ...posts.approvers.map((person) => ({ value: person.uid, title: person.name }))
])
const taskItems = computed(() =>
  posts.myTasks.map((task) => ({ value: task.id, title: `${task.text} (${task.byName})` }))
)
const ready = computed(() => Boolean(taskId.value) || approverUid.value !== null)

const sentText = computed(() =>
  approverUid.value && !taskId.value ? text.value.sentForApproval : text.value.sentToQueue
)

async function openDialog() {
  open.value = true
  sent.value = false
  error.value = ''
  post.value = null
  taskId.value = null
  busy.value = true
  try {
    const [built] = await Promise.all([props.build(), posts.load()])
    post.value = built
    // the likely choice: none for the ones who decide, the only pastor for the others
    approverUid.value = decides.value ? '' : posts.approvers.length === 1 ? posts.approvers[0]!.uid : null
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
}

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function send() {
  busy.value = true
  error.value = ''
  try {
    await posts.submit(props.kind, post.value!, taskId.value ? null : approverUid.value || null, taskId.value)
    sent.value = true
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 8px;
}
</style>
