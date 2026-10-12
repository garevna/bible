<template>
  <ButtonTooltip icon="$calendar" :text="selector.datePrompt" @click="openDialog" />

  <AppDialog v-model="open" :title="selector.datePrompt" icon="$calendar" max-width="420">
    <!-- a new calendar on each opening, so it starts from the current filter -->
    <NotesCalendar :key="openings" v-model="pending" :available-dates="availableDates" />

    <template #actions>
      <DialogButtons
        :confirm-text="common.apply"
        :disabled="!pending.from"
        @cancel="open = false"
        @confirm="apply"
      />
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import ButtonTooltip from '@/components/ButtonTooltip.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import NotesCalendar, { type DateRange } from '@/components/selectors/NotesCalendar.vue'
import { useLanguageStore } from '@/stores/language'

/** A day or an interval of days ('YYYY-MM-DD'); the days that have notes are marked */
const props = defineProps<{ from: string | null; to: string | null; availableDates: string[] }>()
const emit = defineEmits<{ pick: [from: string | null, to: string | null] }>()

const { common, selector } = storeToRefs(useLanguageStore())

const open = ref(false)
const openings = ref(0)

/** the choice applies with the button: an interval needs a day and a length */
const pending = ref<DateRange>({ from: null, to: null })

function openDialog() {
  pending.value = { from: props.from, to: props.to ?? props.from }
  openings.value++
  open.value = true
}

function apply() {
  emit('pick', pending.value.from, pending.value.to)
  open.value = false
}
</script>
