<template>
  <article class="occurrence" :class="{ 'occurrence--mine': schedule.isMine(occurrence) }">
    <div class="d-flex align-start ga-3">
      <div class="time">{{ event.time }}</div>
      <div class="flex-grow-1 min-width-0">
        <div class="event-name">{{ schedule.nameOf(event) }}</div>
        <div class="details">
          <span v-if="schedule.nameOf(event) !== event.ministry">{{ event.ministry }}</span>
          <span v-if="event.location">
            <v-icon icon="mdi-map-marker-outline" size="x-small" /> {{ event.location }}
          </span>
          <span>{{ text.responsible }}: {{ event.responsibleName }}</span>
          <span>{{ format(text.teamOf, { count: confirmed }) }} / {{ event.needed }}</span>
        </div>
        <p v-if="event.description" class="description">{{ event.description }}</p>

        <!-- what is not settled yet -->
        <div v-if="occurrence.issues.length" class="d-flex flex-wrap ga-1 mt-1">
          <v-chip
            v-for="issue of occurrence.issues"
            :key="issue"
            size="x-small"
            color="delete"
            variant="tonal"
            prepend-icon="mdi-alert-circle-outline"
          >
            {{ text[issueLabels[issue]] }}
          </v-chip>
        </div>

        <!-- what the user answers -->
        <div class="d-flex flex-wrap ga-2 mt-2">
          <template v-for="member of occurrence.team" :key="'me' + member.uid">
            <template v-if="member.uid === user.uid && member.status === 'invited'">
              <v-btn
                size="small"
                variant="flat"
                color="primary"
                class="text-none"
                @click="answer(member, 'main', 'confirm')"
              >
                {{ text.confirm }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="delete"
                class="text-none"
                @click="emit('decline', member, 'main')"
              >
                {{ text.cannot }}
              </v-btn>
            </template>
            <v-btn
              v-if="member.uid === user.uid && member.status === 'confirmed'"
              size="small"
              variant="text"
              color="delete"
              class="text-none"
              @click="emit('decline', member, 'main')"
            >
              {{ text.cannot }}
            </v-btn>
            <template v-if="member.backupUid === user.uid && member.backupStatus === 'invited'">
              <span class="details align-self-center">{{
                format(text.youBackup, { name: member.name })
              }}</span>
              <v-btn
                size="small"
                variant="flat"
                color="primary"
                class="text-none"
                @click="answer(member, 'backup', 'confirm')"
              >
                {{ text.confirmBackup }}
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="delete"
                class="text-none"
                @click="emit('decline', member, 'backup')"
              >
                {{ text.cannot }}
              </v-btn>
            </template>
          </template>
          <v-btn
            v-if="canApply"
            size="small"
            variant="tonal"
            color="buttons"
            class="text-none"
            @click="run(() => schedule.apply(event.id, occurrence.day))"
          >
            <!-- the ones who approve join at once -->
            {{ schedule.approves(event) ? text.joinSelf : text.apply }}
          </v-btn>
        </div>
      </div>

      <!-- planning it -->
      <div class="d-flex flex-column">
        <ButtonTooltip
          v-if="schedule.invites(event)"
          icon="mdi-email-fast-outline"
          :text="text.invitations"
          color="secondary"
          @click="emit('invite', occurrence)"
        />
        <ButtonTooltip
          v-if="schedule.manages(event)"
          icon="$editNote"
          :text="text.editEvent"
          color="buttons"
          @click="emit('edit', event)"
        />
      </div>
    </div>

    <!-- the people, their roles, the materials of the roles -->
    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn
        v-for="item of sections"
        :key="item.value"
        size="small"
        :variant="opened === item.value ? 'flat' : 'outlined'"
        :color="opened === item.value ? 'secondary' : 'secondary'"
        class="text-none"
        :prepend-icon="item.icon"
        :append-icon="opened === item.value ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        :aria-expanded="opened === item.value"
        @click="opened = opened === item.value ? null : item.value"
      >
        {{ item.title }}
      </v-btn>
    </div>
    <v-expand-transition>
      <div v-if="opened" class="section">
        <TeamPanel v-if="opened === 'team'" :occurrence="occurrence" />
        <RolesPanel v-else-if="opened === 'roles'" :occurrence="occurrence" />
        <MaterialsPanel v-else :occurrence="occurrence" />
      </div>
    </v-expand-transition>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import MaterialsPanel from '@/components/calendar/MaterialsPanel.vue'
import RolesPanel from '@/components/calendar/RolesPanel.vue'
import TeamPanel from '@/components/calendar/TeamPanel.vue'
import { useLanguageStore } from '@/stores/language'
import {
  useScheduleStore,
  type Issue,
  type Occurrence,
  type Participant,
  type ScheduleEvent
} from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** One day of an event: what it is, what is not settled, the user's answers, and its people, roles and materials */
const props = defineProps<{ occurrence: Occurrence }>()
const emit = defineEmits<{
  decline: [member: Participant, as: 'main' | 'backup']
  edit: [event: ScheduleEvent]
  invite: [occurrence: Occurrence]
}>()

const schedule = useScheduleStore()
const worker = useWorkerStore()
const user = useUserStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const opened = ref<'team' | 'roles' | 'materials' | null>(null)
const error = ref('')

const event = computed(() => props.occurrence.event)
const confirmed = computed(
  () => props.occurrence.team.filter((member) => member.status === 'confirmed').length
)

const issueLabels: Record<Issue, 'issuePeople' | 'issueRoles' | 'issueMaterials'> = {
  people: 'issuePeople',
  roles: 'issueRoles',
  materials: 'issueMaterials'
}

const sections = computed(() => [
  { value: 'team' as const, icon: 'mdi-account-group-outline', title: text.value.participants },
  ...(event.value.slots.length
    ? [
        { value: 'roles' as const, icon: 'mdi-badge-account-outline', title: text.value.rolesButton },
        ...(event.value.slots.some((slot) => slot.materials)
          ? [
              {
                value: 'materials' as const,
                icon: 'mdi-file-document-multiple-outline',
                title: text.value.materialsButton
              }
            ]
          : [])
      ]
    : [])
])

/**
 * Not in the team yet: an open event of the user's ministry, or any event the user approves for
 * (then the user serves at once, without applying to themself)
 */
const canApply = computed(
  () =>
    !props.occurrence.team.some((member) => member.uid === user.uid || member.backupUid === user.uid) &&
    ((event.value.mode === 'open' && worker.ministries.includes(event.value.ministry)) ||
      schedule.approves(event.value))
)

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

const answer = (member: Participant, as: 'main' | 'backup', reply: 'confirm' | 'decline') =>
  run(() => schedule.answer(member, as, reply))
</script>

<style scoped>
.occurrence {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--app-surface);
}

/* what the user serves at */
.occurrence--mine {
  border-color: rgb(var(--v-theme-secondary));
  border-left-width: 4px;
}

.min-width-0 {
  min-width: 0;
}

.time {
  font-weight: 700;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  min-width: 52px;
}

.event-name {
  font-weight: 600;
}

.details {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.description {
  font-size: 14px;
  margin: 4px 0 0;
  white-space: pre-wrap;
}

.section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: solid 1px var(--app-border-light);
}
</style>
