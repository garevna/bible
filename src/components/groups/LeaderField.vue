<template>
  <!-- a user of the app chosen from the list: only such a leader gets the topics of the meetings -->
  <v-autocomplete
    v-bind="$attrs"
    :model-value="model.leaderUid || null"
    :items="schedule.people"
    item-title="name"
    item-value="uid"
    :label="text.leader"
    :hint="text.leaderHint"
    persistent-hint
    :error-messages="unregistered"
    @update:model-value="pick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useLanguageStore } from '@/stores/language'
import { useScheduleStore } from '@/stores/schedule'
import { format } from '@/utils/format'

/**
 * The leader of a home group: { leaderUid, leaderName } of a user of the app. A group made before
 * that was required may have a name only: it is shown as a leader still to be chosen.
 */
defineOptions({ inheritAttrs: false })
const model = defineModel<{ leaderUid: string; leaderName: string }>({
  default: () => ({ leaderUid: '', leaderName: '' })
})

const schedule = useScheduleStore()
const { groups: text } = storeToRefs(useLanguageStore())

/** a name typed in once, of a leader who is not a user of the app */
const unregistered = computed(() =>
  !model.value.leaderUid && model.value.leaderName
    ? format(text.value.leaderUnregistered, { name: model.value.leaderName })
    : ''
)

function pick(uid: string | null) {
  const person = schedule.people.find((item) => item.uid === uid)
  model.value = person
    ? { leaderUid: person.uid, leaderName: person.name }
    : { leaderUid: '', leaderName: model.value.leaderUid ? '' : model.value.leaderName }
}
</script>
