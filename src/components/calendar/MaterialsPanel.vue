<template>
  <div class="materials-panel">
    <p v-if="!slots.length" class="empty">{{ text.noMaterialRoles }}</p>

    <!-- each role that prepares materials: what to prepare, what is sent -->
    <section v-for="slot of slots" :key="slot.name" class="role">
      <div class="d-flex flex-wrap align-center ga-2">
        <p class="role-title flex-grow-1">
          {{ slot.hint ? format(text.materialsFor, { role: slot.name, hint: slot.hint }) : slot.name }}
          <span class="people">{{ peopleOf(slot.name) }}</span>
        </p>
        <template v-if="mayAdd(slot.name)">
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
            <v-icon :icon="material.kind === 'topic' ? '$topic' : '$note'" size="small" class="mr-2" />
            <span class="flex-grow-1">{{ material.title || '…' }}</span>
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
            <AttachmentView v-if="full[material.id]" :attachment="full[material.id]!" />
            <v-progress-linear v-else indeterminate color="secondary" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
    <MaterialPicker v-model="picking" :kind="kind" @picked="add" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import MaterialPicker from '@/components/calendar/MaterialPicker.vue'
import AttachmentView from '@/components/messages/AttachmentView.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence } from '@/stores/schedule'
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
  if (!props.occurrence.materials.some((item) => !full.value[item.id])) return
  await run(async () => {
    const list = await schedule.loadMaterials(props.occurrence.event.id, props.occurrence.day)
    full.value = Object.fromEntries(list.map((item) => [item.id, { kind: item.kind, post: item.post }]))
  })
}

function pick(name: string, what: 'note' | 'topic') {
  role.value = name
  kind.value = what
  picking.value = true
}

const add = (post: TopicPost) =>
  run(() =>
    schedule.addMaterial(props.occurrence.event.id, props.occurrence.day, role.value, kind.value, post)
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
