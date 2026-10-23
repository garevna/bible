<template>
  <div class="materials-panel">
    <p v-if="!slots.length" class="empty">{{ text.noMaterialRoles }}</p>

    <!-- each role that prepares materials: what to prepare, what is sent -->
    <section v-for="slot of slots" :key="slot.name" class="role">
      <div class="d-flex flex-wrap align-center ga-2">
        <p class="role-title flex-grow-1">
          {{
            prepares(slot) ? format(text.materialsFor, { role: slot.name, hint: prepares(slot) }) : slot.name
          }}
          <span class="people">{{ peopleOf(slot.name) }}</span>
        </p>
        <template v-if="mayAdd(slot.name)">
          <!-- the kind of the material added next: one of the kinds of the role first -->
          <v-select
            v-if="kindItems(slot).length"
            :model-value="chosenKind[slot.name] ?? slot.kinds[0] ?? null"
            :items="kindItems(slot)"
            :label="text.materialKind"
            density="compact"
            hide-details
            clearable
            class="kind-select"
            @update:model-value="(value: string | null) => (chosenKind[slot.name] = value)"
          />
          <v-btn
            size="small"
            variant="tonal"
            color="buttons"
            class="text-none"
            prepend-icon="$note"
            @click="pick(slot.name, 'note')"
          >
            {{ text.addNote }}
          </v-btn>
          <v-btn
            size="small"
            variant="tonal"
            color="buttons"
            class="text-none"
            prepend-icon="$topic"
            @click="pick(slot.name, 'topic')"
          >
            {{ text.addTopic }}
          </v-btn>
          <v-btn
            size="small"
            variant="tonal"
            color="buttons"
            class="text-none"
            prepend-icon="mdi-youtube"
            @click="pickVideo(slot.name)"
          >
            {{ text.addVideo }}
          </v-btn>
        </template>
      </div>

      <p v-if="!materialsOf(slot.name).length" class="empty">{{ text.noMaterials }}</p>
      <v-expansion-panels variant="accordion" multiple class="mt-1">
        <v-expansion-panel
          v-for="material of materialsOf(slot.name)"
          :key="material.id"
          elevation="0"
          class="material"
        >
          <v-expansion-panel-title>
            <v-icon
              :icon="
                material.kind === 'video' ? 'mdi-youtube' : material.kind === 'topic' ? '$topic' : '$note'
              "
              :color="material.kind === 'video' ? '#FF0000' : undefined"
              size="small"
              class="mr-2"
            />
            <span class="flex-grow-1">
              {{ material.title || '…' }}
              <v-chip
                v-if="kindName(material.resource)"
                size="x-small"
                variant="tonal"
                color="secondary"
                class="ml-1"
              >
                {{ kindName(material.resource) }}
              </v-chip>
            </span>
            <span class="by mr-2">{{ format(text.byName, { name: material.name }) }}</span>
            <ConfirmButton
              v-if="material.uid === user.uid || schedule.approves(occurrence.event)"
              icon="$unlink"
              :text="text.removeMaterial"
              class="mr-2"
              @confirm="run(() => schedule.deleteMaterial(material.id))"
            />
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- a video: its picture opens it on YouTube, in a tab of its own -->
            <a
              v-if="material.kind === 'video' && material.url"
              :href="material.url"
              target="_blank"
              rel="noopener"
              class="video"
            >
              <img :src="pictureOf(material.url)" alt="" />
              <v-icon icon="mdi-play-circle" size="56" color="white" class="play" />
            </a>
            <AttachmentView v-else-if="full[material.id]" :attachment="full[material.id]!" />
            <v-progress-linear v-else indeterminate color="secondary" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
    <MaterialPicker v-model="picking" :kind="kind" @picked="add" />
    <VideoDialog v-model="pickingVideo" @picked="addVideo" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import MaterialPicker from '@/components/calendar/MaterialPicker.vue'
import VideoDialog from '@/components/calendar/VideoDialog.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, youTubeId, type Occurrence, type Slot } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError, type Attachment } from '@/stores/worker'
import { format } from '@/utils/format'
import type { TopicPost } from '@/utils/topicPost'

/**
 * The materials of one day of an event, by role: the person of a role sends notes or a topic,
 * the ones who plan the event may add their own to any role.
 */
const props = defineProps<{ occurrence: Occurrence }>()

const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const error = ref('')
const picking = ref(false)
const kind = ref<'note' | 'topic'>('note')
const role = ref('')
/** the notes and verses of the materials, loaded when the panel opens */
const full = ref<Record<string, Attachment>>({})

const slots = computed(() => props.occurrence.event.slots.filter((slot) => slot.materials))

/** the kind chosen for the next material of a role */
const chosenKind = ref<Record<string, string | null>>({})
const kindName = (id: string | null) => schedule.materialKinds.find((kind) => kind.id === id)?.name ?? ''
/** the kinds of the role first, then the others */
const kindItems = (slot: Slot) => {
  const own = slot.kinds ?? []
  return [
    ...schedule.materialKinds.filter((kind) => own.includes(kind.id)),
    ...schedule.materialKinds.filter((kind) => !own.includes(kind.id))
  ].map((kind) => ({ value: kind.id, title: kind.name }))
}
const resourceOf = (name: string) => {
  const slot = slots.value.find((item) => item.name === name)
  return chosenKind.value[name] !== undefined ? chosenKind.value[name]! : (slot?.kinds?.[0] ?? null)
}
/** what the role prepares: its kinds, and a word about them */
const prepares = (slot: Slot) => (slot.kinds ?? []).map(kindName).filter(Boolean).join(', ')
const pictureOf = (url: string) => `https://i.ytimg.com/vi/${youTubeId(url)}/hqdefault.jpg`
const materialsOf = (name: string) => props.occurrence.materials.filter((item) => item.role === name)
const membersOf = (name: string) =>
  props.occurrence.team.filter(
    (member) => member.role === name && (member.status === 'confirmed' || member.status === 'invited')
  )
const peopleOf = (name: string) =>
  membersOf(name)
    .map((member) => member.name)
    .join(', ')

/** the person of the role, or a manager of the event */
const mayAdd = (name: string) =>
  membersOf(name).some((member) => member.uid === user.uid) || schedule.approves(props.occurrence.event)

async function run(action: () => Promise<unknown>) {
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

async function loadFull() {
  if (!props.occurrence.materials.some((item) => item.kind !== 'video' && !full.value[item.id])) return
  await run(async () => {
    const list = await schedule.loadMaterials(props.occurrence.event.id, props.occurrence.day)
    full.value = Object.fromEntries(
      list
        .filter((item) => item.kind !== 'video')
        .map((item) => [item.id, { kind: item.kind as 'note' | 'topic', post: item.post }])
    )
  })
}

function pick(name: string, what: 'note' | 'topic') {
  role.value = name
  kind.value = what
  picking.value = true
}

const add = (post: TopicPost) =>
  run(() =>
    schedule.addMaterial(
      props.occurrence.event.id,
      props.occurrence.day,
      role.value,
      kind.value,
      post,
      resourceOf(role.value)
    )
  )

const pickingVideo = ref(false)
function pickVideo(name: string) {
  role.value = name
  pickingVideo.value = true
}
const addVideo = (url: string, title: string) =>
  run(() =>
    schedule.addVideo(
      props.occurrence.event.id,
      props.occurrence.day,
      role.value,
      url,
      title,
      resourceOf(role.value)
    )
  )

onMounted(loadFull)
// a new material: its notes and verses too
watch(() => props.occurrence.materials.length, loadFull)
</script>

<style scoped>
.role + .role {
  margin-top: 12px;
  padding-top: 12px;
  border-top: solid 1px var(--app-border-light);
}

.role-title {
  font-weight: 600;
  margin: 0;
}

.people {
  font-weight: 400;
  color: var(--app-text-muted);
  margin-left: 8px;
}

.material {
  border: solid 1px var(--app-border-light);
  margin-bottom: 4px;
  border-radius: var(--app-radius) !important;
}

.kind-select {
  flex: 0 1 240px;
}

.video {
  display: block;
  position: relative;
  max-width: 420px;
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

.by {
  color: var(--app-text-muted);
  font-size: 12px;
}

.empty {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 4px 0 0;
}
</style>
