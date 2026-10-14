<template>
  <div class="page mx-auto" style="max-width: 960px">
    <p v-if="!worker.calendar" class="text-medium-emphasis">{{ admin.noAccess }}</p>

    <template v-else>
      <div class="d-flex align-center justify-end flex-wrap ga-2 mb-2">
        <p class="hint flex-grow-1 mb-0">{{ text.hint }}</p>
        <v-btn
          v-if="schedule.canCreate"
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

      <CalendarFilters />

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
      <v-snackbar v-model="sent" :timeout="3000" color="secondary">{{ sentText }}</v-snackbar>

      <MonthGrid v-model:month="month" v-model:selected="selected" class="mb-6" />

      <!-- the events of the chosen day -->
      <section v-if="selected" class="day">
        <h3 class="day-title">{{ dayTitle(selected) }}</h3>
        <p v-if="!busy && !dayItems.length" class="text-medium-emphasis">{{ text.dayEmpty }}</p>
        <OccurrenceCard
          v-for="item of dayItems"
          :key="item.event.id + item.day"
          :occurrence="item"
          @decline="decline"
          @edit="edit"
          @invite="(occurrence) => openInvitations(occurrence.event, occurrence.day)"
          @day="(occurrence) => ((changing = occurrence), (dayDialog = true))"
        />
      </section>
    </template>

    <EventDialog
      v-model="eventDialog"
      v-model:day="selected"
      :event="editing"
      @created="(event) => openInvitations(event)"
    />
    <DayDialog v-model="dayDialog" :occurrence="changing" />
    <InvitationsDialog v-model="invitationsDialog" :event="inviting" :day="invitingDay" @sent="showSent" />

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
import CalendarFilters from '@/components/calendar/CalendarFilters.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import DayDialog from '@/components/calendar/DayDialog.vue'
import EventDialog from '@/components/calendar/EventDialog.vue'
import InvitationsDialog from '@/components/calendar/InvitationsDialog.vue'
import MonthGrid from '@/components/calendar/MonthGrid.vue'
import OccurrenceCard from '@/components/calendar/OccurrenceCard.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type Occurrence, type Participant, type ScheduleEvent } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * The calendar of ministries: a month whose days are colored by how settled they are
 * (green: everything; red, orange, amber: as near as they are), the filters above it,
 * and the events of the chosen day with their people, roles and materials.
 */
const worker = useWorkerStore()
const schedule = useScheduleStore()
const user = useUserStore()
const { month } = storeToRefs(schedule)
const { admin, calendar: text, publish } = storeToRefs(useLanguageStore())

const busy = ref(false)
const error = ref('')
const selected = ref<string | null>(null)

const dayItems = computed(() => (selected.value ? (schedule.byDay.get(selected.value) ?? []) : []))

/** "Сьогодні, вівторок, 13 жовтня" or "Середа, 14 жовтня" */
function dayTitle(day: string) {
  const locale = { ua: 'uk', ru: 'ru', en: 'en' }[user.lang]
  const date = new Date(`${day}T12:00:00`)
  const title = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    date
  )
  if (day === schedule.today) return `${text.value.today}, ${title}`
  return title.charAt(0).toUpperCase() + title.slice(1)
}

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
  if (!worker.calendar) return
  busy.value = true
  await run(async () => {
    await schedule.loadMonth()
    // the people for the filter of a minister
    if (schedule.settings.filters.includes('person')) await schedule.loadChoices()
  })
  busy.value = false
  // today, or the first day with events
  if (!selected.value || selected.value.slice(0, 7) !== month.value)
    selected.value =
      month.value === schedule.today.slice(0, 7)
        ? schedule.today
        : ([...schedule.byDay.keys()].sort()[0] ?? `${month.value}-01`)
}

watch(month, load)

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
  await run(() => schedule.answer(member, as, 'decline', reason.value))
}

/* ---------- planning ---------- */

const eventDialog = ref(false)
/** one day changed */
const dayDialog = ref(false)
const changing = shallowRef<Occurrence | null>(null)
const editing = shallowRef<ScheduleEvent | null>(null)

function edit(event: ScheduleEvent | null) {
  editing.value = event
  eventDialog.value = true
}

/** the invitations: by the button of an event, and by themselves after a new event is created */
const invitationsDialog = ref(false)
const inviting = shallowRef<ScheduleEvent | null>(null)
const invitingDay = ref<string | null>(null)

function openInvitations(event: ScheduleEvent, day: string | null = null) {
  inviting.value = event
  invitingDay.value = day ?? event.day
  invitationsDialog.value = true
}

const sent = ref(false)
const sentText = ref('')
function showSent(count: number) {
  sentText.value = format(text.value.sentInvitations, { count })
  sent.value = true
}

onMounted(load)
// the rights come from the worker after the page may already be open
watch(() => worker.calendar, load)
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
}

.day-title {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-secondary));
  margin: 8px 0;
}
</style>
