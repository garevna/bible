<template>
  <div class="page mx-auto" style="max-width: 960px">
    <p v-if="!worker.canReceive" class="text-medium-emphasis">{{ admin.noAccess }}</p>

    <template v-else>
      <div class="d-flex align-center justify-end flex-wrap ga-2 mb-2">
        <v-btn
          v-if="worker.manages('schedule')"
          variant="tonal"
          color="buttons"
          class="text-none"
          prepend-icon="mdi-calendar-plus"
          @click="edit(null)"
        >
          {{ text.addEvent }}
        </v-btn>
        <ButtonTooltip icon="mdi-refresh" :text="admin.reload" color="secondary" @click="load" />
      </div>
      <p class="hint">{{ text.hint }}</p>
      <v-switch
        v-model="onlyMine"
        :label="text.onlyMine"
        color="secondary"
        density="compact"
        hide-details
        class="mb-2"
      />

      <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mb-4"
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>
      <p v-if="!busy && !groups.length" class="text-medium-emphasis">{{ text.noEvents }}</p>

      <!-- the days, and the ministries of each day -->
      <section v-for="group of groups" :key="group.day" class="mb-4">
        <h3 class="day-title">{{ dayTitle(group.day) }}</h3>

        <article
          v-for="item of group.items"
          :key="item.event.id + item.day"
          class="occurrence"
          :class="{ 'occurrence--mine': schedule.isMine(item) }"
        >
          <div class="d-flex align-start ga-3">
            <div class="time">{{ item.event.time }}</div>
            <div class="flex-grow-1">
              <div class="event-name">{{ item.event.title || item.event.ministry }}</div>
              <div class="details">
                <span v-if="item.event.title">{{ item.event.ministry }}</span>
                <span v-if="item.event.location"
                  ><v-icon icon="mdi-map-marker-outline" size="x-small" /> {{ item.event.location }}</span
                >
                <span>{{ text.responsible }}: {{ item.event.responsibleName }}</span>
                <span
                  >{{ format(text.teamOf, { count: active(item).length }) }} / {{ item.event.needed }}</span
                >
              </div>
              <p v-if="item.event.description" class="description">{{ item.event.description }}</p>

              <!-- the team: the names with their answers -->
              <div v-if="item.team.length" class="d-flex flex-wrap ga-1 mt-1">
                <v-chip
                  v-for="member of item.team"
                  :key="member.uid"
                  size="small"
                  :color="colorOf(member.status)"
                  variant="tonal"
                >
                  {{ member.name }} · {{ text[member.status] }}
                </v-chip>
              </div>

              <!-- what the user answers -->
              <div class="d-flex flex-wrap ga-2 mt-2">
                <template v-for="member of item.team" :key="'me' + member.uid">
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
                      @click="decline(member, 'main')"
                    >
                      {{ text.cannot }}
                    </v-btn>
                  </template>
                  <template v-if="member.uid === user.uid && member.status === 'confirmed'">
                    <v-btn
                      size="small"
                      variant="text"
                      color="delete"
                      class="text-none"
                      @click="decline(member, 'main')"
                    >
                      {{ text.cannot }}
                    </v-btn>
                  </template>
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
                      @click="decline(member, 'backup')"
                    >
                      {{ text.cannot }}
                    </v-btn>
                  </template>
                </template>
                <v-btn
                  v-if="canApply(item)"
                  size="small"
                  variant="tonal"
                  color="buttons"
                  class="text-none"
                  @click="run(() => schedule.apply(item.event.id, item.day))"
                >
                  {{ text.apply }}
                </v-btn>
              </div>
            </div>

            <!-- planning it -->
            <div v-if="schedule.manages(item.event)" class="d-flex flex-column">
              <ButtonTooltip
                icon="mdi-account-group-outline"
                :text="text.team"
                color="secondary"
                @click="teamOf = item"
              />
              <ButtonTooltip
                icon="$editNote"
                :text="text.editEvent"
                color="buttons"
                @click="edit(item.event)"
              />
            </div>
          </div>
        </article>
      </section>
    </template>

    <EventDialog v-model="eventDialog" :event="editing" />
    <TeamDialog
      :model-value="Boolean(teamOf)"
      :occurrence="teamOf"
      @update:model-value="(value: boolean) => value || (teamOf = null)"
    />

    <!-- "I can't": a reason, or the usual words -->
    <AppDialog v-model="declineDialog" :title="text.cannotTitle" icon="mdi-calendar-remove" max-width="480">
      <p v-if="declining?.as === 'main'" class="hint">{{ text.backupFirst }}</p>
      <v-textarea v-model="reason" :label="text.reason" rows="3" auto-grow />
      <template #actions>
        <DialogButtons
          :confirm-text="text.cannot"
          danger
          @cancel="declineDialog = false"
          @confirm="sendDecline"
        />
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import EventDialog from '@/components/calendar/EventDialog.vue'
import TeamDialog from '@/components/calendar/TeamDialog.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence, type Participant, type ScheduleEvent } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** The schedule of ministries: the next weeks, what the user serves at, and planning it */
const worker = useWorkerStore()
const schedule = useScheduleStore()
const user = useUserStore()
const { admin, calendar: text, publish } = storeToRefs(useLanguageStore())

const busy = ref(false)
const error = ref('')
const onlyMine = ref(false)

const groups = computed(() => {
  const list = schedule.occurrences.filter((item) => !onlyMine.value || schedule.isMine(item))
  const byDay = new Map<string, Occurrence[]>()
  list.forEach((item) => byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]))
  return [...byDay].map(([day, items]) => ({ day, items }))
})

const active = (item: Occurrence) => item.team.filter((member) => member.status !== 'declined')

const colorOf = (status: string) =>
  ({ confirmed: 'primary', declined: 'delete', applied: 'warning', invited: 'secondary' })[status] ??
  'secondary'

/** "Сьогодні" or "вівторок, 13 жовтня" */
function dayTitle(day: string) {
  const locale = { ua: 'uk', ru: 'ru', en: 'en' }[user.lang]
  const date = new Date(`${day}T12:00:00`)
  const title = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    date
  )
  if (day === schedule.today) return `${text.value.today}, ${title}`
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/** an open event of the user's ministry the user is not in yet */
const canApply = (item: Occurrence) =>
  item.event.mode === 'open' &&
  worker.ministries.includes(item.event.ministry) &&
  !item.team.some((member) => member.uid === user.uid || member.backupUid === user.uid)

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

async function load() {
  if (!worker.canReceive) return
  busy.value = true
  await run(() => schedule.load())
  busy.value = false
}

const answer = (member: Participant, as: 'main' | 'backup', reply: 'confirm' | 'decline', why?: string) =>
  run(() => schedule.answer(member, as, reply, why))

/* ---------- "I can't" ---------- */

const declineDialog = ref(false)
const declining = shallowRef<{ member: Participant; as: 'main' | 'backup' } | null>(null)
const reason = ref('')

function decline(member: Participant, as: 'main' | 'backup') {
  declining.value = { member, as }
  reason.value = text.value.defaultReason
  declineDialog.value = true
}

async function sendDecline() {
  const { member, as } = declining.value!
  declineDialog.value = false
  await answer(member, as, 'decline', reason.value)
}

/* ---------- planning ---------- */

const eventDialog = ref(false)
const editing = shallowRef<ScheduleEvent | null>(null)
const teamOf = shallowRef<Occurrence | null>(null)

function edit(event: ScheduleEvent | null) {
  editing.value = event
  eventDialog.value = true
}

onMounted(load)
// the rights come from the worker after the page may already be open
watch(() => worker.canReceive, load)
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
  margin-bottom: 12px;
}

.day-title {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-secondary));
  margin: 8px 0;
}

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
</style>
