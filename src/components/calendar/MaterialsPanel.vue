<template>
  <div class="materials-panel">
    <p v-if="!slots.length" class="empty">{{ text.noMaterialRoles }}</p>

    <!-- each role that prepares: its people, then its kinds of materials, each ready or not -->
    <section v-for="slot of slots" :key="slot.name" class="role">
      <div class="role-head">
        <span class="role-name">{{ slot.name }}:</span>
        <span v-for="member of membersOf(slot.name)" :key="member.uid" class="person">
          <v-avatar size="24" color="secondary" class="mr-1">
            <span class="initials">{{ initialsOf(member.name) }}</span>
          </v-avatar>
          {{ member.name }}
        </span>
        <span v-if="!membersOf(slot.name).length" class="empty">{{ text.noOneYet }}</span>
      </div>

      <v-list density="compact" class="kinds">
        <v-list-item
          v-for="kind of kindsOf(slot)"
          :key="kind"
          :title="kindTitle(kind)"
          :subtitle="summaryOf(slot.name, kind)"
          prepend-icon="mdi-file-document-outline"
          @click="openKind(slot.name, kind)"
        >
          <template #append>
            <!-- ready: ticked by the person of the role; a material of the kind ticks it by itself -->
            <v-checkbox-btn
              :model-value="ready(slot.name, kind)"
              :disabled="!mayAdd(slot.name) || hasMaterial(slot.name, kind) || busy"
              :aria-label="format(text.readyOf, { name: kindTitle(kind) })"
              :title="hasMaterial(slot.name, kind) ? text.materialAdded : text.readyMark"
              color="primary"
              @click.stop
              @update:model-value="(done: boolean) => mark(slot.name, kind, done)"
            />
          </template>
        </v-list-item>
      </v-list>
    </section>

    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
    <MaterialDialog
      v-model="dialog"
      :occurrence="occurrence"
      :role="role"
      :resource="resource"
      :may="mayAdd(role)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import MaterialDialog from '@/components/calendar/MaterialDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { isReady, kindsOf, useScheduleStore, type Occurrence } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * The materials of one day of an event, by role: the people of the role, and the kinds it prepares,
 * each marked ready; a kind opens its window (what is there, and something new).
 */
const props = defineProps<{ occurrence: Occurrence }>()

const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const error = ref('')
const busy = ref(false)

/** the roles that prepare: all for the leaders and the administrators, a participant's own for them */
const slots = computed(() =>
  props.occurrence.slots.filter(
    (slot) =>
      slot.materials &&
      (schedule.approves(props.occurrence.event) ||
        membersOf(slot.name).some((member) => member.uid === user.uid))
  )
)

const kindTitle = (id: string) =>
  schedule.materialKinds.find((kind) => kind.id === id)?.name ?? text.value.materialsGeneric
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')

const membersOf = (name: string) =>
  props.occurrence.team.filter(
    (member) => member.role === name && (member.status === 'confirmed' || member.status === 'invited')
  )

/** the materials of a kind of the role ('' : of no kind of the role) */
const materialsOf = (role: string, kind: string) => {
  const kinds = slots.value.find((slot) => slot.name === role)?.kinds ?? []
  return props.occurrence.materials.filter(
    (item) =>
      item.role === role && (kind ? item.resource === kind : !item.resource || !kinds.includes(item.resource))
  )
}
const hasMaterial = (role: string, kind: string) => materialsOf(role, kind).length > 0
const ready = (role: string, kind: string) =>
  isReady(role, kind, props.occurrence.materials, props.occurrence.marks)

/** under the kind: what is there (the first title, and how many more) */
const summaryOf = (role: string, kind: string) => {
  const list = materialsOf(role, kind)
  if (!list.length) return text.value.noMaterials
  const first = list[0]!.title || kindTitle(kind)
  return list.length > 1 ? `${first} ${format(text.value.andMore, { count: list.length - 1 })}` : first
}

/** the person of the role, or an approver of the event */
const mayAdd = (name: string) =>
  membersOf(name).some((member) => member.uid === user.uid) || schedule.approves(props.occurrence.event)

const dialog = ref(false)
const role = ref('')
const resource = ref('')
function openKind(name: string, kind: string) {
  role.value = name
  resource.value = kind
  dialog.value = true
}

async function mark(name: string, kind: string, done: boolean) {
  busy.value = true
  error.value = ''
  try {
    await schedule.setMark(props.occurrence.event.id, props.occurrence.day, name, kind, done)
  } catch (cause) {
    const reason =
      cause instanceof WorkerError && cause.message !== 'unreachable'
        ? cause.message
        : publish.value.unreachable
    error.value = format(text.value.failed, { name: reason })
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.role + .role {
  margin-top: 12px;
  padding-top: 12px;
  border-top: solid 1px var(--app-border-light);
}

.role-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

.role-name {
  font-weight: 600;
}

.person {
  display: inline-flex;
  align-items: center;
}

.initials {
  font-size: 11px;
  color: white;
}

.kinds {
  background: transparent;
  padding: 0;
}

.empty {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 4px 0 0;
}
</style>
