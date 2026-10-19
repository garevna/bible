<template>
  <div class="month">
    <div class="month-head">
      <v-btn
        icon="mdi-chevron-left"
        variant="text"
        color="secondary"
        :aria-label="calendar.prevMonth"
        :title="calendar.prevMonth"
        :disabled="month <= today.slice(0, 7)"
        @click="shift(-1)"
      />
      <h3 class="month-title">{{ title }}</h3>
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        color="secondary"
        :aria-label="calendar.nextMonth"
        :title="calendar.nextMonth"
        @click="shift(1)"
      />
    </div>

    <!-- a day: how many groups meet then; a click lists them -->
    <div class="grid" role="grid">
      <div v-for="name of weekdays" :key="name" class="weekday">{{ name }}</div>
      <button
        v-for="day of grid"
        :key="day"
        type="button"
        class="cell"
        :class="{
          'cell--other': day.slice(0, 7) !== month,
          'cell--past': day < today,
          'cell--today': day === today,
          'cell--busy': groups.meetingOn(day).length > 0,
          'cell--selected': day === selected
        }"
        :disabled="day < today"
        :aria-label="day"
        :aria-pressed="day === selected"
        :data-day="day"
        @click="selected = day"
      >
        <span class="number">{{ Number(day.slice(8)) }}</span>
        <span v-if="groups.meetingOn(day).length" class="count">{{ groups.meetingOn(day).length }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useGroupsStore } from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { monthGrid } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { localeOf, toISODateString } from '@/utils/dates'

/** A month of the home groups: each day says how many groups meet then; a click chooses the day */
const selected = defineModel<string | null>('selected', { default: null })
const month = defineModel<string>('month', { required: true })

const groups = useGroupsStore()
const user = useUserStore()
const { calendar } = storeToRefs(useLanguageStore())

const locale = computed(() => localeOf(user.lang))
const today = toISODateString(new Date())
const grid = computed(() => monthGrid(month.value))

const title = computed(() => {
  const name = new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(
    new Date(`${month.value}-15T12:00:00`)
  )
  return name.charAt(0).toUpperCase() + name.slice(1)
})

/** Monday first */
const weekdays = computed(() => {
  const name = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
  // 2024-01-01 was a Monday
  return [1, 2, 3, 4, 5, 6, 7].map((day) => name.format(new Date(2024, 0, day)))
})

function shift(by: number) {
  const [year, index] = month.value.split('-').map(Number) as [number, number]
  const date = new Date(year, index - 1 + by, 1)
  month.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
</script>

<style scoped>
.month {
  max-width: 560px;
  margin: 0 auto;
}

.month-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.month-title {
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-secondary));
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  color: var(--app-text-muted);
  text-transform: capitalize;
  padding-bottom: 4px;
}

.cell {
  position: relative;
  aspect-ratio: 1 / 0.8;
  border-radius: var(--app-radius);
  border: solid 1px var(--app-border-light);
  background: var(--app-surface);
  color: var(--app-text);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell--other {
  opacity: 0.45;
}

.cell--past {
  cursor: default;
  opacity: 0.35;
}

.cell--busy {
  background: var(--app-available-date);
  font-weight: 600;
}

.cell--today .number {
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 700;
}

.cell--selected {
  outline: solid 3px rgb(var(--v-theme-secondary));
  outline-offset: 1px;
}

.count {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: 11px;
  font-weight: 700;
  color: rgb(var(--v-theme-secondary));
}
</style>
