<template>
  <div class="page mx-auto" style="max-width: 860px">
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      closable
      class="mb-3"
      @click:close="error = ''"
    >
      {{ error }}
    </v-alert>
    <p class="hint">{{ text.pageHint }}</p>

    <!-- the tabs of the user: their own, to approve (the pastors), the queue (the channel), the tasks -->
    <v-tabs v-model="tab" color="secondary" grow class="mb-3">
      <v-tab value="mine">{{ text.tabMine }}</v-tab>
      <v-tab v-if="posts.canApprove" value="approve">
        {{ text.tabApprove }}
        <v-badge v-if="posts.toApprove.length" :content="posts.toApprove.length" color="warning" inline />
      </v-tab>
      <v-tab v-if="posts.canPublish" value="queue">
        {{ text.tabQueue }}
        <v-badge v-if="ready.length" :content="ready.length" color="warning" inline />
      </v-tab>
      <v-tab value="tasks">
        {{ text.tabTasks }}
        <v-badge v-if="posts.myTasks.length" :content="posts.myTasks.length" color="warning" inline />
      </v-tab>
    </v-tabs>
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />

    <template v-if="tab === 'mine'">
      <p v-if="!posts.mine.length" class="muted">{{ text.noneMine }}</p>
      <PostCard
        v-for="item of posts.mine"
        :key="item.id"
        :item="item"
        mode="mine"
        @remove="(post) => run(() => posts.remove(post.id))"
      />
    </template>

    <template v-else-if="tab === 'approve'">
      <p v-if="!posts.toApprove.length" class="muted">{{ text.noneToApprove }}</p>
      <PostCard
        v-for="item of posts.toApprove"
        :key="item.id"
        :item="item"
        mode="approve"
        :busy="busy"
        @approve="(post) => run(() => posts.approve(post.id))"
        @return="askReturn"
      />
    </template>

    <template v-else-if="tab === 'queue'">
      <p v-if="!posts.queue.length" class="muted">{{ text.noneInQueue }}</p>
      <PostCard
        v-for="item of posts.queue"
        :key="item.id"
        :item="item"
        mode="queue"
        :busy="busy"
        @return="askReturn"
        @publish="publish"
      />
    </template>

    <template v-else>
      <!-- the tasks of the user: prepared as a note or a topic, then sent with this task chosen -->
      <p v-if="!posts.myTasks.length" class="muted">{{ text.noneTasks }}</p>
      <article v-for="task of posts.myTasks" :key="task.id" class="task">
        <p class="task__text">{{ task.text }}</p>
        <p class="muted">
          {{ format(text.taskFrom, { name: task.byName }) }}
          <template v-if="task.approverName">
            · {{ format(text.approver, { name: task.approverName }) }}</template
          >
        </p>
        <p class="hint mb-0">{{ text.taskHow }}</p>
      </article>

      <!-- a pastor asks a servant to prepare a post -->
      <template v-if="posts.canApprove">
        <h3 class="label mt-4">{{ text.giveTask }}</h3>
        <div class="d-flex flex-wrap ga-2">
          <v-autocomplete
            v-model="assigneeUid"
            :items="posts.people"
            item-title="name"
            item-value="uid"
            :label="text.assignee"
            density="compact"
            hide-details
            class="field"
          />
          <v-select
            v-model="taskApprover"
            :items="taskApproverItems"
            :label="text.whoApproves"
            density="compact"
            hide-details
            class="field"
          />
        </div>
        <v-text-field v-model="taskText" :label="text.taskText" density="compact" hide-details class="mt-2" />
        <!-- a form of three fields: one clear button sends it -->
        <div class="d-flex flex-wrap align-center ga-2 mt-2">
          <v-btn
            variant="flat"
            color="primary"
            class="text-none px-6"
            prepend-icon="mdi-send"
            :disabled="!assigneeUid || !(taskText ?? '').trim() || busy"
            :loading="busy"
            @click="giveTask"
          >
            {{ text.giveTaskButton }}
          </v-btn>
          <span v-if="taskSent" class="sent">{{ text.taskSent }}</span>
        </div>
        <article v-for="task of posts.givenTasks" :key="task.id" class="task mt-2">
          <div class="d-flex align-center ga-2">
            <span class="flex-grow-1">
              {{ task.text }} — {{ task.assigneeName }}
              <v-chip
                size="x-small"
                variant="tonal"
                :color="task.status === 'done' ? 'primary' : 'calendar-orange'"
              >
                {{ task.status === 'done' ? text.taskDone : text.taskOpen }}
              </v-chip>
            </span>
            <ConfirmButton
              icon="$unlink"
              :text="text.removeTask"
              @confirm="run(() => posts.removeTask(task.id))"
            />
          </div>
        </article>
      </template>
    </template>

    <!-- the word that returns a post to its author -->
    <AppDialog v-model="returnDialog" :title="text.return" icon="mdi-undo" max-width="480">
      <v-textarea
        v-model="comment"
        :label="text.returnWhy"
        rows="3"
        auto-grow
        density="compact"
        hide-details
      />
      <template #actions>
        <DialogButtons :confirm-text="text.return" @cancel="returnDialog = false" @confirm="sendReturn" />
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import PostCard from '@/components/posts/PostCard.vue'
import { useLanguageStore } from '@/stores/language'
import { usePostsStore, type Submission } from '@/stores/posts'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * The posts of the public channel: the user's own and their states, the ones a pastor approves,
 * the queue the administrator of the channel publishes from, and the posts asked of the servants
 */
const posts = usePostsStore()
const worker = useWorkerStore()
const { posts: text, publish: publishText } = storeToRefs(useLanguageStore())

const tab = ref<'mine' | 'approve' | 'queue' | 'tasks'>('mine')
const busy = ref(false)
const error = ref('')

const ready = computed(() => posts.queue.filter((item) => item.status === 'approved'))

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable'
    ? cause.message
    : publishText.value.unreachable

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
}

onMounted(() =>
  run(async () => {
    await posts.load()
    // the tab of what waits for the user
    if (posts.toApprove.length) tab.value = 'approve'
    else if (ready.value.length) tab.value = 'queue'
    else if (posts.myTasks.length) tab.value = 'tasks'
  })
)

const returnDialog = ref(false)
const returning = shallowRef<Submission | null>(null)
const comment = ref('')
function askReturn(item: Submission) {
  returning.value = item
  comment.value = ''
  returnDialog.value = true
}
function sendReturn() {
  returnDialog.value = false
  run(() => posts.returnPost(returning.value!.id, (comment.value ?? '').trim()))
}

/** the messages the post becomes, shown with the channel once it is published */
const publish = (item: Submission, image: string | null) =>
  run(async () => {
    const { messages, caption } = await worker.preview({ ...item.post, ...(image ? { image } : {}) })
    await posts.publish(item.id, image, [...(caption ? [caption] : []), ...messages])
  })

const assigneeUid = ref<string | null>(null)
const taskText = ref('')
const taskApprover = ref<string>('')
const taskApproverItems = computed(() => [
  { value: '', title: text.value.noApproval },
  ...posts.approvers.map((person) => ({ value: person.uid, title: person.name }))
])
/** sent: a word that it is, under the button */
const taskSent = ref(false)
const giveTask = () =>
  assigneeUid.value &&
  (taskText.value ?? '').trim() &&
  run(async () => {
    taskSent.value = false
    await posts.createTask(assigneeUid.value!, taskText.value.trim(), taskApprover.value || null)
    taskText.value = ''
    assigneeUid.value = null
    taskSent.value = true
  })
</script>

<style scoped>
.hint,
.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}

.hint {
  margin-bottom: 8px;
}

.label {
  font-weight: 600;
  font-size: 15px;
}

.field {
  flex: 1 1 220px;
}

.sent {
  color: rgb(var(--v-theme-primary));
  font-size: 14px;
}

.task {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  padding: 10px 14px;
  margin-bottom: 8px;
}

.task__text {
  font-weight: 600;
  margin-bottom: 2px;
}
</style>
