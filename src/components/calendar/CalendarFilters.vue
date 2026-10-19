<template>
  <!-- a phone: the filters fold under a button that counts the chosen ones -->
  <v-btn
    v-if="shows.length && phone"
    variant="outlined"
    color="secondary"
    size="small"
    class="text-none mb-2"
    prepend-icon="mdi-filter-variant"
    :append-icon="unfolded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
    :aria-expanded="unfolded"
    @click="unfolded = !unfolded"
  >
    {{ text.filtersButton }}<template v-if="active"> ({{ active }})</template>
  </v-btn>
  <div v-if="shows.length && (!phone || unfolded)" class="filters">
    <v-select
      v-if="shows.includes('type')"
      v-model="filters.type"
      :items="schedule.types.map((item) => ({ title: item.name, value: item.id }))"
      :label="text.filterType"
      density="compact"
      clearable
      hide-details
      class="filter"
    />
    <v-select
      v-if="shows.includes('ministry')"
      v-model="filters.ministry"
      :items="ministries"
      :label="text.filterMinistry"
      density="compact"
      clearable
      hide-details
      class="filter"
    />
    <v-select
      v-if="shows.includes('event')"
      v-model="filters.event"
      :items="eventItems"
      :label="text.filterEvent"
      density="compact"
      clearable
      hide-details
      class="filter"
    />
    <v-autocomplete
      v-if="shows.includes('person')"
      v-model="filters.person"
      :items="schedule.people"
      item-title="name"
      item-value="uid"
      :label="text.filterPerson"
      density="compact"
      clearable
      hide-details
      class="filter"
    />
    <v-switch
      v-if="shows.includes('mine')"
      v-model="filters.mine"
      inset
      :label="text.onlyMine"
      color="secondary"
      density="compact"
      hide-details
      class="flex-grow-0"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDisplay } from 'vuetify'

import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'

/** The filters above the calendar; the administrators choose which are shown */
const schedule = useScheduleStore()
const { filters } = storeToRefs(schedule)
const { calendar: text } = storeToRefs(useLanguageStore())

const shows = computed(() => schedule.settings.filters)

const { xs: phone } = useDisplay()
const unfolded = ref(false)
const active = computed(() => Object.values(filters.value).filter(Boolean).length)

/** the ministries and events of the month */
const ministries = computed(() =>
  [...new Set(schedule.occurrences.map((item) => item.event.ministry))].sort()
)
const eventItems = computed(() =>
  [...new Map(schedule.occurrences.map((item) => [item.event.id, item.event])).values()].map((event) => ({
    title: schedule.nameOf(event),
    value: event.id
  }))
)
</script>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 12px;
  margin-bottom: 16px;
  border: solid 1px var(--app-border);
  border-radius: var(--app-radius);
  background: var(--app-surface);
}

.filter {
  flex: 1 1 180px;
}
</style>
