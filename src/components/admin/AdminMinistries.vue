<template>
  <section>
    <h2 class="admin-title">{{ text.sectionMinistries }}</h2>
    <p class="hint">{{ text.ministriesTableHint }}</p>

    <!-- a ministry opens by a click: its leaders, its events and their coming days -->
    <v-data-table
      v-model:expanded="expanded"
      :headers="headers"
      :items="rows"
      :loading="busy"
      :items-per-page="-1"
      :no-data-text="text.noMinistries"
      item-value="name"
      density="comfortable"
      hover
      hide-default-footer
      class="ministries-table"
      @click:row="
        (_event: unknown, row: { internalItem: unknown; toggleExpand: (item: unknown) => void }) =>
          row.toggleExpand(row.internalItem)
      "
    >
      <template #[`item.name`]="{ item }">
        <span class="ministry-name">{{ item.name }}</span>
      </template>
      <template #[`item.leaders`]="{ item }">
        <span class="muted">{{ item.leaderNames.join(', ') }}</span>
      </template>
      <template #[`item.events`]="{ item }">
        <v-chip v-if="item.events.length" size="small" variant="tonal" color="secondary">{{
          item.events.length
        }}</v-chip>
      </template>

      <template #expanded-row="{ columns, item }">
        <tr class="details-row">
          <td :colspan="columns.length">
            <div class="details">
              <!-- the leaders plan the events of the ministry -->
              <v-autocomplete
                :model-value="leaders?.[item.name] ?? []"
                :items="schedule.people"
                item-title="name"
                item-value="uid"
                :label="text.leaders"
                :hint="text.leadersHint"
                persistent-hint
                :disabled="saving"
                multiple
                chips
                closable-chips
                density="compact"
                class="leaders"
                @update:model-value="(uids: string[]) => saveLeaders(item.name, uids)"
              />

              <div class="d-flex align-center flex-wrap ga-2">
                <p class="label flex-grow-1">{{ text.ministryEvents }}</p>
                <v-btn
                  variant="tonal"
                  color="buttons"
                  size="small"
                  class="text-none"
                  prepend-icon="mdi-calendar-plus"
                  @click="addEvent(item.name)"
                >
                  {{ calendar.addEvent }}
                </v-btn>
              </div>
              <p v-if="!item.events.length" class="muted">{{ text.noMinistryEvents }}</p>

              <!-- an event: when, where, who leads it, who applies; its coming days and their people -->
              <article v-for="event of item.events" :key="event.id" class="event">
                <div class="d-flex align-start ga-2">
                  <div class="flex-grow-1">
                    <div class="event-name">{{ schedule.nameOf(event) }}</div>
                    <div class="facts">
                      <span
                        ><v-icon icon="mdi-clock-outline" size="x-small" />
                        {{ scheduleText(event, locale) }}</span
                      >
                      <LocationLink v-if="event.location" :location="event.location" />
                      <span>{{ calendar.responsible }}: {{ event.responsibleName }}</span>
                      <span v-if="event.deputyName">{{ calendar.deputy }}: {{ event.deputyName }}</span>
                      <span>{{ event.mode === 'open' ? applicantsText(event) : calendar.modeInvite }}</span>
                    </div>
                  </div>
                  <ButtonTooltip
                    v-if="schedule.manages(event)"
                    icon="$editNote"
                    :text="calendar.editEvent"
                    color="buttons"
                    @click="editEvent(event)"
                  />
                </div>
                <div v-for="day of comingOf(event)" :key="day.day" class="day">
                  <span class="day__date" :class="{ 'day__date--cancelled': day.cancelled }">
                    {{ dayLabel(day.day) }} {{ day.time }}
                  </span>
                  <v-chip v-if="day.cancelled" size="x-small" color="delete" variant="tonal">
                    {{ calendar.dayIsCancelled }}
                  </v-chip>
                  <template v-else>
                    <v-chip size="x-small" variant="tonal" :color="day.issues.length ? 'delete' : 'primary'">
                      {{ confirmedOf(day).length }} / {{ day.needed }}
                    </v-chip>
                    <span class="muted">{{
                      confirmedOf(day)
                        .map((member) => member.name)
                        .join(', ')
                    }}</span>
                  </template>
                </div>
              </article>

              <div class="d-flex justify-end">
                <ConfirmButton
                  icon="$unlink"
                  :text="`${text.removeItem}: ${item.name}`"
                  @confirm="saveMinistries(ministries.filter((entry) => entry !== item.name))"
                />
              </div>
            </div>
          </td>
        </tr>
      </template>
    </v-data-table>

    <v-text-field
      v-model="newMinistry"
      :placeholder="text.newItem"
      :disabled="saving"
      density="compact"
      hide-details
      class="mt-3 new-item"
      @keydown.enter="add"
    />

    <EventDialog
      v-model="eventDialog"
      :event="editing"
      :ministry="newFor"
      @created="(event: ScheduleEvent) => openInvitations(event)"
    />
    <InvitationsDialog v-model="invitationsDialog" :event="inviting" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import EventDialog from '@/components/calendar/EventDialog.vue'
import InvitationsDialog from '@/components/calendar/InvitationsDialog.vue'
import LocationLink from '@/components/calendar/LocationLink.vue'
import { useLanguageStore } from '@/stores/language'
import { scheduleText, useScheduleStore, type Occurrence, type ScheduleEvent } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { useWorkerStore } from '@/stores/worker'

/**
 * The ministries as a table: a ministry opens its leaders, its events (when, where, who leads them)
 * and their coming days with the people confirmed; events are added and changed here too.
 */
const ministries = defineModel<string[]>({ required: true })
const leaders = defineModel<Record<string, string[]> | null>('leaders', { default: null })
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const schedule = useScheduleStore()
const user = useUserStore()
const { admin: text, calendar } = storeToRefs(useLanguageStore())
const { smAndDown: phone } = useDisplay()

const locale = computed(() => ({ ua: 'uk', ru: 'ru', en: 'en' })[user.lang])

const expanded = ref<string[]>([])
const busy = ref(false)
const saving = ref(false)
const newMinistry = ref('')

/** a phone: the name of the ministry and the number of its events */
const headers = computed(() => {
  const all = [
    { key: 'name', title: text.value.ministryColumn, sortable: true },
    { key: 'leaders', title: text.value.leaders, sortable: false },
    { key: 'events', title: text.value.eventsColumn, sortable: false, align: 'center' as const }
  ]
  return phone.value ? all.filter((item) => item.key !== 'leaders') : all
})

const nameOfPerson = (uid: string) => schedule.people.find((person) => person.uid === uid)?.name ?? ''

const rows = computed(() =>
  ministries.value.map((name) => ({
    name,
    leaderNames: (leaders.value?.[name] ?? []).map(nameOfPerson).filter(Boolean),
    events: schedule.events.filter((event) => event.ministry === name)
  }))
)

/** the coming days of an event (up to five), as the calendar has them */
const comingOf = (event: ScheduleEvent) =>
  schedule.occurrences.filter((item) => item.event.id === event.id).slice(0, 5)
const confirmedOf = (day: Occurrence) => day.team.filter((member) => member.status === 'confirmed')

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${day}T12:00:00`)
  )

const applicantsText = (event: ScheduleEvent) =>
  ({
    ministry: calendar.value.applicantsMinistry,
    servants: calendar.value.applicantsServants,
    everyone: calendar.value.applicantsEveryone
  })[event.applicants]

async function run(action: () => Promise<void>) {
  saving.value = true
  try {
    await action()
  } catch (cause) {
    emit('error', cause)
  } finally {
    saving.value = false
  }
}

/** the events of the coming month and the people to choose the leaders from */
onMounted(async () => {
  busy.value = true
  try {
    await Promise.all([schedule.load(), schedule.loadChoices()])
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
})

const saveLeaders = (ministry: string, uids: string[]) =>
  run(async () => {
    leaders.value = await worker.setLeaders({ ...leaders.value, [ministry]: uids })
  })

const saveMinistries = (list: string[]) =>
  run(async () => {
    ministries.value = await worker.setDirectory('ministries', list)
  })

async function add() {
  const name = (newMinistry.value ?? '').trim()
  if (!name || ministries.value.includes(name)) return
  await saveMinistries([...ministries.value, name])
  newMinistry.value = ''
}

/* ---------- the events of a ministry ---------- */

const eventDialog = ref(false)
const editing = shallowRef<ScheduleEvent | null>(null)
const newFor = ref<string | null>(null)

function addEvent(ministry: string) {
  editing.value = null
  newFor.value = ministry
  eventDialog.value = true
}

function editEvent(event: ScheduleEvent) {
  editing.value = event
  newFor.value = null
  eventDialog.value = true
}

/** a new event: its invitations next, as in the calendar */
const invitationsDialog = ref(false)
const inviting = shallowRef<ScheduleEvent | null>(null)
function openInvitations(event: ScheduleEvent) {
  inviting.value = event
  invitationsDialog.value = true
}
</script>

<style scoped>
.ministries-table :deep(tbody tr:not(.details-row)) {
  cursor: pointer;
}

.ministry-name {
  font-weight: 600;
}

.muted {
  color: var(--app-text-muted);
  font-size: 13px;
}

.details-row {
  background: var(--app-light-blue);
}

.details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 4px;
}

.leaders {
  max-width: 560px;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}

.event {
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
  padding: 8px 12px;
}

.event-name {
  font-weight: 600;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  color: var(--app-text-muted);
  font-size: 13px;
  margin-bottom: 4px;
}

.day {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  border-top: solid 1px var(--app-border-light);
}

.day__date {
  min-width: 130px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.day__date--cancelled {
  text-decoration: line-through;
  color: var(--app-text-muted);
}

.new-item {
  max-width: 360px;
}
</style>
