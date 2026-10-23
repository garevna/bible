<template>
  <div class="roles-panel">
    <p v-if="!slots.length" class="empty">{{ text.noRoles }}</p>
    <p v-else-if="!members.length" class="empty">{{ text.noTeamForRoles }}</p>

    <!-- each approved person with their role; a role is given from the free ones -->
    <div v-for="member of members" :key="member.uid" class="member">
      <span class="flex-grow-1">{{ member.name }}</span>
      <v-menu :disabled="!canGive || busy">
        <template #activator="{ props: menu }">
          <v-chip
            v-bind="menu"
            :color="member.role ? 'secondary' : 'warning'"
            variant="tonal"
            :append-icon="canGive ? 'mdi-menu-down' : undefined"
            :data-role-of="member.uid"
          >
            {{ member.role ?? text.roleUndefined }}
          </v-chip>
        </template>
        <v-list density="compact" bg-color="homefone">
          <v-list-item
            v-for="slot of slots"
            :key="slot.name"
            :title="slot.name"
            :subtitle="`${taken(slot.name, member.uid)} / ${slot.count}${isFull(slot.name, member.uid) ? ` · ${text.roleFull}` : ''}`"
            :disabled="isFull(slot.name, member.uid) || member.role === slot.name"
            :active="member.role === slot.name"
            @click="give(member.uid, slot.name)"
          />
          <v-divider v-if="member.role" />
          <v-list-item
            v-if="member.role"
            prepend-icon="mdi-close"
            :title="text.clearRole"
            @click="give(member.uid, null)"
          />
        </v-list>
      </v-menu>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence } from '@/stores/schedule'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * The roles of the people of one day of an event. A role offers only its free places:
 * a taken one (e.g. the only pastor) is first taken off the person who has it.
 */
const props = defineProps<{ occurrence: Occurrence }>()

const schedule = useScheduleStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const busy = ref(false)
const error = ref('')

const slots = computed(() => props.occurrence.slots)
const members = computed(() =>
  props.occurrence.team.filter((member) => member.status === 'confirmed' || member.status === 'invited')
)
const canGive = computed(() => schedule.approves(props.occurrence.event))

/** the places of a role taken by the others */
const taken = (role: string, uid: string) =>
  members.value.filter((member) => member.role === role && member.uid !== uid).length
const isFull = (role: string, uid: string) =>
  taken(role, uid) >= (slots.value.find((slot) => slot.name === role)?.count ?? 0)

async function give(uid: string, role: string | null) {
  busy.value = true
  error.value = ''
  try {
    await schedule.setRole(props.occurrence.event.id, props.occurrence.day, uid, role)
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
.member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.member + .member {
  border-top: solid 1px var(--app-border-light);
}

.empty {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}
</style>
