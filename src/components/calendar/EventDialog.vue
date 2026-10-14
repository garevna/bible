<template>
  <AppDialog
    v-model="open"
    :title="event ? text.editEvent : text.addEvent"
    icon="mdi-calendar-plus"
    max-width="680"
  >
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

    <!-- the type gives the ministry and the roles of the people -->
    <v-select
      v-model="draft.typeId"
      :items="typeItems"
      :label="text.eventType"
      density="compact"
      class="mb-2"
      @update:model-value="chooseType"
    />
    <v-select
      v-model="draft.ministry"
      :items="ministryItems"
      :label="text.ministry"
      density="compact"
      class="mb-2"
    />
    <v-text-field
      v-model="draft.title"
      :label="text.eventTitle"
      :placeholder="type?.name"
      density="compact"
      class="mb-2"
    />

    <!-- once on a date, or on days of the week (e.g. the morning prayer: every day but Sunday) -->
    <v-btn-toggle
      v-model="kind"
      mandatory
      density="compact"
      color="secondary"
      variant="outlined"
      divided
      class="mb-4"
    >
      <v-btn value="single" class="text-none">{{ text.single }}</v-btn>
      <v-btn value="repeated" class="text-none">{{ text.repeated }}</v-btn>
    </v-btn-toggle>

    <div class="d-flex flex-wrap ga-2">
      <v-text-field
        v-if="kind === 'single'"
        v-model="day"
        :label="text.day"
        type="date"
        density="compact"
        class="field"
      />
      <v-text-field v-model="draft.time" :label="text.time" type="time" density="compact" class="field" />
      <v-text-field
        v-if="kind === 'repeated'"
        v-model="until"
        :label="text.until"
        type="date"
        density="compact"
        clearable
        class="field"
      />
    </div>
    <div v-if="kind === 'repeated'" class="mb-4">
      <p class="label">{{ text.weekdays }}</p>
      <v-chip-group v-model="weekdays" multiple column selected-class="text-secondary">
        <v-chip v-for="item of weekdayItems" :key="item.value" :value="item.value" filter variant="outlined">
          {{ item.title }}
        </v-chip>
      </v-chip-group>
      <!-- e.g. the morning prayer: 06:45 on weekdays, 08:00 on Saturday -->
      <v-switch
        v-model="perDay"
        :label="text.timePerDay"
        color="secondary"
        density="compact"
        hide-details
        class="mt-1"
      />
      <div v-if="perDay" class="d-flex flex-wrap ga-2 mt-1">
        <v-text-field
          v-for="item of weekdayItems.filter((weekday) => weekdays.includes(weekday.value))"
          :key="item.value"
          v-model="times[item.value]"
          :label="item.title"
          :placeholder="draft.time"
          type="time"
          density="compact"
          hide-details
          class="day-time"
        />
      </div>
    </div>

    <v-combobox
      v-model="draft.location"
      :items="schedule.locations"
      :label="text.location"
      density="compact"
      class="mb-2"
    />
    <v-textarea
      v-model="draft.description"
      :label="text.description"
      rows="2"
      auto-grow
      density="compact"
      class="mb-2"
    />

    <!-- the roles: the type's own, the event's own, or just how many people -->
    <template v-if="type?.roles === 'fixed'">
      <p class="label">{{ text.eventSlots }}</p>
      <div class="d-flex flex-wrap ga-1 mb-4">
        <v-chip v-for="slot of type.slots" :key="slot.name" size="small" variant="tonal" color="secondary">
          {{ slot.count > 1 ? `${slot.name} ×${slot.count}` : slot.name }}
          <v-icon v-if="slot.materials" icon="mdi-file-document-edit-outline" size="small" class="ml-1" />
        </v-chip>
      </div>
    </template>
    <template v-else-if="type?.roles === 'dynamic' || (!type && draft.slots.length)">
      <p class="label">{{ text.eventSlots }}</p>
      <SlotsEditor v-model="draft.slots" class="mb-4" />
    </template>
    <v-text-field
      v-else
      v-model.number="draft.needed"
      :label="text.needed"
      type="number"
      min="1"
      max="100"
      density="compact"
      class="field mb-2"
    />

    <v-radio-group v-model="draft.mode" density="compact" hide-details class="mb-2">
      <v-radio value="invite" :label="text.modeInvite" color="secondary" />
      <v-radio value="open" :label="text.modeOpen" color="secondary" />
    </v-radio-group>
    <!-- an open event: who may apply -->
    <v-select
      v-if="draft.mode === 'open'"
      v-model="draft.applicants"
      :items="applicantItems"
      :label="text.whoApplies"
      density="compact"
      class="mb-2 ml-8"
    />
    <div v-else class="mb-2" />

    <v-autocomplete
      v-model="draft.responsibleUid"
      :items="schedule.people"
      item-title="name"
      item-value="uid"
      :label="text.responsible"
      density="compact"
      class="mb-2"
    />
    <v-autocomplete
      v-model="draft.deputyUid"
      :items="schedule.people.filter((person) => person.uid !== draft.responsibleUid)"
      item-title="name"
      item-value="uid"
      :label="text.deputy"
      density="compact"
      clearable
    />

    <template #actions>
      <ConfirmButton v-if="event" icon="$delete" :text="text.removeEvent" class="mr-auto" @confirm="remove" />
      <DialogButtons
        :confirm-text="common.save"
        :disabled="busy || !ready"
        @cancel="open = false"
        @confirm="save"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ConfirmButton from '@/components/ConfirmButton.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import SlotsEditor from '@/components/calendar/SlotsEditor.vue'
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type EventDraft, type ScheduleEvent } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** A new event, or a change of one (event); a new one is passed on for its invitations */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ event?: ScheduleEvent | null }>()
const emit = defineEmits<{ created: [event: ScheduleEvent] }>()

const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text, common, publish } = storeToRefs(useLanguageStore())

const empty = (): EventDraft => ({
  typeId: null,
  ministry: '',
  title: '',
  description: '',
  location: '',
  day: null,
  weekdays: null,
  time: '10:00',
  until: null,
  needed: 1,
  times: null,
  slots: [],
  mode: 'invite',
  applicants: 'ministry',
  responsibleUid: user.uid ?? '',
  deputyUid: null
})

const draft = ref<EventDraft>(empty())
const kind = ref<'single' | 'repeated'>('single')
const day = ref('')
const until = ref<string | null>(null)
const weekdays = ref<number[]>([])
const busy = ref(false)
const error = ref('')

/** a different time on some weekdays, and those times by the weekday */
const perDay = ref(false)
const times = ref<Record<string, string>>({})

/** the ministries the user plans (a leader plans their own); a changed event keeps its own */
const ministryItems = computed(() => {
  const own = schedule.ministries.filter((ministry) => schedule.plans(ministry))
  const current = props.event?.ministry
  return current && !own.includes(current) ? [current, ...own] : own
})

const applicantItems = computed(() => [
  { value: 'ministry', title: text.value.applicantsMinistry },
  { value: 'servants', title: text.value.applicantsServants },
  { value: 'everyone', title: text.value.applicantsEveryone }
])

const typeItems = computed(() => [
  { title: text.value.noType, value: null },
  ...schedule.types.map((item) => ({ title: item.name, value: item.id }))
])
const type = computed(() => schedule.typeOf(draft.value))

/** a type gives its ministry, and a type whose roles are given to each event suggests its own */
function chooseType() {
  const chosen = type.value
  if (chosen?.ministry) draft.value.ministry = chosen.ministry
  draft.value.slots = chosen?.roles === 'dynamic' ? chosen.slots.map((slot) => ({ ...slot })) : []
}

/** Monday first, as in the calendars of the church */
const weekdayItems = computed(() => {
  const locale = { ua: 'uk', ru: 'ru', en: 'en' }[user.lang]
  const name = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-01 was a Monday
  return [1, 2, 3, 4, 5, 6, 0].map((value) => ({
    value,
    title: name.format(new Date(2024, 0, value === 0 ? 7 : value))
  }))
})

/** the day a new event is planned for: the one chosen in the calendar */
const startDay = defineModel<string | null>('day', { default: null })

watch(open, (value) => {
  if (!value) return
  error.value = ''
  const event = props.event
  draft.value = event ? { ...event, slots: event.slots.map((slot) => ({ ...slot })) } : empty()
  kind.value = event?.weekdays ? 'repeated' : 'single'
  day.value = event?.day ?? (event ? '' : (startDay.value ?? schedule.today))
  until.value = event?.until ?? null
  weekdays.value = event?.weekdays ? [...event.weekdays] : []
  perDay.value = Boolean(event?.times)
  times.value = { ...event?.times }
  schedule.loadChoices().catch(() => undefined)
})

const ready = computed(
  () =>
    Boolean(draft.value.ministry && draft.value.time && draft.value.responsibleUid) &&
    (kind.value === 'single' ? Boolean(day.value) : weekdays.value.length > 0) &&
    draft.value.slots.every((slot) => slot.name.trim() && Number(slot.count) >= 1)
)

async function run(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    open.value = false
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

const save = () =>
  run(async () => {
    const saved = await schedule.saveEvent(
      {
        ...draft.value,
        location: draft.value.location ?? '',
        day: kind.value === 'single' ? day.value : null,
        weekdays: kind.value === 'repeated' ? weekdays.value : null,
        // the times of the weekdays: an empty one is the time of the event
        times:
          kind.value === 'repeated' && perDay.value
            ? Object.fromEntries(weekdays.value.map((day) => [day, times.value[day] || draft.value.time]))
            : null,
        until: kind.value === 'repeated' ? until.value || null : null,
        needed: Number(draft.value.needed) || 1,
        slots: draft.value.slots.map((slot) => ({
          ...slot,
          name: slot.name.trim(),
          count: Math.min(50, Math.max(1, Number(slot.count) || 1)),
          hint: slot.materials ? slot.hint.trim() : ''
        }))
      },
      props.event?.id
    )
    if (!props.event) emit('created', saved)
  })

const remove = () => run(() => schedule.deleteEvent(props.event!.id))
</script>

<style scoped>
.field {
  flex: 1 1 160px;
  max-width: 220px;
}

.day-time {
  flex: 0 1 140px;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}
</style>
