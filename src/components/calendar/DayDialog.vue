<template>
  <AppDialog v-model="open" :title="title" icon="mdi-calendar-edit" max-width="560">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
    <p class="hint">{{ text.dayHint }}</p>

    <v-switch
      v-model="cancelled"
      :label="text.dayCancelled"
      color="delete"
      density="compact"
      hide-details
      class="mb-2"
    />
    <template v-if="!cancelled">
      <div class="d-flex flex-wrap ga-2">
        <v-text-field
          v-model="time"
          :label="text.time"
          :placeholder="usual.time"
          persistent-placeholder
          type="time"
          density="compact"
          clearable
          class="field"
        />
        <v-text-field
          v-model.number="needed"
          :label="text.needed"
          :placeholder="String(usual.needed)"
          persistent-placeholder
          type="number"
          min="1"
          max="100"
          density="compact"
          clearable
          class="field"
        />
      </div>
      <v-combobox
        v-model="location"
        :items="schedule.locations"
        :label="text.location"
        :placeholder="usual.location"
        persistent-placeholder
        density="compact"
        clearable
        class="mb-2"
      />
    </template>
    <v-textarea v-model="note" :label="text.dayNote" rows="2" auto-grow density="compact" />

    <template #actions>
      <v-btn variant="text" color="secondary" class="text-none mr-auto" :disabled="busy" @click="reset">
        {{ text.dayAsUsual }}
      </v-btn>
      <DialogButtons :confirm-text="common.save" :disabled="busy" @cancel="open = false" @confirm="save" />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import { useLanguageStore } from '@/stores/language'
import { timeOf, useScheduleStore, type Occurrence } from '@/stores/schedule'
import { WorkerError } from '@/stores/worker'
import { format } from '@/utils/format'

/**
 * One day of an event changed: another time or place, another number of people, a word for the people,
 * or cancelled. The fields left empty keep the ones of the event.
 */
const open = defineModel<boolean>({ default: false })
const props = defineProps<{ occurrence: Occurrence | null }>()

const schedule = useScheduleStore()
const { calendar: text, common, publish } = storeToRefs(useLanguageStore())

const time = ref<string | null>(null)
const location = ref<string | null>(null)
const needed = ref<number | null>(null)
const note = ref('')
const cancelled = ref(false)
const busy = ref(false)
const error = ref('')

/** the day as the event has it, without its change */
const usual = computed(() => {
  const event = props.occurrence?.event
  if (!event) return { time: '', location: '', needed: 1 }
  return { time: timeOf(event, props.occurrence!.day), location: event.location, needed: event.needed }
})

const title = computed(() =>
  props.occurrence
    ? `${text.value.dayChange}: ${schedule.nameOf(props.occurrence.event)} · ${props.occurrence.day}`
    : ''
)

/** the change of the day the calendar has */
watch(open, (value) => {
  if (!value || !props.occurrence) return
  const item = props.occurrence
  error.value = ''
  cancelled.value = item.cancelled
  note.value = item.note
  time.value = item.time !== usual.value.time ? item.time : null
  location.value = item.location !== usual.value.location ? item.location : null
  needed.value = item.needed !== usual.value.needed ? item.needed : null
})

async function run(change: Parameters<typeof schedule.saveDay>[2]) {
  busy.value = true
  error.value = ''
  try {
    await schedule.saveDay(props.occurrence!.event.id, props.occurrence!.day, change)
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
  run({
    time: cancelled.value ? null : time.value || null,
    location: cancelled.value ? null : location.value?.trim() || null,
    needed: cancelled.value ? null : Number(needed.value) || null,
    cancelled: cancelled.value,
    note: note.value.trim()
  })

/** as the event again */
const reset = () => run({ time: null, location: null, needed: null, cancelled: false, note: '' })
</script>

<style scoped>
.hint {
  color: var(--app-text-muted);
  font-size: 14px;
}

.field {
  flex: 1 1 160px;
}
</style>
