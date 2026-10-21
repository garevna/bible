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
      <!-- the private channel of the pictures: connected once, by its button -->
      <p v-if="posts.storage" class="muted mb-3">
        <v-icon icon="mdi-image-multiple-outline" size="small" />
        {{ format(text.storageOn, { name: posts.storage.title }) }}
      </p>
      <v-alert v-else type="info" variant="tonal" class="mb-3">
        <p>{{ text.storageOff }}</p>
        <ol class="storage-steps">
          <li>{{ text.storageStep1 }}</li>
          <li>
            {{
              posts.channelBot
                ? format(text.storageStep2Named, { bot: posts.channelBot, channel: posts.channel })
                : text.storageStep2
            }}
          </li>
          <li>{{ text.storageStep3 }}</li>
        </ol>
        <v-btn variant="flat" color="primary" class="text-none mt-2" :loading="busy" @click="connectStorage">
          {{ text.storageConnect }}
        </v-btn>
      </v-alert>
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
      <p v-if="!posts.myTasks.length && !posts.canApprove" class="muted">{{ text.noneTasks }}</p>
      <h3 v-if="posts.myTasks.length" class="label mb-2">{{ text.tasksForMe }}</h3>
      <article v-for="task of posts.myTasks" :key="task.id" class="task">
        <p class="task__text">{{ task.text }}</p>
        <p v-if="task.due" class="due" :class="{ 'due--late': task.due <= today }">
          {{ format(text.taskDue, { day: dayText(task.due) }) }}
        </p>
        <p class="muted">
          {{ format(text.taskFrom, { name: task.byName }) }}
          <template v-if="task.approverName">
            · {{ format(text.approver, { name: task.approverName }) }}</template
          >
        </p>
        <v-btn
          v-if="task.kind === 'image'"
          variant="flat"
          color="primary"
          class="text-none mt-1"
          prepend-icon="mdi-image-plus"
          @click="pickPicture(task)"
        >
          {{ text.uploadPicture }}
        </v-btn>
        <p v-else class="hint mb-0">{{ text.taskHow }}</p>
      </article>

      <!-- a pastor: the tasks given, and a new one by its own button -->
      <template v-if="posts.canApprove">
        <div class="d-flex align-center ga-2 mt-4 mb-2">
          <h3 class="label flex-grow-1">{{ text.givenTasks }}</h3>
          <v-btn
            variant="flat"
            color="primary"
            class="text-none"
            prepend-icon="mdi-plus-thick"
            @click="newTask"
          >
            {{ text.newTask }}
          </v-btn>
        </div>
        <p v-if="!posts.givenTasks.length" class="muted">{{ text.noneGiven }}</p>
        <article v-for="task of posts.givenTasks" :key="task.id" class="task">
          <div class="d-flex align-center ga-2">
            <span class="flex-grow-1">
              {{ task.text }} — {{ task.assigneeName }}
              <template v-if="task.due"> · {{ format(text.taskDue, { day: dayText(task.due) }) }}</template>
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

    <!-- a new task: to whom, what, who approves, until when; sent by its button -->
    <AppDialog v-model="taskDialog" :title="text.newTask" icon="mdi-clipboard-text-outline" max-width="560">
      <div class="form">
        <v-autocomplete
          v-model="assigneeUid"
          :items="posts.people"
          item-title="name"
          item-value="uid"
          :label="text.assignee"
          density="compact"
          hide-details
        />
        <v-btn-toggle
          v-model="taskKind"
          mandatory
          divided
          density="comfortable"
          color="secondary"
          variant="outlined"
        >
          <v-btn value="post" class="text-none" prepend-icon="$note">{{ text.kindPost }}</v-btn>
          <v-btn value="image" class="text-none" prepend-icon="mdi-image-outline">{{ text.kindImage }}</v-btn>
        </v-btn-toggle>
        <v-text-field v-model="taskText" :label="text.taskText" density="compact" hide-details />
        <v-select
          v-model="taskApprover"
          :items="taskApproverItems"
          :label="text.whoApproves"
          density="compact"
          hide-details
        />
        <DateField v-model="taskDue" :label="text.taskDueLabel" clearable density="compact" hide-details />
      </div>
      <template #actions>
        <DialogButtons
          :confirm-text="text.send"
          :disabled="!assigneeUid || !(taskText ?? '').trim() || busy"
          @cancel="taskDialog = false"
          @confirm="giveTask"
        />
      </template>
    </AppDialog>

    <!-- a picture for a task: seen before it is sent -->
    <AppDialog v-model="pictureDialog" :title="text.uploadPicture" icon="mdi-image-plus" max-width="560">
      <template v-if="picturing">
        <p class="mb-2">«{{ picturing.text }}»</p>
        <img v-if="picture" :src="picture" alt="" class="preview" />
        <v-btn
          variant="text"
          class="text-none mt-2"
          prepend-icon="mdi-image-edit-outline"
          @click="choosePicture"
        >
          {{ text.otherPicture }}
        </v-btn>
      </template>
      <template #actions>
        <DialogButtons
          :confirm-text="text.send"
          :disabled="!picture || busy"
          @cancel="pictureDialog = false"
          @confirm="sendPicture"
        />
      </template>
    </AppDialog>

    <!-- a picture sent: to whom it goes now -->
    <AppDialog
      v-model="pictureSentDialog"
      :title="text.pictureSentTitle"
      icon="mdi-check-circle-outline"
      max-width="480"
    >
      <p class="lead">{{ pictureSentText }}</p>
      <template #actions>
        <v-spacer />
        <v-btn variant="flat" color="primary" class="text-none px-6" @click="pictureSentDialog = false">{{
          text.taskOk
        }}</v-btn>
      </template>
    </AppDialog>

    <!-- the private channel connected -->
    <AppDialog
      v-model="storageDialog"
      :title="text.storageConnected"
      icon="mdi-check-circle-outline"
      max-width="480"
    >
      <p class="lead">{{ format(text.storageOn, { name: posts.storage?.title ?? '' }) }}</p>
      <template #actions>
        <v-spacer />
        <v-btn variant="flat" color="primary" class="text-none px-6" @click="storageDialog = false">{{
          text.taskOk
        }}</v-btn>
      </template>
    </AppDialog>

    <!-- a task sent: what, to whom, approved by whom, until when -->
    <AppDialog
      v-model="taskSentDialog"
      :title="text.taskSentTitle"
      icon="mdi-check-circle-outline"
      max-width="480"
    >
      <template v-if="sentTask">
        <p class="lead">{{ format(text.taskSentLead, { name: sentTask.assigneeName }) }}</p>
        <p class="mt-2">«{{ sentTask.text }}»</p>
        <p v-if="sentTask.due" class="mt-2">{{ format(text.taskDue, { day: dayText(sentTask.due) }) }}</p>
        <p class="mt-2">
          {{
            sentTask.approverName ? format(text.approver, { name: sentTask.approverName }) : text.noApproval
          }}
        </p>
        <p class="muted mt-2">{{ text.taskSentNext }}</p>
      </template>
      <template #actions>
        <v-spacer />
        <v-btn variant="flat" color="primary" class="text-none px-6" @click="taskSentDialog = false">
          {{ text.taskOk }}
        </v-btn>
      </template>
    </AppDialog>

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
import DateField from '@/components/DateField.vue'
import PostCard from '@/components/posts/PostCard.vue'
import { useLanguageStore } from '@/stores/language'
import { usePostsStore, type PostTask, type Submission } from '@/stores/posts'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { fullDateFormat, localeOf, toISODateString } from '@/utils/dates'
import { format } from '@/utils/format'
import { pickImage, resizeImage } from '@/utils/image'

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
const publish = (item: Submission, image: string | null, imageFrom: string | null) =>
  run(async () => {
    // the window that says where it went shows the texts (the picture is in the channel)
    const { messages, caption } = await worker.preview({ ...item.post, image: undefined })
    await posts.publish(item.id, image, imageFrom, [...(caption ? [caption] : []), ...messages])
  })

/** the private channel of the pictures: the worker finds it among the updates of the bot */
const storageDialog = ref(false)
const connectStorage = () =>
  run(async () => {
    try {
      await posts.connectStorage()
      storageDialog.value = true
    } catch (cause) {
      throw cause instanceof WorkerError && cause.message === 'no-storage'
        ? new WorkerError(text.value.storageNotFound)
        : cause
    }
  })

/** a picture asked by a task: chosen on the device, seen, sent */
const pictureDialog = ref(false)
const picturing = shallowRef<PostTask | null>(null)
const picture = ref<string | null>(null)
async function choosePicture() {
  const file = await pickImage()
  if (!file) return
  try {
    picture.value = await resizeImage(file, { size: 1600 })
  } catch {
    // not a picture the browser reads: said plainly
    error.value = text.value.badPicture
  }
}
async function pickPicture(task: PostTask) {
  picturing.value = task
  picture.value = null
  await choosePicture()
  if (picture.value) pictureDialog.value = true
}
const pictureSentDialog = ref(false)
const pictureSentText = ref('')
const sendPicture = () =>
  run(async () => {
    const task = picturing.value!
    pictureDialog.value = false
    await posts.sendPicture(task, picture.value!)
    pictureSentText.value = task.approverName
      ? format(text.value.pictureSentApprover, { name: task.approverName })
      : text.value.pictureSentQueue
    pictureSentDialog.value = true
  })

const assigneeUid = ref<string | null>(null)
const taskText = ref('')
const taskApprover = ref<string>('')
/** a post (a note or a topic) or a picture */
const taskKind = ref<'post' | 'image'>('post')
const taskApproverItems = computed(() => [
  { value: '', title: text.value.noApproval },
  ...posts.approvers.map((person) => ({ value: person.uid, title: person.name }))
])
/** sent: a word that it is, under the button */
const user = useUserStore()
const today = toISODateString(new Date())
/** "31 грудня 2026 р." */
const dayText = (day: string) => fullDateFormat(new Date(`${day}T12:00:00`), localeOf(user.lang))

/** the last day of the task, if any */
const taskDue = ref<string | null>(null)
/** sent: a window says what went to whom */
const taskSentDialog = ref(false)
const sentTask = shallowRef<PostTask | null>(null)
/** the window of a new task, empty */
const taskDialog = ref(false)
function newTask() {
  assigneeUid.value = null
  taskText.value = ''
  taskApprover.value = ''
  taskDue.value = null
  taskKind.value = 'post'
  taskDialog.value = true
}

const giveTask = () =>
  assigneeUid.value &&
  (taskText.value ?? '').trim() &&
  run(async () => {
    taskDialog.value = false
    sentTask.value = await posts.createTask(
      assigneeUid.value!,
      taskText.value.trim(),
      taskApprover.value || null,
      taskDue.value,
      taskKind.value
    )
    taskText.value = ''
    assigneeUid.value = null
    taskDue.value = null
    taskSentDialog.value = true
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

.lead {
  font-size: 16px;
  font-weight: 600;
}

.due {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-secondary));
  margin-bottom: 2px;
}

.due--late {
  color: rgb(var(--v-theme-delete));
}

.storage-steps {
  padding-left: 20px;
  margin: 6px 0;
}

.preview {
  display: block;
  max-width: 100%;
  max-height: 320px;
  border-radius: var(--app-radius);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
