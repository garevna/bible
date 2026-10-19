<template>
  <div class="week">
    <!-- the days of the week: how many groups meet on each -->
    <div class="grid">
      <button
        v-for="day of WEEK"
        :key="day"
        type="button"
        class="cell cell--day"
        :class="{
          'cell--empty': !onDay(day).length,
          'cell--selected': day === weekday,
          'cell--today': day === today
        }"
        :disabled="!onDay(day).length"
        :data-weekday="day"
        :aria-pressed="day === weekday"
        @click="chooseDay(day)"
      >
        <span class="name">{{ weekdayName(day, locale, 'short') }}</span>
        <span class="count">{{ onDay(day).length }}</span>
      </button>
    </div>

    <!-- the hours of the day chosen: an hour without groups is not chosen -->
    <div v-if="weekday !== null" class="grid mt-1">
      <button
        v-for="hour of hours"
        :key="hour"
        type="button"
        class="cell cell--hour"
        :class="{ 'cell--empty': !atHour(hour).length, 'cell--selected': hour === chosenHour }"
        :disabled="!atHour(hour).length"
        :data-hour="hour"
        :aria-pressed="hour === chosenHour"
        @click="chosenHour = hour"
      >
        <span class="name">{{ hour }}:00</span>
        <span class="count">{{ atHour(hour).length }}</span>
      </button>
    </div>

    <!-- the groups of that day and hour: the leader and the place; a click opens the group -->
    <div v-if="weekday !== null && chosenHour !== null" class="mt-4">
      <h3 class="list-title">{{ listTitle }}</h3>
      <GroupRow
        v-for="group of atHour(chosenHour)"
        :key="group.id"
        :group="group"
        @open="emit('open', group)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import GroupRow from '@/components/groups/GroupRow.vue'
import { hourOf, useGroupsStore, WEEK, weekdayName, type HomeGroup } from '@/stores/groups'
import { useUserStore } from '@/stores/user'
import { localeOf } from '@/utils/dates'

/**
 * The home groups by the week: each day says how many groups meet then; a day opens its hours
 * (each with its number of groups), an hour opens the list of its groups
 */
const emit = defineEmits<{ open: [group: HomeGroup] }>()

const groups = useGroupsStore()
const user = useUserStore()
const locale = computed(() => localeOf(user.lang))

const today = new Date().getDay()
const weekday = ref<number | null>(null)
const chosenHour = ref<number | null>(null)

const onDay = (day: number) => groups.groups.filter((group) => group.weekday === day)
const atHour = (hour: number) =>
  onDay(weekday.value ?? -1)
    .filter((group) => hourOf(group) === hour)
    .sort((a, b) => a.time.localeCompare(b.time))

/** from 8:00 to 20:00, and wider when a group meets earlier or later */
const hours = computed(() => {
  const all = groups.groups.map(hourOf).filter((hour): hour is number => hour !== null)
  const from = Math.min(8, ...all)
  const to = Math.max(20, ...all)
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
})

function chooseDay(day: number) {
  weekday.value = day
  chosenHour.value = null
}

/** "Понеділок, 16:00" */
const listTitle = computed(() => {
  const name = weekdayName(weekday.value!, locale.value)
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${chosenHour.value}:00`
})
</script>

<style scoped>
.week {
  max-width: 640px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.cell {
  position: relative;
  aspect-ratio: 1.4 / 1;
  border-radius: var(--app-radius);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}

.cell:not(:disabled):hover {
  transform: scale(1.04);
}

.cell--day {
  background: var(--app-groups-day);
}

.cell--hour {
  background: var(--app-groups-hour);
}

.cell--empty {
  background: var(--app-groups-empty);
  cursor: default;
}

.cell--selected {
  outline: solid 3px rgb(var(--v-theme-secondary));
  outline-offset: 1px;
}

.cell--today .name {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.name {
  text-transform: capitalize;
}

.count {
  position: absolute;
  top: 3px;
  right: 6px;
  font-size: 11px;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

@media (max-width: 480px) {
  .cell {
    font-size: 13px;
  }
}
</style>
