<template>
  <AppDialog v-model="open" :title="title" icon="mdi-file-document-edit-outline" max-width="640">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />

    <!-- what is there already: seen by all, changed by the person of the role and the approvers -->
    <article v-for="material of mine" :key="material.id" class="material">
      <header class="d-flex align-center ga-2">
        <v-icon
          :icon="iconOf(material)"
          :color="material.kind === 'video' ? '#FF0000' : undefined"
          size="small"
        />
        <span class="flex-grow-1 material__title">{{ material.title || kindTitle }}</span>
        <span class="by">{{ format(text.byName, { name: material.name }) }}</span>
        <ButtonTooltip
          v-if="mayChange(material) && editable(material) && editing !== material.id"
          icon="mdi-pencil-outline"
          :text="text.editMaterial"
          @click="startEdit(material)"
        />
        <ConfirmButton
          v-if="mayChange(material)"
          icon="$unlink"
          :text="text.removeMaterial"
          @confirm="run(() => schedule.deleteMaterial(material.id))"
        />
      </header>

      <!-- a note or a topic changed: its title and the words of its notes (the verses stay) -->
      <template v-if="editing === material.id">
        <v-text-field
          v-if="material.kind === 'topic'"
          v-model="draftTitle"
          :label="text.topicTitle"
          density="compact"
          class="mt-2"
        />
        <v-textarea
          v-for="(_, index) of draftTexts"
          :key="index"
          v-model="draftTexts[index]"
          :label="material.kind === 'topic' ? text.topicText : text.newNote"
          rows="3"
          auto-grow
          density="compact"
          class="mt-2"
        />
        <div class="d-flex ga-2 justify-end">
          <v-btn variant="text" class="text-none" @click="editing = null">{{ common.cancel }}</v-btn>
          <v-btn
            variant="flat"
            color="primary"
            class="text-none"
            :disabled="busy"
            @click="saveEdit(material)"
          >
            {{ text.saveChanges }}
          </v-btn>
        </div>
      </template>
      <!-- a video: its picture opens it on YouTube -->
      <a
        v-else-if="material.kind === 'video' && material.url"
        :href="material.url"
        target="_blank"
        rel="noopener"
        class="video"
      >
        <img :src="`https://i.ytimg.com/vi/${youTubeId(material.url)}/hqdefault.jpg`" alt="" />
        <v-icon icon="mdi-play-circle" size="56" color="white" class="play" />
      </a>
      <StoredImage
        v-else-if="material.kind === 'image' && material.url"
        :src="material.url"
        class="picture"
      />
      <AttachmentView v-else-if="full[material.id]" :attachment="full[material.id]!" class="mt-1" />
    </article>
    <p v-if="!mine.length" class="muted">{{ text.noMaterials }}</p>

    <!-- something new: a note, a topic, a video, a picture -->
    <template v-if="may">
      <p class="heading">{{ mine.length ? text.addMore : text.addMaterialHeading }}</p>
      <v-tabs v-model="tab" color="secondary" density="compact" grow show-arrows>
        <v-tab value="note" prepend-icon="$note" class="text-none">{{ text.tabNote }}</v-tab>
        <v-tab value="topic" prepend-icon="$topic" class="text-none">{{ text.tabTopic }}</v-tab>
        <v-tab value="video" prepend-icon="mdi-youtube" class="text-none">{{ text.tabVideo }}</v-tab>
        <v-tab value="picture" prepend-icon="mdi-image-outline" class="text-none">{{
          text.tabPicture
        }}</v-tab>
      </v-tabs>
      <v-window v-model="tab" class="pt-3">
        <v-window-item value="note">
          <v-textarea v-model="noteText" :label="text.newNote" rows="3" auto-grow density="compact" />
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              variant="flat"
              color="primary"
              class="text-none"
              :disabled="busy || !noteText.trim()"
              @click="saveNote"
            >
              {{ text.saveNote }}
            </v-btn>
            <v-btn variant="tonal" color="buttons" class="text-none" @click="pick('note')">
              {{ text.pickMyNote }}
            </v-btn>
          </div>
        </v-window-item>
        <v-window-item value="topic">
          <v-text-field v-model="topicTitle" :label="text.topicTitle" density="compact" />
          <v-textarea v-model="topicText" :label="text.topicText" rows="3" auto-grow density="compact" />
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              variant="flat"
              color="primary"
              class="text-none"
              :disabled="busy || !topicTitle.trim()"
              @click="saveTopic"
            >
              {{ text.saveTopic }}
            </v-btn>
            <v-btn variant="tonal" color="buttons" class="text-none" @click="pick('topic')">
              {{ text.pickMyTopic }}
            </v-btn>
          </div>
        </v-window-item>
        <v-window-item value="video">
          <p class="muted">{{ text.videoHint }}</p>
          <v-btn
            variant="flat"
            color="primary"
            class="text-none"
            prepend-icon="mdi-link-variant"
            @click="pickingVideo = true"
          >
            {{ text.pasteVideo }}
          </v-btn>
        </v-window-item>
        <v-window-item value="picture">
          <p class="muted">{{ text.pictureHint }}</p>
          <v-btn
            variant="flat"
            color="primary"
            class="text-none"
            prepend-icon="mdi-image-plus"
            :loading="busy"
            @click="addPicture"
          >
            {{ text.choosePicture }}
          </v-btn>
        </v-window-item>
      </v-window>
    </template>

    <template #actions>
      <v-spacer />
      <v-btn variant="flat" color="primary" class="text-none px-6" @click="open = false">{{
        text.done
      }}</v-btn>
    </template>
  </AppDialog>

  <MaterialPicker v-model="picking" :kind="pickKind" @picked="(post: TopicPost) => add(pickKind, post)" />
  <VideoDialog v-model="pickingVideo" @picked="addVideo" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import MaterialPicker from '@/components/calendar/MaterialPicker.vue'
import VideoDialog from '@/components/calendar/VideoDialog.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import StoredImage from '@/components/posts/StoredImage.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, youTubeId, type MaterialItem, type Occurrence } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError, type Attachment } from '@/stores/worker'
import { format } from '@/utils/format'
import { pickImage, resizeImage } from '@/utils/image'
import type { TopicPost } from '@/utils/topicPost'

/**
 * One kind of the materials of a role (e.g. «План служіння» of «Ведучий»): what is there, changed in
 * place; and something new — a note or a topic written here or chosen of one's own, a video, a picture.
 */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{
  occurrence: Occurrence
  role: string
  /** the id of the kind; '' : the materials of a role of no kinds */
  resource: string
  /** the person of the role or an approver: may add and change */
  may: boolean
}>()

const schedule = useScheduleStore()
const user = useUserStore()
const worker = useWorkerStore()
const { calendar: text, common, publish } = storeToRefs(useLanguageStore())

const kindTitle = computed(
  () => schedule.materialKinds.find((kind) => kind.id === props.resource)?.name ?? text.value.materialsGeneric
)
const title = computed(() => `${kindTitle.value} · ${props.role}`)

/** the materials of the role of this kind ('' : of no kind of the role) */
const mine = computed(() => {
  const kinds = props.occurrence.slots.find((slot) => slot.name === props.role)?.kinds ?? []
  return props.occurrence.materials.filter(
    (item) =>
      item.role === props.role &&
      (props.resource ? item.resource === props.resource : !item.resource || !kinds.includes(item.resource))
  )
})

const busy = ref(false)
const error = ref('')
const tab = ref<'note' | 'topic' | 'video' | 'picture'>('note')
const noteText = ref('')
const topicTitle = ref('')
const topicText = ref('')
/** the notes and verses of the notes and topics */
const full = ref<Record<string, Attachment>>({})

const iconOf = (material: MaterialItem) =>
  ({ video: 'mdi-youtube', topic: '$topic', note: '$note', image: 'mdi-image-outline' })[material.kind]
/** a participant changes only their own materials; the leaders and the administrators any */
const mayChange = (material: MaterialItem) =>
  material.uid === user.uid || schedule.approves(props.occurrence.event)
const editable = (material: MaterialItem) => material.kind === 'note' || material.kind === 'topic'

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    return true
  } catch (cause) {
    const reason =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
    error.value =
      cause instanceof WorkerError && cause.message === 'no-storage'
        ? text.value.noStorage
        : cause instanceof DOMException || cause instanceof TypeError
          ? text.value.badPicture
          : format(text.value.failed, { name: reason })
    return false
  } finally {
    busy.value = false
  }
}

async function loadFull() {
  if (!mine.value.some((item) => editable(item) && !full.value[item.id])) return
  const list = await schedule.loadMaterials(props.occurrence.event.id, props.occurrence.day)
  full.value = Object.fromEntries(
    list
      .filter((item) => editable(item))
      .map((item) => [item.id, { kind: item.kind as 'note' | 'topic', post: item.post }])
  )
}

watch(open, (value) => {
  if (!value) return
  error.value = ''
  editing.value = null
  noteText.value = ''
  topicTitle.value = ''
  topicText.value = ''
  tab.value = 'note'
  run(loadFull)
})
// a new or changed material: its words too
watch(
  () => mine.value.map((item) => `${item.id}|${item.title}`).join(),
  () => open.value && run(loadFull)
)

const ids = () => [props.occurrence.event.id, props.occurrence.day, props.role] as const
const resource = () => props.resource || null

const add = (kind: 'note' | 'topic', post: TopicPost) =>
  run(() => schedule.addMaterial(...ids(), kind, post, resource()))

async function saveNote() {
  const words = noteText.value.trim()
  if (await add('note', { title: '', items: [{ kind: 'note', text: words, verses: [] }] }))
    noteText.value = ''
}

async function saveTopic() {
  const words = topicText.value.trim()
  const done = await add('topic', {
    title: topicTitle.value.trim(),
    items: words ? [{ kind: 'note', text: words, verses: [] }] : []
  })
  if (done) {
    topicTitle.value = ''
    topicText.value = ''
  }
}

/** one of one's own notes or topics */
const picking = ref(false)
const pickKind = ref<'note' | 'topic'>('note')
function pick(kind: 'note' | 'topic') {
  pickKind.value = kind
  picking.value = true
}

const pickingVideo = ref(false)
const addVideo = (url: string, name: string) => run(() => schedule.addVideo(...ids(), url, name, resource()))

/** a picture of the device: kept in the private channel of the pictures, then a material */
async function addPicture() {
  const file = await pickImage()
  if (!file) return
  await run(async () => {
    const image = await resizeImage(file, { size: 1600 })
    const kept = (await worker.request<{ image: string }>('POST', '/posts/upload', { image })).image
    await schedule.addImage(...ids(), kept, file.name.replace(/\.[^.]+$/, '').slice(0, 120), resource())
  })
}

/* ---------- a note or a topic changed ---------- */

const editing = ref<string | null>(null)
const draftTitle = ref('')
const draftTexts = ref<string[]>([])

function startEdit(material: MaterialItem) {
  const post = full.value[material.id]?.post
  if (!post) return
  editing.value = material.id
  draftTitle.value = post.title
  const notes = post.items.filter((item) => item.kind === 'note')
  draftTexts.value = notes.length ? notes.map((item) => item.text) : ['']
}

async function saveEdit(material: MaterialItem) {
  const post = full.value[material.id]!.post
  let index = 0
  const items = post.items.map((item) =>
    item.kind === 'note' ? { ...item, text: draftTexts.value[index++] ?? '' } : item
  )
  // a note of none before: the words are its first note
  if (!post.items.some((item) => item.kind === 'note') && draftTexts.value[0]?.trim())
    items.push({ kind: 'note', text: draftTexts.value[0].trim(), verses: [] })
  const changed = { title: material.kind === 'topic' ? draftTitle.value.trim() : post.title, items }
  if (await run(() => schedule.updateMaterial(material.id, changed))) {
    full.value = { ...full.value, [material.id]: { kind: material.kind as 'note' | 'topic', post: changed } }
    editing.value = null
  }
}
</script>

<style scoped>
.material {
  border: solid 1px var(--app-border-light);
  border-radius: var(--app-radius);
  padding: 8px 12px;
  margin-bottom: 8px;
}

.material__title {
  font-weight: 600;
}

.by {
  color: var(--app-text-muted);
  font-size: 12px;
}

.heading {
  font-weight: 600;
  margin: 16px 0 4px;
}

.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}

.video {
  display: block;
  position: relative;
  max-width: 420px;
  margin-top: 6px;
  border-radius: var(--app-radius);
  overflow: hidden;
}

.video img {
  display: block;
  width: 100%;
}

.play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.9;
}

/* the title of a note or a topic is in the header already */
.material :deep(.attachment__kind) {
  display: none;
}

.picture {
  margin-top: 6px;
  max-width: 420px;
}
</style>
