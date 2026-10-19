<template>
  <!-- a user of the app chosen from the list, or the full name of a leader without the app typed in -->
  <v-combobox
    v-bind="$attrs"
    :model-value="shown"
    :items="schedule.people"
    item-title="name"
    item-value="uid"
    return-object
    :label="text.leader"
    :hint="text.leaderHint"
    persistent-hint
    @update:model-value="pick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'

/** The leader of a home group: { leaderUid } of a user of the app, or { leaderUid: '', leaderName } */
defineOptions({ inheritAttrs: false })
const model = defineModel<{ leaderUid: string; leaderName: string }>({
  default: () => ({ leaderUid: '', leaderName: '' })
})

const schedule = useScheduleStore()
const { groups: text } = storeToRefs(useLanguageStore())

const shown = computed(() =>
  model.value.leaderUid
    ? (schedule.people.find((person) => person.uid === model.value.leaderUid) ?? model.value.leaderName)
    : model.value.leaderName
)

function pick(value: unknown) {
  if (value && typeof value === 'object' && 'uid' in value) {
    const person = value as { uid: string; name: string }
    model.value = { leaderUid: person.uid, leaderName: person.name }
  } else model.value = { leaderUid: '', leaderName: typeof value === 'string' ? value.trim() : '' }
}
</script>
