<template>
  <ButtonTooltip icon="$calendar" :text="selector.datePrompt" @click="open = true" />

  <v-dialog v-model="open" width="360">
    <v-date-picker
      :model-value="pickerValue"
      :allowed-dates="isDateAvailable"
      :first-day-of-week="1"
      color="primary"
      @update:model-value="pick"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import ButtonTooltip from '@/components/ButtonTooltip.vue'
import { localISODate } from '@/db'
import { useLanguageStore } from '@/stores/language'

/** Date as 'YYYY-MM-DD'; only dates from `availableDates` can be picked */
const date = defineModel<string | null>({ default: null })
const props = defineProps<{ availableDates: string[] }>()

const { selector } = storeToRefs(useLanguageStore())

const open = ref(false)

const pickerValue = computed(() => (date.value ? new Date(`${date.value}T00:00:00`) : null))

const isDateAvailable = (value: unknown) =>
  value instanceof Date && props.availableDates.includes(localISODate(value))

function pick(value: unknown) {
  if (!(value instanceof Date)) return
  date.value = localISODate(value)
  open.value = false
}
</script>
