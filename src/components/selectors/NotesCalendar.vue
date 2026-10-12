<template>
  <div class="calendar">
    <div class="calendar__header">
      <span class="calendar__title">{{ monthTitle }}</span>
      <v-spacer />
      <v-btn
        icon="mdi-arrow-left"
        variant="text"
        size="small"
        :aria-label="text.prevMonth"
        @click="shiftMonth(-1)"
      />
      <v-btn
        icon="mdi-arrow-right"
        variant="text"
        size="small"
        :aria-label="text.nextMonth"
        @click="shiftMonth(1)"
      />
    </div>

    <div class="calendar__grid calendar__weekdays">
      <span v-for="day of weekDays" :key="day">{{ day }}</span>
    </div>

    <div class="calendar__grid">
      <span v-for="blank of leadingBlanks" :key="`blank-${blank}`" />
      <button
        v-for="day of monthDays"
        :key="day.iso"
        type="button"
        class="calendar__day"
        :class="{
          'calendar__day--available': available.has(day.iso),
          'calendar__day--first': day.iso === range.from,
          'calendar__day--in-range': inRange(day.iso) && day.iso !== range.from,
          'calendar__day--today': day.iso === today
        }"
        :aria-pressed="inRange(day.iso)"
        :data-date="day.iso"
        @click="pick(day.iso)"
      >
        {{ day.number }}
      </button>
    </div>

    <div v-if="allowInterval" class="calendar__interval">
      <v-switch
        v-model="interval"
        color="secondary"
        density="compact"
        hide-details
        inset
        :label="text.interval"
      />
      <!-- the length and "days" stay together on narrow screens -->
      <span v-if="interval" class="calendar__length">
        <v-btn-toggle
          v-model="length"
          mandatory
          density="compact"
          color="secondary"
          variant="outlined"
          divided
        >
          <v-btn v-for="days of lengths" :key="days" :value="days" size="small">{{ days }}</v-btn>
        </v-btn-toggle>
        <span class="calendar__days-label">{{ text.days }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { localISODate } from '@/db'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'

export interface DateRange {
  from: string | null
  to: string | null
}

/**
 * Month calendar for notes: days that have notes are marked;
 * a click picks a day, or an interval of several days starting from it.
 */
const props = withDefaults(defineProps<{ availableDates?: string[]; allowInterval?: boolean }>(), {
  availableDates: () => [],
  allowInterval: true
})

const range = defineModel<DateRange>({ default: () => ({ from: null, to: null }) })

const user = useUserStore()
const { notes: text } = storeToRefs(useLanguageStore())

const locale = computed(() => ({ ua: 'uk', ru: 'ru', en: 'en' })[user.lang])
const today = localISODate(new Date())
const available = computed(() => new Set(props.availableDates))

const lengths = [5, 7, 10]

/** an interval already chosen opens with the switch on and its length */
const daysChosen =
  range.value.from && range.value.to
    ? Math.round((Date.parse(range.value.to) - Date.parse(range.value.from)) / 86_400_000) + 1
    : 1
const interval = ref(props.allowInterval && daysChosen > 1)
const length = ref(
  lengths.reduce((best, days) => (Math.abs(days - daysChosen) < Math.abs(best - daysChosen) ? days : best))
)

/** the month on screen: starts at the chosen date, or at the last day with notes, or now */
const start = new Date(`${range.value.from ?? props.availableDates.at(-1) ?? today}T00:00:00`)
const year = ref(start.getFullYear())
const month = ref(start.getMonth())

const monthTitle = computed(() => {
  const title = new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(
    new Date(year.value, month.value, 1)
  )
  return title.charAt(0).toUpperCase() + title.slice(1)
})

/** Monday first */
const weekDays = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { weekday: 'short' })
  return Array.from({ length: 7 }, (_, index) => format.format(new Date(2024, 0, 1 + index)))
})

const leadingBlanks = computed(() => (new Date(year.value, month.value, 1).getDay() + 6) % 7)

const monthDays = computed(() => {
  const count = new Date(year.value, month.value + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    iso: localISODate(new Date(year.value, month.value, index + 1))
  }))
})

function shiftMonth(step: number) {
  const date = new Date(year.value, month.value + step, 1)
  year.value = date.getFullYear()
  month.value = date.getMonth()
}

const inRange = (iso: string) =>
  Boolean(range.value.from) && iso >= range.value.from! && iso <= (range.value.to ?? range.value.from!)

function pick(iso: string) {
  if (!interval.value) {
    range.value = { from: iso, to: iso }
    return
  }
  const end = new Date(`${iso}T00:00:00`)
  end.setDate(end.getDate() + length.value - 1)
  range.value = { from: iso, to: localISODate(end) }
}

// switching the interval on or changing its length re-applies it to the chosen day
watch([interval, length], () => range.value.from && pick(range.value.from))
</script>

<style scoped>
.calendar {
  max-width: 340px;
  margin: 0 auto;
}

.calendar__header {
  display: flex;
  align-items: center;
  background: var(--app-light-blue);
  border-radius: var(--app-radius);
  padding: 4px 4px 4px 16px;
  margin-bottom: 12px;
}

.calendar__title {
  font-size: 17px;
  font-weight: 600;
}

.calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  justify-items: center;
}

.calendar__weekdays {
  color: var(--app-text-muted);
  font-size: 12px;
  margin-bottom: 6px;
}

.calendar__day {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  font-size: 15px;
  color: var(--app-text);
  transition: background 0.15s;
}

.calendar__day:hover {
  background: var(--app-hover);
}

/* days with notes */
.calendar__day--available {
  background: var(--app-available-date);
  color: rgb(var(--v-theme-secondary));
  font-weight: 700;
}

.calendar__day--today {
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-secondary));
}

.calendar__day--in-range {
  background: var(--app-selected-dates);
  color: rgb(var(--v-theme-secondary));
}

.calendar__day--first {
  background: rgb(var(--v-theme-secondary));
  color: var(--app-on-secondary);
  font-weight: 700;
}

.calendar__interval {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.calendar__length {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.calendar__days-label {
  color: var(--app-text-muted);
  font-size: 13px;
}
</style>
