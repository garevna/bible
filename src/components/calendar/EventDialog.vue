<template>
  <AppDialog
    v-model="open"
    :title="event ? text.editEvent : text.addEvent"
    icon="mdi-calendar-plus"
    max-width="640"
  >
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>

    <v-select
      v-model="draft.ministry"
      :items="schedule.ministries"
      :label="text.ministry"
      density="compact"
      class="mb-2"
    />
    <v-text-field v-model="draft.title" :label="text.eventTitle" density="compact" class="mb-2" />

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
    <v-text-field
      v-model.number="draft.needed"
      :label="text.needed"
      type="number"
      min="1"
      max="100"
      density="compact"
      class="field mb-2"
    />

    <v-radio-group v-model="draft.mode" density="compact" hide-details class="mb-4">
      <v-radio value="invite" :label="text.modeInvite" color="secondary" />
      <v-radio value="open" :label="text.modeOpen" color="secondary" />
    </v-radio-group>

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
import { useLanguageStore } from '@/stores/language'
import { useScheduleStore, type EventDraft, type ScheduleEvent } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/** A new event, or a change of one (event) */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ event?: ScheduleEvent | null }>()

const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text, common, publish } = storeToRefs(useLanguageStore())

const empty = (): EventDraft => ({
  ministry: '',
  title: '',
  description: '',
  location: '',
  day: null,
  weekdays: null,
  time: '10:00',
  until: null,
  needed: 1,
  mode: 'invite',
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

watch(open, (value) => {
  if (!value) return
  error.value = ''
  const event = props.event
  draft.value = event ? { ...event } : empty()
  kind.value = event?.weekdays ? 'repeated' : 'single'
  day.value = event?.day ?? ''
  until.value = event?.until ?? null
  weekdays.value = event?.weekdays ? [...event.weekdays] : []
  schedule.loadChoices().catch(() => undefined)
})

const ready = computed(
  () =>
    Boolean(draft.value.ministry && draft.value.time && draft.value.responsibleUid) &&
    (kind.value === 'single' ? Boolean(day.value) : weekdays.value.length > 0)
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
  run(() =>
    schedule.saveEvent(
      {
        ...draft.value,
        location: draft.value.location ?? '',
        day: kind.value === 'single' ? day.value : null,
        weekdays: kind.value === 'repeated' ? weekdays.value : null,
        until: kind.value === 'repeated' ? until.value || null : null,
        needed: Number(draft.value.needed) || 1
      },
      props.event?.id
    )
  )

const remove = () => run(() => schedule.deleteEvent(props.event!.id))
</script>

<style scoped>
.field {
  flex: 1 1 160px;
  max-width: 220px;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}
</style>
