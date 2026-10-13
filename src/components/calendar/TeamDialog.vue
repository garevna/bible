<template>
  <AppDialog v-model="open" :title="title" icon="mdi-account-group-outline" max-width="640">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

    <!-- who serves that day, with their answers -->
    <p v-if="!team.length" class="text-medium-emphasis">{{ format(text.teamOf, { count: 0 }) }}</p>
    <div v-for="member of team" :key="member.uid" class="member">
      <div class="flex-grow-1">
        <span class="font-weight-bold">{{ member.name }}</span>
        <v-chip size="x-small" :color="colorOf(member.status)" variant="tonal" class="ml-2">{{
          text[member.status]
        }}</v-chip>
        <div v-if="member.backupName" class="details">
          {{ format(text.backupOf, { name: member.backupName }) }}
          <v-chip
            v-if="member.backupStatus"
            size="x-small"
            :color="colorOf(member.backupStatus)"
            variant="tonal"
            class="ml-1"
          >
            {{ text[member.backupStatus] }}
          </v-chip>
        </div>
        <div v-if="member.reason" class="details">{{ text.reason }}: {{ member.reason }}</div>
      </div>
      <v-btn
        v-if="member.status === 'applied'"
        size="small"
        variant="tonal"
        color="buttons"
        class="text-none mr-1"
        @click="run(() => schedule.approve(occurrence!.event.id, occurrence!.day, member.uid))"
      >
        {{ text.approve }}
      </v-btn>
      <ConfirmButton
        icon="$unlink"
        :text="text.remove"
        @confirm="run(() => schedule.removeFromTeam(occurrence!.event.id, occurrence!.day, member.uid))"
      />
    </div>

    <!-- an invitation, with a backup who agrees at once -->
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
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence } from '@/stores/schedule'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** The team of one day of an event, for the ones who plan it */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ occurrence: Occurrence | null }>()

const schedule = useScheduleStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())

const person = ref<string | null>(null)
const backup = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

/** the day may change while the dialog is open: the team comes from the store */
const team = computed(() =>
  props.occurrence
    ? (schedule.occurrences.find(
        (item) => item.event.id === props.occurrence!.event.id && item.day === props.occurrence!.day
      )?.team ?? [])
    : []
)

const title = computed(() =>
  props.occurrence
    ? `${props.occurrence.event.title || props.occurrence.event.ministry} · ${props.occurrence.day} ${props.occurrence.event.time}`
    : ''
)

/** the members of the ministry first, then the other ministers */
const candidates = computed(() => {
  const ministry = props.occurrence?.event.ministry ?? ''
  const inTeam = new Set(team.value.map((member) => member.uid))
  return schedule.people
    .filter((item) => !inTeam.has(item.uid))
    .sort((a, b) => Number(b.ministries.includes(ministry)) - Number(a.ministries.includes(ministry)))
})

const colorOf = (status: string) =>
  ({ confirmed: 'primary', declined: 'delete', applied: 'warning', invited: 'secondary' })[status] ??
  'secondary'

watch(open, (value) => {
  if (!value) return
  person.value = backup.value = null
  error.value = ''
  schedule.loadChoices().catch(() => undefined)
})

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

const invite = () =>
  run(async () => {
    await schedule.invite(props.occurrence!.event.id, props.occurrence!.day, person.value!, backup.value)
    person.value = backup.value = null
  })
</script>

<style scoped>
.member {
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.member + .member {
  border-top: solid 1px var(--app-border-light);
}

.details {
  color: var(--app-text-muted);
  font-size: 13px;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0 0 6px;
}

.field {
  flex: 1 1 200px;
}
</style>
