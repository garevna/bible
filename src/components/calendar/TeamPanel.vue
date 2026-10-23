<template>
  <div class="team-panel">
    <!-- the applications on the left, the approved people on the right; the arrows move the chosen one -->
    <TransferList
      :items="transferItems"
      :model-value="approved.map((member) => member.uid)"
      :left-label="text.applicants"
      :right-label="text.approved"
      :empty-left="text.noApplicants"
      :empty-right="text.noApproved"
      :limit="occurrence.event.needed"
      :right-action="text.moveRight"
      :left-action="text.moveLeft"
      :searchable="false"
      :disabled="!canApprove || busy"
      :keep="(uid: string) => approved.find((member) => member.uid === uid)?.status !== 'confirmed'"
      @move="(uid: string, to: 'left' | 'right') => (to === 'right' ? approve(uid) : unapprove(uid))"
    >
      <template #append="{ item }">
        <ConfirmButton
          v-if="canInvite"
          icon="$unlink"
          :text="text.remove"
          @confirm="run(() => schedule.removeFromTeam(occurrence.event.id, occurrence.day, item.value))"
        />
      </template>
    </TransferList>

    <!-- the ones who could not, with their reasons -->
    <div v-if="declined.length" class="mt-2">
      <v-chip
        v-for="member of declined"
        :key="member.uid"
        size="small"
        color="delete"
        variant="tonal"
        class="mr-1 mb-1"
      >
        {{ member.name }} · {{ text.declined }}<template v-if="member.reason">: {{ member.reason }}</template>
      </v-chip>
    </div>

    <!-- an invitation, with a backup who agrees at once -->
    <template v-if="canInvite">
      <p class="label mt-4">{{ text.invite }}</p>
      <div class="d-flex flex-wrap ga-2 align-center">
        <v-autocomplete
          v-model="person"
          :items="candidates"
          item-title="name"
          item-value="uid"
          :label="text.person"
          density="compact"
          hide-details
          class="field"
        />
        <v-autocomplete
          v-model="backup"
          :items="candidates.filter((item) => item.uid !== person)"
          item-title="name"
          item-value="uid"
          :label="text.backup"
          density="compact"
          hide-details
          clearable
          class="field"
        />
        <v-btn variant="tonal" color="buttons" class="text-none" :disabled="!person || busy" @click="invite">
          {{ text.invite }}
        </v-btn>
      </div>
    </template>
    <!-- somebody without the app: a guest pastor, say -->
    <template v-if="canApprove || canInvite">
      <p class="label mt-4">{{ text.guest }}</p>
      <v-text-field
        v-model="guest"
        :label="text.guest"
        :disabled="busy"
        append-inner-icon="mdi-plus-thick"
        density="compact"
        hide-details
        class="field"
        @click:append-inner="addGuest"
      />
    </template>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import TransferList from '@/components/TransferList.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence } from '@/stores/schedule'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** The people of one day of an event: the applications, the approved ones, invitations */
const props = defineProps<{ occurrence: Occurrence }>()

const schedule = useScheduleStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const person = ref<string | null>(null)
const guest = ref('')
const backup = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

const team = computed(() => props.occurrence.team)
const applicants = computed(() => team.value.filter((member) => member.status === 'applied'))
const approved = computed(() =>
  team.value.filter((member) => member.status === 'confirmed' || member.status === 'invited')
)
const declined = computed(() => team.value.filter((member) => member.status === 'declined'))

const canApprove = computed(() => schedule.approves(props.occurrence.event))
const canInvite = computed(() => schedule.invites(props.occurrence.event))

/** the members of the ministry first, then the other ministers */
const candidates = computed(() => {
  const ministry = props.occurrence.event.ministry
  const inTeam = new Set(team.value.map((member) => member.uid))
  return schedule.people
    .filter((item) => !inTeam.has(item.uid))
    .sort((a, b) => Number(b.ministries.includes(ministry)) - Number(a.ministries.includes(ministry)))
})

/** the applications and the approved people: their names, and the state and role of the approved ones */
const transferItems = computed(() => [
  ...applicants.value.map((member) => ({ value: member.uid, title: member.name })),
  ...approved.value.map((member) => ({
    value: member.uid,
    title: member.name,
    subtitle: [
      text.value[member.status],
      member.role,
      member.backupName ? format(text.value.backupOf, { name: member.backupName }) : ''
    ]
      .filter(Boolean)
      .join(' · ')
  }))
])

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
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

const { event, day } = props.occurrence
const approve = (uid: string) => run(() => schedule.approve(event.id, day, uid))
const unapprove = (uid: string) => run(() => schedule.unapprove(event.id, day, uid))
const invite = () =>
  run(async () => {
    await schedule.invite(event.id, day, person.value!, backup.value)
    person.value = backup.value = null
  })

const addGuest = () =>
  guest.value.trim() &&
  run(async () => {
    await schedule.addGuest(event.id, day, guest.value.trim())
    guest.value = ''
  })

onMounted(() => canInvite.value && schedule.loadChoices().catch(() => undefined))
</script>

<style scoped>
.empty {
  color: var(--app-text-muted);
  font-size: 13px;
  padding: 8px 16px;
  margin: 0;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0 0 4px;
}

.field {
  flex: 1 1 200px;
}
</style>
