<template>
  <!-- the date in words; a click opens the calendar of the app (not the one of the browser) -->
  <v-menu v-model="open" :close-on-content-click="false" location="bottom start" min-width="320">
    <template #activator="{ props: menu }">
      <v-text-field
        v-bind="{ ...$attrs, ...menu }"
        :model-value="shown"
        readonly
        prepend-inner-icon="$calendar"
        :clearable="clearable"
        class="date-field"
        @click:clear.stop="model = null"
      />
    </template>

    <v-card color="homefone" class="pa-3 date-card">
      <NotesCalendar
        :key="openings"
        :model-value="{ from: start, to: start }"
        :allow-interval="false"
        :pick-year="pickYear"
        @update:model-value="pick"
      />
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import NotesCalendar, { type DateRange } from '@/components/selectors/NotesCalendar.vue'
import { useUserStore } from '@/stores/user'
import { fullDateFormat, localeOf } from '@/utils/dates'

/**
 * A day 'YYYY-MM-DD' chosen in the calendar of the app; shown in words ("24 жовтня 2026 р.").
 * pickYear: the year has a field of its own (a birthday); a birthday without its year is '--MM-DD'.
 */
defineOptions({ inheritAttrs: false })
const model = defineModel<string | null>({ default: null })
defineProps<{ pickYear?: boolean; clearable?: boolean }>()

const user = useUserStore()

const open = ref(false)
const openings = ref(0)
watch(open, (value) => value && openings.value++)

/** the calendar opens at the day chosen (a birthday without its year: in 2000) */
const start = computed(() => (model.value ? model.value.replace(/^--/, '2000-') : null))

const shown = computed(() => {
  if (!model.value) return ''
  const locale = localeOf(user.lang)
  const date = new Date(`${start.value}T12:00:00`)
  return model.value.startsWith('--')
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date)
    : fullDateFormat(date, locale)
})

function pick(range: DateRange) {
  model.value = range.from
  open.value = false
}
</script>

<style scoped>
.date-field :deep(input) {
  cursor: pointer;
}
</style>
