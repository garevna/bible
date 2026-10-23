<template>
  <section>
    <h2 class="admin-title">{{ text.calendarSettings }}</h2>
    <p class="hint">{{ text.calendarHint }}</p>

    <div class="d-flex flex-wrap ga-4 mb-2">
      <v-text-field
        v-model.number="settings.redDays"
        :label="text.redDays"
        type="number"
        min="0"
        max="30"
        density="compact"
        class="days"
      >
        <template #prepend-inner><span class="swatch swatch--red" /></template>
      </v-text-field>
      <v-text-field
        v-model.number="settings.orangeDays"
        :label="text.orangeDays"
        type="number"
        min="0"
        max="60"
        density="compact"
        class="days"
      >
        <template #prepend-inner><span class="swatch swatch--orange" /></template>
      </v-text-field>
    </div>
    <p class="label">{{ text.filters }}</p>
    <div class="d-flex flex-wrap ga-x-4 mb-2">
      <v-checkbox
        v-for="item of filterItems"
        :key="item.value"
        v-model="settings.filters"
        :value="item.value"
        :label="item.title"
        color="secondary"
        density="compact"
        hide-details
        class="flex-grow-0"
      />
    </div>
    <div class="d-flex justify-end mb-8">
      <v-btn
        variant="flat"
        color="primary"
        class="text-none px-6"
        :disabled="!settingsDirty || busy"
        :loading="busy"
        @click="saveSettings"
      >
        {{ text.saveCalendar }}
      </v-btn>
    </div>

    <h2 class="admin-title">{{ text.eventTypes }}</h2>
    <p class="hint">{{ text.eventTypesHint }}</p>

    <v-expansion-panels v-model="opened" variant="accordion" class="mb-4">
      <v-expansion-panel
        v-for="type of draft"
        :key="type.id"
        :value="type.id"
        elevation="0"
        class="type-panel"
      >
        <v-expansion-panel-title>
          <span class="flex-grow-1 font-weight-bold">{{ type.name || text.newEventType }}</span>
          <span class="text-medium-emphasis text-body-2 mr-4">{{ rolesLabel(type) }}</span>
          <ConfirmButton icon="$unlink" :text="text.removeEventType" class="mr-2" @confirm="remove(type)" />
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <div class="d-flex flex-wrap ga-2">
            <v-text-field v-model="type.name" :label="text.typeName" density="compact" class="field" />
            <v-select
              v-model="type.ministry"
              :items="ministries"
              :label="text.typeMinistry"
              density="compact"
              clearable
              class="field"
            />
          </div>
          <v-radio-group v-model="type.roles" density="compact" hide-details class="mb-2">
            <v-radio value="none" :label="text.rolesNone" color="secondary" />
            <v-radio value="fixed" :label="text.rolesFixed" color="secondary" />
            <v-radio value="dynamic" :label="text.rolesDynamic" color="secondary" />
          </v-radio-group>
          <template v-if="type.roles !== 'none'">
            <SlotsEditor v-model="type.slots" />
            <p v-if="type.roles === 'fixed' && !type.slots.length" class="text-warning text-body-2">
              {{ text.noSlots }}
            </p>
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <div class="d-flex flex-wrap align-center ga-2">
      <v-btn variant="tonal" color="buttons" class="text-none" prepend-icon="mdi-calendar-plus" @click="add">
        {{ text.addEventType }}
      </v-btn>
      <v-spacer />
      <span v-if="dirty" class="text-warning text-body-2">{{ text.unsaved }}</span>
      <v-btn
        variant="flat"
        color="primary"
        class="text-none px-6"
        :disabled="!dirty || !valid || busy"
        :loading="busy"
        @click="saveTypes"
      >
        {{ text.saveEventTypes }}
      </v-btn>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import ConfirmButton from '@/components/ConfirmButton.vue'
import SlotsEditor from '@/components/calendar/SlotsEditor.vue'
import { useLanguageStore } from '@/stores/language'
import { FILTERS, type CalendarSettings, type EventType, type Filter } from '@/stores/schedule'
import { useWorkerStore } from '@/stores/worker'

/** The settings of the calendar (the colors of the days, its filters) and the types of events with their roles */
const eventTypes = defineModel<EventType[]>('eventTypes', { required: true })
const calendar = defineModel<CalendarSettings>('calendar', { required: true })
defineProps<{ ministries: string[] }>()
const emit = defineEmits<{ error: [cause: unknown] }>()

const worker = useWorkerStore()
const { admin: text } = storeToRefs(useLanguageStore())

const busy = ref(false)

/* ---------- the calendar ---------- */

const settings = ref<CalendarSettings>({ ...calendar.value, filters: [...calendar.value.filters] })
watch(calendar, (value) => (settings.value = { ...value, filters: [...value.filters] }))
const settingsDirty = computed(() => JSON.stringify(settings.value) !== JSON.stringify(calendar.value))

const filterLabels: Record<Filter, keyof typeof text.value> = {
  type: 'filterType',
  ministry: 'filterMinistry',
  event: 'filterEvent',
  person: 'filterPerson',
  mine: 'filterMine'
}
const filterItems = computed(() =>
  FILTERS.map((value) => ({ value, title: text.value[filterLabels[value]] }))
)

async function saveSettings() {
  busy.value = true
  try {
    calendar.value = await worker.setCalendar({
      redDays: Math.min(30, Math.max(0, Number(settings.value.redDays) || 0)),
      orangeDays: Math.min(60, Math.max(0, Number(settings.value.orangeDays) || 0)),
      // in the order of the list
      filters: FILTERS.filter((item) => settings.value.filters.includes(item))
    })
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}

/* ---------- the types of events ---------- */

const copy = (list: EventType[]) =>
  list.map((type) => ({ ...type, slots: type.slots.map((slot) => ({ ...slot })) }))
const draft = ref<EventType[]>(copy(eventTypes.value))
watch(eventTypes, (value) => (draft.value = copy(value)))

const opened = ref<string | null>(null)
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(eventTypes.value))
// every type has a name and its roles have names; a type of fixed roles has some
const valid = computed(() =>
  draft.value.every(
    (type) =>
      type.name.trim() &&
      (type.roles !== 'fixed' || type.slots.length) &&
      type.slots.every((slot) => slot.name.trim() && Number(slot.count) >= 1)
  )
)

const rolesLabel = (type: EventType) =>
  type.roles === 'none'
    ? text.value.rolesNone
    : type.roles === 'dynamic'
      ? text.value.rolesDynamic
      : type.slots.map((slot) => (slot.count > 1 ? `${slot.name} ×${slot.count}` : slot.name)).join(', ')

function add() {
  const id = `type-${Date.now().toString(36)}`
  draft.value.push({ id, name: text.value.newEventType, ministry: null, roles: 'none', slots: [] })
  opened.value = id
}

const remove = (type: EventType) => (draft.value = draft.value.filter((item) => item.id !== type.id))

async function saveTypes() {
  busy.value = true
  try {
    eventTypes.value = await worker.setEventTypes(
      draft.value.map((type) => ({
        ...type,
        name: type.name.trim(),
        slots:
          type.roles === 'none'
            ? []
            : type.slots.map((slot) => ({
                ...slot,
                name: slot.name.trim(),
                count: Math.min(50, Math.max(1, Number(slot.count) || 1)),
                // the kinds say what it prepares; the words of before are not kept
                hint: ''
              }))
      }))
    )
  } catch (cause) {
    emit('error', cause)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.type-panel {
  border: solid 1px var(--app-border);
  margin-bottom: 4px;
  border-radius: var(--app-radius) !important;
}

.days {
  flex: 0 1 280px;
}

.field {
  flex: 1 1 220px;
}

.label {
  color: var(--app-text-muted);
  font-size: 13px;
  margin: 0;
}

.swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.swatch--red {
  background: var(--app-calendar-red);
}

.swatch--orange {
  background: var(--app-calendar-orange);
}
</style>
