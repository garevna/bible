<template>
  <AppDialog v-model="open" :title="heading" icon="mdi-book-open-page-variant-outline" max-width="680">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />

    <!-- written: the title, the day, the words, the verses of one's own note or topic, a video, a picture -->
    <div v-if="editing" class="form">
      <v-text-field v-model="draft.title" :label="text.topicTitle" density="compact" hide-details />
      <DateField v-model="draft.day" :label="text.topicDay" density="compact" clearable class="day" />
      <v-textarea
        v-model="draft.words"
        :label="text.topicText"
        rows="3"
        auto-grow
        density="compact"
        hide-details
      />
      <div v-if="draft.extra.length" class="extra">
        <span class="muted">{{ text.topicVerses }}</span>
        <ButtonTooltip icon="mdi-minus-circle-outline" :text="common.delete" @click="draft.extra = []" />
        <AttachmentView :attachment="{ kind: 'topic', post: { title: '', items: draft.extra } }" />
      </div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn variant="tonal" color="buttons" class="text-none" prepend-icon="$note" @click="pick('note')">
          {{ calendar.pickMyNote }}
        </v-btn>
        <v-btn variant="tonal" color="buttons" class="text-none" prepend-icon="$topic" @click="pick('topic')">
          {{ calendar.pickMyTopic }}
        </v-btn>
        <v-btn
          v-if="!draft.video"
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-youtube"
          @click="pickingVideo = true"
        >
          {{ calendar.pasteVideo }}
        </v-btn>
        <v-btn
          v-if="!draft.image"
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-image-plus"
          @click="addPicture"
        >
          {{ calendar.choosePicture }}
        </v-btn>
      </div>
      <div v-if="draft.video" class="d-flex align-center ga-2">
        <VideoLink :url="draft.video" />
        <ButtonTooltip icon="mdi-minus-circle-outline" :text="text.removeVideo" @click="draft.video = null" />
      </div>
      <div v-if="draft.image" class="d-flex align-start ga-2">
        <StoredImage :src="draft.image" class="picture" />
        <ButtonTooltip icon="mdi-minus-circle-outline" :text="text.removePicture" @click="draft.image = ''" />
      </div>
    </div>

    <!-- the topic as it is -->
    <div v-else-if="topic" class="topic">
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <v-chip v-if="topic.recommended" size="small" variant="tonal" color="secondary">
          {{ text.recommended }}
        </v-chip>
        <v-chip v-else size="small" variant="tonal" :color="stateColor[topic.status]">
          {{ stateText(topic.status) }}
        </v-chip>
        <span v-if="topic.day" class="muted">{{ formatDay(topic.day, locale) }}</span>
        <span class="muted">{{ format(calendar.byName, { name: topic.name }) }}</span>
        <v-spacer />
        <ButtonTooltip v-if="changes" icon="$editNote" :text="text.edit" @click="startEdit" />
        <ConfirmButton
          v-if="changes"
          icon="mdi-delete-outline"
          :text="text.deleteTopic"
          @confirm="removeTopic"
        />
      </div>
      <AttachmentView
        v-if="topic.post.items.length"
        :attachment="{ kind: 'topic', post: { ...topic.post, image: undefined } }"
        class="body"
      />
      <VideoLink v-if="topic.video" :url="topic.video" class="mt-2" />
      <StoredImage v-if="topic.post.image" :src="topic.post.image" class="picture mt-2" />
      <p v-if="topic.status === 'returned' && topic.reviewNote" class="returned">
        {{ format(calendar.returnedBy, { name: topic.reviewedBy ?? '' }) }} {{ topic.reviewNote }}
      </p>

      <!-- the pastor: approve, or return with a word -->
      <div v-if="topics.may.review && topic.status !== 'approved'" class="section">
        <template v-if="returning">
          <v-textarea
            v-model="returnNote"
            :label="calendar.returnNote"
            rows="2"
            auto-grow
            density="compact"
            hide-details
            class="mb-2"
          />
          <div class="d-flex flex-wrap ga-2 justify-end">
            <v-btn variant="text" class="text-none" @click="returning = false">{{ common.cancel }}</v-btn>
            <v-btn
              variant="flat"
              color="delete"
              class="text-none"
              :disabled="busy || !returnNote.trim()"
              @click="review(false)"
            >
              {{ calendar.returnToAuthor }}
            </v-btn>
          </div>
        </template>
        <div v-else class="d-flex flex-wrap ga-2">
          <v-btn
            variant="flat"
            color="primary"
            class="text-none"
            prepend-icon="mdi-check"
            :disabled="busy"
            @click="review(true)"
          >
            {{ calendar.approveMaterial }}
          </v-btn>
          <v-btn
            v-if="topic.status === 'pending'"
            variant="tonal"
            color="delete"
            class="text-none"
            prepend-icon="mdi-undo"
            @click="startReturn"
          >
            {{ calendar.returnMaterial }}
          </v-btn>
        </div>
      </div>

      <!-- the ministry of the groups: to the leaders of all or some groups -->
      <div v-if="topics.may.prepare" class="section">
        <p class="heading">{{ text.sendHeading }}</p>
        <p v-if="topic.status !== 'approved'" class="muted">{{ text.sendAfterApproval }}</p>
        <template v-else>
          <p v-if="topic.sentTo.length" class="muted">
            {{ format(text.sentCount, { count: topic.sentTo.length }) }} ·
            {{ format(text.doneCount, { count: Object.keys(topic.done).length }) }}
          </p>
          <TransferList
            v-model="chosen"
            :items="groupItems"
            :left-label="text.chooseGroups"
            :right-label="text.chosenGroups"
            searchable
            class="mb-2"
          />
          <div class="d-flex justify-end">
            <v-btn
              variant="flat"
              color="primary"
              class="text-none"
              prepend-icon="mdi-send-outline"
              :disabled="busy || !chosen.length"
              @click="send"
            >
              {{ text.sendButton }}
            </v-btn>
          </div>
        </template>
      </div>

      <!-- the leader of a group: done in the group; the topic one's own -->
      <div v-if="groupId && topics.led.includes(groupId)" class="section d-flex flex-wrap align-center ga-2">
        <v-checkbox
          :model-value="Boolean(topic.done[groupId])"
          :label="text.topicDone"
          color="secondary"
          density="compact"
          hide-details
          :disabled="busy"
          @update:model-value="(value) => markDone(Boolean(value))"
        />
        <v-spacer />
        <v-btn
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-content-save-outline"
          :disabled="busy || saved"
          @click="saveToMine"
        >
          {{ saved ? text.topicSaved : text.saveTopicToMine }}
        </v-btn>
      </div>
    </div>

    <template #actions>
      <DialogButtons
        v-if="editing"
        :confirm-text="common.save"
        :disabled="busy || !draft.title.trim()"
        @cancel="cancelEdit"
        @confirm="save"
      />
      <template v-else>
        <v-spacer />
        <v-btn variant="flat" color="primary" class="text-none px-6" @click="open = false">
          {{ common.close }}
        </v-btn>
      </template>
    </template>
  </AppDialog>

  <!-- sent: how many leaders got it -->
  <AppDialog v-model="sentDone" :title="text.sendHeading" icon="mdi-check-circle-outline" max-width="480">
    <p class="lead">{{ sentText }}</p>
    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="sentDone = false">OK</v-btn>
    </template>
  </AppDialog>

  <MaterialPicker v-model="picking" :kind="pickKind" @picked="picked" />
  <VideoDialog v-model="pickingVideo" @picked="(url: string) => (draft.video = url)" />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DateField from '@/components/DateField.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import TransferList from '@/components/TransferList.vue'
import MaterialPicker from '@/components/calendar/MaterialPicker.vue'
import VideoDialog from '@/components/calendar/VideoDialog.vue'
import VideoLink from '@/components/groups/VideoLink.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import StoredImage from '@/components/posts/StoredImage.vue'
import { useGroupTopicsStore, type GroupTopic, type TopicStatus } from '@/stores/groupTopics'
import { groupTitle, useGroupsStore } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { formatDay, localeOf } from '@/utils/dates'
import { format } from '@/utils/format'
import { pickImage, resizeImage } from '@/utils/image'
import { saveAttachment } from '@/utils/saveAttachment'
import type { TopicPost, TopicPostItem } from '@/utils/topicPost'

/**
 * A topic of the meetings of the home groups: written (a new one, or changed), approved or returned by
 * the pastor, sent to the leaders of the groups; the leader of a group marks it done and keeps it.
 */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{
  /** null: a new topic */
  topicId: string | null
  /** a new topic of a pastor: a recommendation */
  recommend?: boolean
  /** opened from a group its leader leads */
  groupId?: string
}>()
const emit = defineEmits<{ created: [topic: GroupTopic] }>()

const topics = useGroupTopicsStore()
const groups = useGroupsStore()
const user = useUserStore()
const worker = useWorkerStore()
const { groups: text, calendar, common, publish } = storeToRefs(useLanguageStore())
const locale = computed(() => localeOf(user.lang))

const topic = computed(() => topics.topics.find((item) => item.id === props.topicId) ?? null)
const heading = computed(() =>
  topic.value ? topic.value.title : props.recommend ? text.value.recommendTopic : text.value.newTopic
)
/** the author, the ministry of the groups, the pastor */
const changes = computed(
  () => Boolean(topic.value) && (topic.value!.uid === user.uid || topics.may.prepare || topics.may.review)
)

const stateColor = { approved: 'primary', pending: 'calendar-orange', returned: 'delete' } as const
const stateText = (state: TopicStatus) =>
  ({
    approved: calendar.value.statusApproved,
    pending: calendar.value.statusPending,
    returned: calendar.value.statusReturned
  })[state]

const busy = ref(false)
const error = ref('')
const editing = ref(false)
const draft = reactive({
  title: '',
  day: null as string | null,
  words: '',
  /** the verses and the notes of one's own note or topic */
  extra: [] as TopicPostItem[],
  video: null as string | null,
  image: ''
})

const returning = ref(false)
const returnNote = ref('')
const chosen = ref<string[]>([])
const sentDone = ref(false)
const sentText = ref('')
const saved = ref(false)

function fill(item: GroupTopic | null) {
  const [first, ...rest] = item?.post.items ?? []
  // the words written here are the first note, without verses
  const written = first?.kind === 'note' && !first.verses.length ? first.text : ''
  Object.assign(draft, {
    title: item?.title ?? '',
    day: item?.day ?? null,
    words: written,
    extra: item ? (written ? rest : item.post.items) : [],
    video: item?.video ?? null,
    image: item?.post.image ?? ''
  })
}

watch(open, (value) => {
  if (!value) return
  error.value = ''
  returning.value = false
  saved.value = false
  chosen.value = []
  editing.value = !props.topicId
  fill(topic.value)
})

const startEdit = () => {
  fill(topic.value)
  editing.value = true
}
const cancelEdit = () => (topic.value ? (editing.value = false) : (open.value = false))

/** the groups with a leader of the app; the ones that got it already are not chosen again */
const groupItems = computed(() =>
  groups.groups
    .filter((group) => group.leaderUid && !group.unregistered)
    .map((group) => ({
      value: group.id,
      title: groupTitle(group),
      disabled: Boolean(topic.value?.sentTo.includes(group.id))
    }))
)

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    return true
  } catch (cause) {
    error.value =
      cause instanceof WorkerError && cause.message === 'no-storage'
        ? calendar.value.noStorage
        : cause instanceof WorkerError && cause.message !== 'unreachable'
          ? format(calendar.value.failed, { name: cause.message })
          : publish.value.unreachable
    return false
  } finally {
    busy.value = false
  }
}

const pickKind = ref<'note' | 'topic'>('note')
const picking = ref(false)
function pick(kind: 'note' | 'topic') {
  pickKind.value = kind
  picking.value = true
}
/** one's own note or topic: its verses and notes; its title, when the topic has none yet */
function picked(post: TopicPost) {
  draft.extra = [...draft.extra, ...post.items]
  if (!draft.title.trim() && post.title) draft.title = post.title
}

const pickingVideo = ref(false)

/** a picture of the device: kept in the private channel of the pictures */
async function addPicture() {
  const file = await pickImage()
  if (!file) return
  await run(async () => {
    const image = await resizeImage(file, { size: 1600 })
    draft.image = (await worker.request<{ image: string }>('POST', '/posts/upload', { image })).image
  })
}

async function save() {
  const words = draft.words.trim()
  const post: TopicPost = {
    title: draft.title.trim(),
    items: [...(words ? [{ kind: 'note' as const, text: words, verses: [] }] : []), ...draft.extra],
    ...(draft.image ? { image: draft.image } : {})
  }
  const written = { title: post.title, day: draft.day || null, post, video: draft.video }
  let created: GroupTopic | null = null
  const done = await run(async () => {
    if (topic.value) await topics.update(topic.value.id, written)
    else created = await topics.create(written, props.recommend)
  })
  if (!done) return
  editing.value = false
  if (created) emit('created', created)
}

function startReturn() {
  returning.value = true
  returnNote.value = ''
}

async function review(approve: boolean) {
  if (await run(() => topics.review(topic.value!.id, approve, approve ? '' : returnNote.value.trim())))
    returning.value = false
}

async function send() {
  const count = chosen.value.length
  if (!(await run(() => topics.send(topic.value!.id, chosen.value)))) return
  chosen.value = []
  sentText.value = format(text.value.sentDone, { count })
  sentDone.value = true
}

async function removeTopic() {
  if (await run(() => topics.remove(topic.value!.id))) open.value = false
}

const markDone = (done: boolean) => run(() => topics.mark(topic.value!.id, props.groupId!, done))

/** the leader keeps it among their own topics, with its verses and notes */
async function saveToMine() {
  const post = topic.value!.post
  if (await run(() => saveAttachment({ kind: 'topic', post: { title: post.title, items: post.items } })))
    saved.value = true
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day {
  max-width: 280px;
}

.extra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.extra > :last-child {
  flex-basis: 100%;
}

.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}

.heading {
  font-weight: 600;
  margin: 0 0 4px;
}

.picture {
  max-width: 420px;
}

/* the title is the window's */
.body :deep(.attachment__kind) {
  display: none;
}

.returned {
  color: rgb(var(--v-theme-delete));
  font-size: 14px;
  margin: 6px 0 0;
}

.section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: solid 1px var(--app-border-light);
}

.lead {
  font-size: 16px;
}
</style>
