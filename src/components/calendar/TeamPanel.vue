<template>
  <div class="team-panel">
    <!-- the applications on the left, the approved people on the right; the arrows move the chosen one -->
    <div class="transfer" :class="{ 'transfer--stacked': stacked }">
      <div class="column">
        <p class="label">{{ text.applicants }} ({{ applicants.length }})</p>
        <v-list density="compact" class="people" :aria-label="text.applicants">
          <v-list-item
            v-for="member of applicants"
            :key="member.uid"
            :title="member.name"
            :active="chosen === member.uid"
            color="secondary"
            @click="choose(member.uid)"
          >
            <template v-if="stacked && canApprove" #append>
              <v-btn
                size="small"
                variant="tonal"
                color="buttons"
                class="text-none"
                @click.stop="approve(member.uid)"
              >
                {{ text.approve }}
              </v-btn>
            </template>
          </v-list-item>
          <p v-if="!applicants.length" class="empty">{{ text.noApplicants }}</p>
        </v-list>
      </div>

      <div v-if="!stacked && canApprove" class="arrows">
        <v-tooltip :text="text.moveRight" location="top">
          <template #activator="{ props: tooltip }">
            <v-btn
              v-bind="tooltip"
              icon="mdi-arrow-right-bold"
              variant="tonal"
              color="buttons"
              size="small"
              :aria-label="text.moveRight"
              :disabled="!applicants.some((member) => member.uid === chosen) || busy"
              @click="approve(chosen!)"
            />
          </template>
        </v-tooltip>
        <v-tooltip :text="text.moveLeft" location="top">
          <template #activator="{ props: tooltip }">
            <v-btn
              v-bind="tooltip"
              icon="mdi-arrow-left-bold"
              variant="tonal"
              color="secondary"
              size="small"
              :aria-label="text.moveLeft"
              :disabled="
                !approved.some((member) => member.uid === chosen && member.status === 'confirmed') || busy
              "
              @click="unapprove(chosen!)"
            />
          </template>
        </v-tooltip>
      </div>

      <div class="column">
        <p class="label">{{ text.approved }} ({{ approved.length }} / {{ occurrence.event.needed }})</p>
        <v-list density="compact" class="people" :aria-label="text.approved">
          <v-list-item
            v-for="member of approved"
            :key="member.uid"
            :active="chosen === member.uid"
            color="secondary"
            @click="choose(member.uid)"
          >
            <v-list-item-title>{{ member.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ text[member.status] }}<template v-if="member.role"> · {{ member.role }}</template>
              <template v-if="member.backupName">
                · {{ format(text.backupOf, { name: member.backupName }) }}</template
              >
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                v-if="stacked && canApprove && member.status === 'confirmed'"
                size="small"
                variant="text"
                color="secondary"
                class="text-none"
                @click.stop="unapprove(member.uid)"
              >
                {{ text.returnBack }}
              </v-btn>
              <ConfirmButton
                v-if="canInvite"
                icon="$unlink"
                :text="text.remove"
                @confirm="run(() => schedule.removeFromTeam(occurrence.event.id, occurrence.day, member.uid))"
              />
            </template>
          </v-list-item>
          <p v-if="!approved.length" class="empty">{{ text.noApproved }}</p>
        </v-list>
      </div>
    </div>

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
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">{{ error }}</v-alert>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import ConfirmButton from '@/components/ConfirmButton.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence } from '@/stores/schedule'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** The people of one day of an event: the applications, the approved ones, invitations */
const props = defineProps<{ occurrence: Occurrence }>()

const schedule = useScheduleStore()
const { calendar: text, publish } = storeToRefs(useLanguageStore())
const { smAndDown: stacked } = useDisplay()

const chosen = ref<string | null>(null)
const person = ref<string | null>(null)
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

const choose = (uid: string) => (chosen.value = chosen.value === uid ? null : uid)

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

onMounted(() => canInvite.value && schedule.loadChoices().catch(() => undefined))
</script>

<style scoped>
.transfer {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.transfer--stacked {
  flex-direction: column;
}

.column {
  flex: 1 1 0;
  min-width: 0;
}

.people {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  min-height: 120px;
  max-height: 280px;
  overflow-y: auto;
  background: var(--app-surface);
}

.arrows {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

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
