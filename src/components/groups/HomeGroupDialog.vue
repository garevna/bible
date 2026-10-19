<template>
  <AppDialog v-model="open" :title="text.myGroup" icon="mdi-home-account" max-width="620">
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-3">{{ error }}</v-alert>
    <v-progress-linear v-if="busy" indeterminate color="secondary" class="mb-2" />

    <!-- the group of the user now -->
    <p class="label">{{ text.myGroupNow }}</p>
    <GroupRow v-if="current" :group="current" with-day @open="openGroup" />
    <p v-else class="muted mb-3">{{ text.myGroupNone }}</p>

    <!-- a leader keeps their own group here -->
    <v-btn
      v-for="group of led"
      :key="group.id"
      variant="tonal"
      color="buttons"
      class="text-none mb-3"
      prepend-icon="mdi-account-star-outline"
      @click="openGroup(group)"
    >
      {{ text.groupILead }}
    </v-btn>

    <!-- another group: by the day and the time, by the leader, or by the place -->
    <p class="label mt-2">{{ text.myGroupChange }}</p>
    <v-btn-toggle
      v-model="mode"
      mandatory
      divided
      density="compact"
      color="secondary"
      variant="outlined"
      class="mb-3 modes"
    >
      <v-btn value="time" class="text-none">{{ text.byTime }}</v-btn>
      <v-btn value="leader" class="text-none">{{ text.byLeader }}</v-btn>
      <v-btn value="place" class="text-none">{{ text.byPlace }}</v-btn>
    </v-btn-toggle>

    <div v-if="mode === 'time'" class="d-flex flex-wrap ga-2">
      <v-select
        v-model="weekday"
        :items="weekdayItems"
        :label="text.weekday"
        density="compact"
        hide-details
        class="field"
        @update:model-value="hour = null"
      />
      <v-select
        v-model="hour"
        :items="hourItems"
        :label="text.time"
        :disabled="weekday === null"
        density="compact"
        hide-details
        class="field"
      />
    </div>
    <v-autocomplete
      v-else-if="mode === 'leader'"
      v-model="leader"
      :items="leaders"
      :label="text.leader"
      prepend-inner-icon="$search"
      density="compact"
      hide-details
      clearable
    />
    <v-autocomplete
      v-else
      v-model="place"
      :items="places"
      :label="text.address"
      prepend-inner-icon="$search"
      density="compact"
      hide-details
      clearable
    />

    <!-- the groups found: one is chosen -->
    <v-radio-group v-if="found.length" v-model="chosen" hide-details class="mt-3">
      <v-radio v-for="group of found" :key="group.id" :value="group.id" color="secondary" class="choice">
        <template #label>
          <span class="choice__title">{{ groupTitle(group) }}</span>
          <span class="choice__facts">{{ factsOf(group) }}</span>
        </template>
      </v-radio>
    </v-radio-group>

    <template #actions>
      <DialogButtons
        :confirm-text="common.save"
        :disabled="busy || !chosen || chosen === worker.homeGroupId"
        @cancel="open = false"
        @confirm="save"
      />
    </template>

    <GroupDialog v-model="groupDialog" :group-id="openedId" />
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppDialog from '@/components/AppDialog.vue'
import DialogButtons from '@/components/DialogButtons.vue'
import GroupDialog from '@/components/groups/GroupDialog.vue'
import GroupRow from '@/components/groups/GroupRow.vue'
import {
  groupTitle,
  hourOf,
  meetsText,
  useGroupsStore,
  WEEK,
  weekdayName,
  type HomeGroup
} from '@/stores/groups'
import { useLanguageStore } from '@/stores/language'
import { useUserStore } from '@/stores/user'
import { useWorkerStore, WorkerError } from '@/stores/worker'
import { localeOf } from '@/utils/dates'

/**
 * The home group of the user (an administrator or a servant): chosen by the day and the time and then
 * from the list, by the leader, or by the place. A leader of a group keeps it from here too.
 */
const open = defineModel<boolean>({ default: false })

const worker = useWorkerStore()
const groups = useGroupsStore()
const user = useUserStore()
const { groups: text, common, publish } = storeToRefs(useLanguageStore())
const locale = computed(() => localeOf(user.lang))

const busy = ref(false)
const error = ref('')
const mode = ref<'time' | 'leader' | 'place'>('time')
const weekday = ref<number | null>(null)
const hour = ref<number | null>(null)
const leader = ref<string | null>(null)
const place = ref<string | null>(null)
const chosen = ref<string | null>(null)

const groupDialog = ref(false)
const openedId = ref<string | null>(null)
function openGroup(group: HomeGroup) {
  openedId.value = group.id
  groupDialog.value = true
}

watch(open, async (value) => {
  if (!value) return
  error.value = ''
  chosen.value = null
  busy.value = true
  try {
    await groups.load()
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
})

const current = computed(() => groups.groups.find((group) => group.id === worker.homeGroupId) ?? null)
/** the groups the user leads */
const led = computed(() => groups.groups.filter((group) => group.leaderUid && group.leaderUid === user.uid))

/** the days with groups, Monday first; the hours of the day chosen */
const weekdayItems = computed(() =>
  WEEK.filter((day) => groups.groups.some((group) => group.weekday === day)).map((day) => ({
    value: day,
    title: weekdayName(day, locale.value)
  }))
)
const hourItems = computed(() =>
  [...new Set(groups.groups.filter((group) => group.weekday === weekday.value).map(hourOf))]
    .filter((item): item is number => item !== null)
    .sort((a, b) => a - b)
    .map((item) => ({ value: item, title: `${item}:00` }))
)
const leaders = computed(() => [...new Set(groups.groups.map((group) => group.leaderName))].sort())
const places = computed(() =>
  [...new Set(groups.groups.map((group) => group.address).filter(Boolean))].sort()
)

/** the groups of the day and the hour, of the leader, or at the place */
const found = computed(() => {
  if (mode.value === 'time')
    return weekday.value === null || hour.value === null
      ? []
      : groups.groups.filter((group) => group.weekday === weekday.value && hourOf(group) === hour.value)
  if (mode.value === 'leader')
    return leader.value ? groups.groups.filter((group) => group.leaderName === leader.value) : []
  return place.value ? groups.groups.filter((group) => group.address === place.value) : []
})
// one group found: chosen at once
watch(found, (list) => (chosen.value = list.length === 1 ? list[0]!.id : null))

const factsOf = (group: HomeGroup) =>
  [meetsText(group, locale.value, text.value.notSet), group.address].filter(Boolean).join(' · ')

const reason = (cause: unknown) =>
  cause instanceof WorkerError && cause.message !== 'unreachable' ? cause.message : publish.value.unreachable

async function save() {
  busy.value = true
  error.value = ''
  try {
    await worker.setHomeGroup(chosen.value)
    open.value = false
  } catch (cause) {
    error.value = reason(cause)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.label {
  font-weight: 600;
  margin-bottom: 6px;
}

.muted {
  color: var(--app-text-muted);
  font-size: 14px;
}

.modes {
  height: 40px !important;
  max-width: 100%;
  overflow-x: auto;
}

.field {
  flex: 1 1 180px;
}

.choice :deep(.v-label) {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  opacity: 1;
  padding: 4px 0;
}

.choice__title {
  font-weight: 600;
  color: var(--app-text);
}

.choice__facts {
  font-size: 13px;
  color: var(--app-text-muted);
}
</style>
