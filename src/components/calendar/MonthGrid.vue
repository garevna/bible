<template>
  <div class="month">
    <div class="month-head">
      <v-btn
        icon="mdi-chevron-left"
        variant="text"
        color="secondary"
        :aria-label="text.prevMonth"
        :title="text.prevMonth"
        :disabled="!canGoBack"
        @click="shift(-1)"
      />
      <h3 class="month-title">{{ title }}</h3>
      <v-btn
        icon="mdi-chevron-right"
        variant="text"
        color="secondary"
        :aria-label="text.nextMonth"
        :title="text.nextMonth"
        @click="shift(1)"
      />
    </div>

    <div class="grid" role="grid">
      <div v-for="name of weekdays" :key="name" class="weekday">{{ name }}</div>
      <button
        v-for="day of grid"
        :key="day"
        type="button"
        class="cell"
        :class="[
          schedule.stateOf(day) && `cell--${schedule.stateOf(day)}`,
          {
            'cell--other': day.slice(0, 7) !== month,
            'cell--past': day < schedule.today,
            'cell--today': day === schedule.today,
            'cell--selected': day === selected
          }
        ]"
        :disabled="day < schedule.today"
        :aria-label="day"
        :aria-pressed="day === selected"
        :data-day="day"
        @click="selected = day"
      >
        <span class="number">{{ Number(day.slice(8)) }}</span>
        <span v-if="countOf(day)" class="count">{{ countOf(day) }}</span>
      </button>
    </div>

    <div class="legend">
      <span v-for="item of legend" :key="item.state" class="legend-item">
        <span class="swatch" :class="`cell--${item.state}`" />{{ item.title }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { monthGrid, useScheduleStore } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'

/** A month of the calendar: the days with events are colored by how settled they are; a click chooses a day */
const selected = defineModel<string | null>('selected', { default: null })
const month = defineModel<string>('month', { required: true })

const schedule = useScheduleStore()
const user = useUserStore()
const { calendar: text } = storeToRefs(useLanguageStore())

const locale = computed(() => ({ ua: 'uk', ru: 'ru', en: 'en' })[user.lang])

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

/** the past is gone: no months before this one */
const canGoBack = computed(() => !schedule.today || month.value > schedule.today.slice(0, 7))

function shift(by: number) {
  const [year, index] = month.value.split('-').map(Number) as [number, number]
  const date = new Date(year, index - 1 + by, 1)
  month.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const countOf = (day: string) => schedule.byDay.get(day)?.length ?? 0

const legend = computed(() => [
  { state: 'ready', title: text.value.legendReady },
  { state: 'red', title: text.value.legendRed },
  { state: 'orange', title: text.value.legendOrange },
  { state: 'amber', title: text.value.legendAmber }
])
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
  transition: transform 0.1s ease;
}

.cell:not(:disabled):hover {
  transform: scale(1.05);
}

.cell--other {
  opacity: 0.45;
}

.cell--past {
  cursor: default;
  opacity: 0.35;
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

/* how settled the day is */
.cell--ready,
.cell--red,
.cell--orange,
.cell--amber {
  color: #fff;
  font-weight: 600;
  border-color: transparent;
}

.cell--ready {
  background: var(--app-calendar-ready);
}

.cell--red {
  background: var(--app-calendar-red);
}

.cell--orange {
  background: var(--app-calendar-orange);
}

.cell--amber {
  background: var(--app-calendar-amber);
}

.count {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  opacity: 0.9;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  justify-content: center;
  margin-top: 10px;
  font-size: 12px;
  color: var(--app-text-muted);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
</style>
