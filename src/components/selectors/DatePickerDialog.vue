<template>
  <ButtonTooltip icon="$calendar" :text="selector.datePrompt" @click="open = true" />

  <AppDialog v-model="open" :title="selector.datePrompt" icon="$calendar" max-width="420">
    <NotesCalendar
      :model-value="range"
      :available-dates="availableDates"
      :allow-interval="false"
      @update:model-value="pick"
    />
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import NotesCalendar, { type DateRange } from '@/components/selectors/NotesCalendar.vue'
import { useLanguageStore } from '@/stores/language'

/** Date as 'YYYY-MM-DD'; the days that have notes are marked */
const date = defineModel<string | null>({ default: null })
defineProps<{ availableDates: string[] }>()

const { selector } = storeToRefs(useLanguageStore())

const open = ref(false)

const range = computed<DateRange>(() => ({ from: date.value, to: date.value }))

function pick(value: DateRange) {
  date.value = value.from
  open.value = false
}
</script>
